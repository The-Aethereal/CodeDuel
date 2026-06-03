import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const authGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

export const roleCheck = (requiredRole: 'admin' | 'participant') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== requiredRole && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
