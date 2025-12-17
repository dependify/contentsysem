
import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.CONTENTSYS_API_KEY;

  // Skip auth for health check and init
  if (req.path === '/health' || req.path === '/api/init') {
    return next();
  }

  // If no API key is configured in env, warn but allow (dev mode)
  // or block. For "Professional" mode, we should block.
  if (!validApiKey) {
    console.warn('[Security] No CONTENTSYS_API_KEY set. Allowing request but this is insecure.');
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API Key'
    });
  }

  next();
};
