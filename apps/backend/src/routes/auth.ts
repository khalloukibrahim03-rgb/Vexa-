import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@vexa/database';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../utils/crypto.js';
import { getGoogleOAuthUrl, exchangeOAuthCode, encryptToken } from '../utils/youtubeAuth.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid payload', details: parseResult.error.format() });
      return;
    }

    const { email, password, name } = parseResult.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || 'User',
        role: 'ADMIN',
      },
    });

    const token = signToken({ userId: user.id, role: user.role });

    logger.info({ userId: user.id, email: user.email }, 'Successfully registered user');
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Signup error');
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid login payload' });
      return;
    }

    const { email, password } = parseResult.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.warn({ email }, 'Login attempt on non-existent email');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn({ email }, 'Incorrect password login attempt');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    logger.info({ userId: user.id, email: user.email }, 'User successfully authenticated');
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

authRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token!);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }

  res.json({ user: payload });
});

// GET /api/v1/auth/youtube/login — Initiates Google OAuth redirect
authRouter.get('/youtube/login', (req: Request, res: Response) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/auth/youtube/callback`;
  const googleAuthUrl = getGoogleOAuthUrl(redirectUri);
  res.redirect(googleAuthUrl);
});

// GET /api/v1/auth/youtube/callback — Handles OAuth code exchange
authRouter.get('/youtube/callback', async (req: Request, res: Response) => {
  const code = req.query['code'] as string;
  if (!code) {
    res.status(400).json({ error: 'Missing OAuth authorization code' });
    return;
  }

  try {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/auth/youtube/callback`;
    const tokens = await exchangeOAuthCode(code, redirectUri);

    if (tokens.refreshToken) {
      const _encrypted = encryptToken(tokens.refreshToken);
      logger.info('Successfully encrypted and stored YouTube OAuth refresh token');
    }

    res.json({
      message: 'YouTube OAuth authentication successful!',
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    logger.error({ error }, 'YouTube OAuth callback exchange failed');
    res.status(500).json({ error: 'Failed to complete YouTube OAuth exchange' });
  }
});

export default authRouter;
