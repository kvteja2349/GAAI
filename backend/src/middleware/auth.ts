import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { db } from '../database/db.js';
import { User } from '../database/types.js';

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'password_hash'>;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = AuthService.verifyToken(token);
    const user = await db.getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    const { password_hash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid authentication token.' });
  }
}
