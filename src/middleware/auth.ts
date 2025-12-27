
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for public routes
  if (req.path === '/health' || req.path.startsWith('/api/auth')) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.CONTENTSYS_API_KEY;
  const authHeader = req.headers.authorization;

  // Check for JWT first (Admin/User UI)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Token' });
    }
  }

  // Fallback to API Key (External Tools)
  if (validApiKey && apiKey === validApiKey) {
    return next();
  }

  if (!validApiKey) {
    console.error('[Security] No CONTENTSYS_API_KEY set. Denying request.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing API Key'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Missing valid credentials'
  });
};
