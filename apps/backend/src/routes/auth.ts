import { Router, Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '@vexa/database';
import { hashPassword, verifyPassword, signToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input schema', details: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Conflict', message: 'User with this email already exists' });
      return;
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'Successfully registered user');
    res.status(201).json({
      success: true,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error during signup handler');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const loginHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input schema', details: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn({ email }, 'Login attempt on non-existent email');
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const passwordIsValid = verifyPassword(password, user.passwordHash);
    if (!passwordIsValid) {
      logger.warn({ email }, 'Incorrect password login attempt');
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    logger.info({ userId: user.id, email: user.email }, 'User successfully authenticated');
    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error during login handler');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.post('/signup', signupHandler);
router.post('/login', loginHandler);

export default router;
