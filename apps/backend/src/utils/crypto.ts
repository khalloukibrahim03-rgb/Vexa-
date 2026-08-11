import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Hashes a password securely using Node's native memory-hard scrypt algorithm.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  // scrypt generates a highly secure slow-hash designed for passwords
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt}:${key.toString('hex')}`;
}

/**
 * Verifies a password against an existing secure memory-hard scrypt hash.
 * Protects against crashes due to buffer length mismatches and protects against timing side-channel attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false;
    }
    const [salt, originalHash] = parts;
    const key = crypto.scryptSync(password, salt!, 64, { N: 16384, r: 8, p: 1 });

    const hashBuf = Buffer.from(originalHash!, 'hex');
    // Guard against timingSafeEqual throwing TypeErrors on mismatching lengths
    if (hashBuf.length !== key.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuf, key);
  } catch {
    return false;
  }
}

/**
 * Securely signs a JSON payload returning an HMAC-SHA256 session token.
 * Uses timing-safe verification and standard crypto.createHmac.
 */
export function signToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');

  const signatureInput = `${header}.${body}`;
  const signature = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(signatureInput)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes a signed token with timing-safe checks.
 */
export function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [header, body, signature] = parts;
    const signatureInput = `${header}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(signatureInput)
      .digest('base64url');

    // Use timingSafeEqual to prevent timing attacks on token comparison
    const sigBuffer = Buffer.from(signature!, 'base64url');
    const expectedSigBuffer = Buffer.from(expectedSignature, 'base64url');

    if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body!, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
