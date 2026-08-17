import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const ENCRYPTION_SECRET = process.env['SESSION_SECRET'] || 'vexa_super_secret_session_key_32bytes!';

/**
 * Encrypts sensitive OAuth tokens (e.g. YouTube refresh token) before database persistence.
 */
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(ENCRYPTION_SECRET, 'vexa_salt', 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts encrypted OAuth tokens retrieved from the database.
 */
export function decryptToken(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.pbkdf2Sync(ENCRYPTION_SECRET, 'vexa_salt', 100000, 32, 'sha256');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates Google OAuth 2.0 authorization URL for YouTube channel access.
 */
export function getGoogleOAuthUrl(redirectUri: string, clientId?: string): string {
  const id = clientId || process.env['YOUTUBE_CLIENT_ID'] || '';
  const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');

  return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${id}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&access_type=offline&prompt=consent`;
}

/**
 * Exchanges Google OAuth 2.0 authorization code for access and refresh tokens.
 */
export async function exchangeOAuthCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const clientId = process.env['YOUTUBE_CLIENT_ID'] || '';
  const clientSecret = process.env['YOUTUBE_CLIENT_SECRET'] || '';

  if (!clientId || !clientSecret) {
    throw new Error('YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET is missing.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, 'OAuth token exchange failed');
    throw new Error(`Google OAuth Token Exchange Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}
