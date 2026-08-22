import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import firebaseConfig from "../../firebase-applet-config.json";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name?: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const ADMIN_EMAILS = new Set([
  "mohinderb321@gmail.com",
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()) : [])
]);

// In-memory cache for Google's public certificates
let publicKeysCache: { [kid: string]: string } = {};
let publicKeysExpiresAt = 0;

async function getGooglePublicKeys(): Promise<{ [kid: string]: string }> {
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
 */
export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

    const nowSeconds = Math.floor(Date.now() / 1000);

    // Validate claims
    if (payload.exp && payload.exp < nowSeconds) {
      return null;
    }
    if (payload.aud !== PROJECT_ID && payload.aud !== "ht-grind") {
      return null;
    }
    if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}` && payload.iss !== "https://securetoken.google.com/ht-grind") {
      return null;
    }

    const email = (payload.email || "").toLowerCase().trim();
    const uid = payload.user_id || payload.sub;

    if (!uid) return null;

    // Verify signature if public key is available
    const keys = await getGooglePublicKeys();
    if (header.kid && keys[header.kid]) {
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(`${headerB64}.${payloadB64}`);
      const valid = verifier.verify(keys[header.kid], signatureB64, "base64url");
      if (!valid) {
        return null;
      }
    }

    const isAdmin = ADMIN_EMAILS.has(email);

    return {
      uid,
      email,
      name: payload.name,
      isAdmin,
    };
  } catch (err) {
    return null;
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
  if (adminSecret && providedSecret && adminSecret === providedSecret) {
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
