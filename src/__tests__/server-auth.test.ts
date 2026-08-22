import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { verifyFirebaseIdToken } from '../../server/middleware/auth';

describe('Server Auth & Token Verification Security Suite', () => {
  // Generate a test RSA 2048 keypair for cryptographic testing
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const testKid = 'test-rsa-key-id-123';

  // Helper to create a signed or forged token
  function createTestJwt(
    headerObj: Record<string, any>,
    payloadObj: Record<string, any>,
    signingKey?: string
  ): string {
    const headerB64 = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const message = `${headerB64}.${payloadB64}`;

    let signatureB64 = 'forged-invalid-signature';
    if (signingKey) {
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(message);
      signatureB64 = signer.sign(signingKey, 'base64url');
    }

    return `${message}.${signatureB64}`;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.VITE_FIREBASE_PROJECT_ID = 'test-project-123';
    process.env.ADMIN_EMAILS = 'admin@example.com,supergrind@htgrind.io';

    // Mock global fetch for Google's public key endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'max-age=3600',
      },
      json: async () => ({
        [testKid]: publicKey,
      }),
    } as any);
  });

  it('should reject tokens with algorithm !== RS256 (e.g., none or HS256 attack)', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const forgedToken = createTestJwt(
      { alg: 'none', kid: testKid },
      {
        sub: 'attacker_123',
        email: 'admin@example.com',
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
        iat: nowSeconds - 10,
      }
    );

    const result = await verifyFirebaseIdToken(forgedToken);
    expect(result).toBeNull();
  });

  it('should reject tokens with missing or empty kid', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256' }, // Missing kid
      {
        sub: 'user_123',
        email: 'user@example.com',
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
      },
      privateKey
    );

    const result = await verifyFirebaseIdToken(token);
    expect(result).toBeNull();
  });

  it('should reject tokens with unknown kid not in public key cache', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = createTestJwt(
      { alg: 'RS256', kid: 'unknown-key-999' },
      {
        sub: 'user_123',
        email: 'user@example.com',
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
      },
      privateKey
    );

    const result = await verifyFirebaseIdToken(token);
    expect(result).toBeNull();
  });

  it('should reject expired tokens even if signature is valid', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredToken = createTestJwt(
      { alg: 'RS256', kid: testKid },
      {
        sub: 'user_123',
        email: 'user@example.com',
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds - 100, // Expired
        iat: nowSeconds - 3700,
      },
      privateKey
    );

    const result = await verifyFirebaseIdToken(expiredToken);
    expect(result).toBeNull();
  });

  it('should reject tokens with invalid audience or issuer', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const badAudienceToken = createTestJwt(
      { alg: 'RS256', kid: testKid },
      {
        sub: 'user_123',
        email: 'user@example.com',
        aud: 'malicious-unrelated-project',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
      },
      privateKey
    );

    const result = await verifyFirebaseIdToken(badAudienceToken);
    expect(result).toBeNull();
  });

  it('should reject tokens with forged signature', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const badSigToken = createTestJwt(
      { alg: 'RS256', kid: testKid },
      {
        sub: 'forged_user',
        email: 'admin@example.com',
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
      }
      // No valid private key used -> signature is forged
    );

    const result = await verifyFirebaseIdToken(badSigToken);
    expect(result).toBeNull();
  });

  it('should verify legitimate token signed with private key matching public cert', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createTestJwt(
      { alg: 'RS256', kid: testKid },
      {
        sub: 'valid_user_456',
        name: 'Alex Grind',
        email: 'alex@example.com',
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
        iat: nowSeconds - 5,
      },
      privateKey
    );

    const result = await verifyFirebaseIdToken(validToken);
    expect(result).not.toBeNull();
    expect(result?.uid).toBe('valid_user_456');
    expect(result?.email).toBe('alex@example.com');
    expect(result?.name).toBe('Alex Grind');
    expect(result?.isAdmin).toBe(false);
  });

  it('should dynamically grant admin permissions strictly from ADMIN_EMAILS environment variable', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const adminToken = createTestJwt(
      { alg: 'RS256', kid: testKid },
      {
        sub: 'admin_user_789',
        name: 'Master Admin',
        email: 'admin@example.com', // Included in ADMIN_EMAILS
        aud: 'test-project-123',
        iss: 'https://securetoken.google.com/test-project-123',
        exp: nowSeconds + 3600,
        iat: nowSeconds - 5,
      },
      privateKey
    );

    const result = await verifyFirebaseIdToken(adminToken);
    expect(result).not.toBeNull();
    expect(result?.email).toBe('admin@example.com');
    expect(result?.isAdmin).toBe(true);
  });
});
