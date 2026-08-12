import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export interface AuthorizedRequest extends Request {
  userPayload?: {
    userId: string;
    email: string;
    role?: string;
  };
}

/**
 * Role-Based Access Control middleware.
 * Verifies signed session tokens and checks administrative role clearances.
 */
export function authorizeRoles(allowedRoles: string[] = []): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header prefix');
      res.status(401).json({ error: 'Unauthorized', message: 'Credentials token required.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized', message: 'Bearer token format invalid.' });
      return;
    }

    // Decode and verify timing-safe token signature
    const decoded = verifyToken(token);
    if (!decoded) {
      logger.warn('Token signature verification failed or token expired');
      res.status(401).json({ error: 'Unauthorized', message: 'Token signature invalid or expired.' });
      return;
    }

    // Role verification (if specific administrative role is required)
    if (allowedRoles.length > 0) {
      const userRole = decoded['role'] || 'user';
      if (!allowedRoles.includes(userRole)) {
        logger.warn({ userRole, allowedRoles }, 'Role authorization clearance breached');
        res.status(403).json({ error: 'Forbidden', message: 'Insufficient clearances to execute this command.' });
        return;
      }
    }

    // Bind decoded user payload to request stream
    (req as AuthorizedRequest).userPayload = decoded as any;
    next();
  };
}
export default authorizeRoles;
