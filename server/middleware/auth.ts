import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import firebaseConfig from "../../firebase-applet-config.json";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;

/**
 * Retrieves configured admin emails strictly from the environment variable ADMIN_EMAILS.
 * Prevents hardcoding credentials in source code.
 */
function getAdminEmails(): Set<string> {
  const envEmails = process.env.ADMIN_EMAILS;
  if (!envEmails) return new Set();
  return new Set(
    envEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

// In-memory cache for Google's public certificates
let publicKeysCache: { [kid: string]: string } = {};
let publicKeysExpiresAt = 0;

export async function getGooglePublicKeys(): Promise<{ [kid: string]: string }> {
  const now = Date.now();
  if (Object.keys(publicKeysCache).length > 0 && now < publicKeysExpiresAt) {
    return publicKeysCache;
  }

  try {
    const res = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    if (!res.ok) throw new Error(`Failed to fetch certs: ${res.statusText}`);

    const cacheControl = res.headers.get("cache-control");
    let maxAgeSeconds = 3600;
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match) maxAgeSeconds = parseInt(match[1], 10);
    }

    publicKeysCache = await res.json();
    publicKeysExpiresAt = now + maxAgeSeconds * 1000;
    return publicKeysCache;
  } catch (err) {
    console.warn("[AuthMiddleware] Failed to refresh Google public keys:", err);
    return publicKeysCache;
  }
}

/**
 * Parses and cryptographically validates a Firebase ID token.
 * Rejects forged algorithms, unverified signatures, and missing public keys.
 */
export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

    // 1. Strict Algorithm Check: Firebase ID tokens must always be RS256
    if (!header || header.alg !== "RS256") {
      return null;
    }

    // 2. Strict Key ID Check: Header must contain a valid key ID
    if (!header.kid || typeof header.kid !== "string") {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    // 3. Validate Claims & Timestamps
    if (!payload || typeof payload !== "object") {
      return null;
    }

    // Expiration check
    if (!payload.exp || typeof payload.exp !== "number" || payload.exp < nowSeconds) {
      return null;
    }

    // Clock-skew tolerance check for issued-at (max 5 minutes in the future)
    if (payload.iat && typeof payload.iat === "number" && payload.iat > nowSeconds + 300) {
      return null;
    }

    // Audience validation
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const validAudience = [projectId, "ht-grind"].filter(Boolean);
    if (!validAudience.includes(payload.aud)) {
      return null;
    }

    // Issuer validation
    const validIssuers = [
      `https://securetoken.google.com/${projectId}`,
      "https://securetoken.google.com/ht-grind",
    ].filter(Boolean);
    if (!validIssuers.includes(payload.iss)) {
      return null;
    }

    const uid = payload.user_id || payload.sub;
    if (!uid || typeof uid !== "string") return null;

    // 4. Cryptographic Signature Verification (MANDATORY)
    const keys = await getGooglePublicKeys();
    const certificate = keys[header.kid];
    if (!certificate) {
      // Key not present or certificates could not be retrieved -> MUST reject token
      return null;
    }

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const isValidSignature = verifier.verify(certificate, signatureB64, "base64url");
    if (!isValidSignature) {
      return null;
    }

    const email = (payload.email || "").toLowerCase().trim();
    const emailVerified = payload.email_verified === true;
    const adminEmails = getAdminEmails();
    // Strictly require verified email address to prevent unverified admin account impersonation
    const isAdmin = Boolean(emailVerified && email && adminEmails.has(email));

    return {
      uid,
      email,
      emailVerified,
      name: payload.name,
      isAdmin,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Constant-time string comparison to mitigate timing attacks
 */
function constantTimeEquals(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      // Perform dummy equal check to prevent length-timing leaks
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Optional authentication: attaches req.user if a valid token is supplied.
 */
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const user = await verifyFirebaseIdToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

/**
 * Mandatory authentication middleware
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing Bearer ID token in Authorization header." });
  }

  const token = authHeader.substring(7).trim();
  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired Firebase authentication token." });
  }

  req.user = user;
  next();
}

/**
 * Admin authorization middleware
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check for admin API secret header (if configured in environment)
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  const providedSecret = req.headers["x-admin-key"] || req.headers["x-dev-key"];
  if (
    adminSecret &&
    typeof adminSecret === "string" &&
    typeof providedSecret === "string" &&
    constantTimeEquals(adminSecret, providedSecret)
  ) {
    return next();
  }

  // Otherwise check verified Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ error: "Forbidden: Admin privileges required." });
  }

  const token = authHeader.substring(7).trim();
  const user = await verifyFirebaseIdToken(token);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin privileges required." });
  }

  req.user = user;
  next();
}
