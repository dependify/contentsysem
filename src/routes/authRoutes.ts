import { Router, Request, Response } from 'express';
import { login } from '../controllers/authController';
import { db } from '../execution/db_client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Sentinel: Enforce secure JWT configuration
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not defined in production environment');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Apply rate limiting to login
router.post('/login', authRateLimiter, login);

// Register new user
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email, password, business_name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        // Check if user exists
        const existing = await db.queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with pending status (requires admin approval)
        const result = await db.query(`
            INSERT INTO users (email, password_hash, role, status)
            VALUES ($1, $2, 'client', 'pending')
            RETURNING id, email, role, status
        `, [email.toLowerCase(), hashedPassword]);

        const newUser = result[0];

        // If business_name provided, create a tenant
        if (business_name) {
            const tenantResult = await db.query(`
                INSERT INTO tenants (business_name)
                VALUES ($1)
                RETURNING id
            `, [business_name]);

            await db.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [tenantResult[0].id, newUser.id]);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful. Awaiting admin approval.',
            user: { id: newUser.id, email: newUser.email, status: newUser.status }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Registration failed'
        });
    }
});

// Logout (client-side token removal, server can blacklist if needed)
router.post('/logout', async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as any;

        // Check if token is too old to refresh (e.g., 7 days)
        const tokenAge = Date.now() / 1000 - decoded.iat;
        if (tokenAge > 7 * 24 * 60 * 60) {
            return res.status(401).json({ success: false, error: 'Token too old. Please login again.' });
        }

        // Generate new token
        const newToken = jwt.sign(
            { id: decoded.id, email: decoded.email, role: decoded.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// Request password reset
router.post('/forgot-password', passwordResetRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const user = await db.queryOne('SELECT id, email FROM users WHERE email = $1', [email?.toLowerCase()]);

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.query(
            'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
            [resetToken, resetExpires, user.id]
        );

        // TODO: Send email with reset link using EmailService
        console.log(`Password reset token for ${email}: ${resetToken}`);

        res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to process request' });
    }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, new_password } = req.body;

        if (!token || !new_password) {
            return res.status(400).json({ success: false, error: 'Token and new password are required' });
        }

        const user = await db.queryOne(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
            [token]
        );

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 12);

        await db.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.json({ success: true, message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

export default router;
