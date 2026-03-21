import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export const verifyAuthToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.email = decodedToken.email;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (token) {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      req.userId = decodedToken.uid;
      req.email = decodedToken.email;
    } catch (error) {
      console.warn('Token verification failed:', error);
    }
  }
  next();
};
