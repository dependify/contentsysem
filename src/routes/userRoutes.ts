import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validate } from '../middleware/validation';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(['admin', 'client', 'editor', 'viewer']).optional(),
        tenant_id: z.number().int().positive().optional(),
    })
});

const updateUserSchema = z.object({
    body: z.object({
        email: z.string().email().optional(),
        role: z.enum(['admin', 'client', 'editor', 'viewer']).optional(),
        tenant_id: z.number().int().positive().nullable().optional(),
    })
});

// Helper to log audit events
async function logAudit(userId: number, action: string, resourceType: string, resourceId: number, details: any, req: Request) {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        await db.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, action, resourceType, resourceId, JSON.stringify(details), ip]);
    } catch (e) {
        console.error('Audit log error:', e);
    }
}

// b53 - List users (admin only)
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const role = req.query.role as string;
        const tenantId = req.query.tenant_id as string;

        let query = `
      SELECT u.id, u.email, u.role, u.tenant_id, t.business_name as tenant_name, u.created_at
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
    `;

        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (role) {
            conditions.push(`u.role = $${paramIndex++}`);
            params.push(role);
        }
        if (tenantId) {
            conditions.push(`u.tenant_id = $${paramIndex++}`);
            params.push(parseInt(tenantId));
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const users = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM users u';
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(' AND ')}`;
        }
        const countParams = params.slice(0, -2);
        const countResult = await db.queryOne(countQuery, countParams);
        const total = parseInt(countResult?.total || '0');

        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b53 - Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;

        const user = await db.queryOne(`
      SELECT u.id, u.email, u.role, u.tenant_id, t.business_name as tenant_name, u.created_at
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [userId]);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b53 - Create user
router.post('/', validate(createUserSchema), async (req: Request, res: Response) => {
    try {
        const { email, password, role = 'client', tenant_id } = req.body;
        const currentUserId = (req as any).user?.id;

        // Check if email exists
        const existing = await db.queryOne('SELECT id FROM users WHERE email = $1', [email]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await db.query(`
      INSERT INTO users (email, password_hash, role, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [email, passwordHash, role, tenant_id || null]);

        await logAudit(currentUserId, 'CREATE_USER', 'user', result[0].id, { email, role }, req);

        res.json({
            success: true,
            user_id: result[0].id,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b53 - Update user
router.put('/:id', validate(updateUserSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        const currentUserId = (req as any).user?.id;

        const existing = await db.queryOne('SELECT id FROM users WHERE id = $1', [userId]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.email !== undefined) {
            // Check if email is taken by another user
            const emailCheck = await db.queryOne(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [updates.email, userId]
            );
            if (emailCheck) {
                return res.status(400).json({ success: false, error: 'Email already in use' });
            }
            fields.push(`email = $${paramIndex++}`);
            values.push(updates.email);
        }
        if (updates.role !== undefined) {
            fields.push(`role = $${paramIndex++}`);
            values.push(updates.role);
        }
        if (updates.tenant_id !== undefined) {
            fields.push(`tenant_id = $${paramIndex++}`);
            values.push(updates.tenant_id);
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        values.push(userId);
        await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        await logAudit(currentUserId, 'UPDATE_USER', 'user', parseInt(userId), updates, req);

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b53 - Delete user
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const currentUserId = (req as any).user?.id;

        // Prevent self-deletion
        if (parseInt(userId) === currentUserId) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [userId]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await logAudit(currentUserId, 'DELETE_USER', 'user', parseInt(userId), { email: result[0].email }, req);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b54 - Change user role
router.put('/:id/role', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        const currentUserId = (req as any).user?.id;

        if (!role || !['admin', 'client', 'editor', 'viewer'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        const result = await db.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id',
            [role, userId]
        );

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await logAudit(currentUserId, 'CHANGE_ROLE', 'user', parseInt(userId), { new_role: role }, req);

        res.json({
            success: true,
            message: 'User role updated'
        });
    } catch (error) {
        console.error('Change role error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Reset user password (admin action)
router.post('/:id/reset-password', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { new_password } = req.body;
        const currentUserId = (req as any).user?.id;

        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }

        const passwordHash = await bcrypt.hash(new_password, 10);

        const result = await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
            [passwordHash, userId]
        );

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await logAudit(currentUserId, 'RESET_PASSWORD', 'user', parseInt(userId), {}, req);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b8 - User changes own password
router.post('/:id/change-password', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { current_password, new_password } = req.body;
        const currentUserId = (req as any).user?.id;

        // Users can only change their own password
        if (parseInt(userId) !== currentUserId) {
            return res.status(403).json({ success: false, error: 'Can only change your own password' });
        }

        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, error: 'Current and new password are required' });
        }

        if (new_password.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        // Verify current password
        const user = await db.queryOne('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isValid = await bcrypt.compare(current_password, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        // Update password
        const newHash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

        await logAudit(currentUserId, 'CHANGE_PASSWORD', 'user', parseInt(userId), {}, req);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b58 - Get audit logs
router.get('/audit/logs', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;
        const userId = req.query.user_id as string;
        const action = req.query.action as string;
        const resourceType = req.query.resource_type as string;

        let query = `
      SELECT al.*, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;

        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (userId) {
            conditions.push(`al.user_id = $${paramIndex++}`);
            params.push(parseInt(userId));
        }
        if (action) {
            conditions.push(`al.action = $${paramIndex++}`);
            params.push(action);
        }
        if (resourceType) {
            conditions.push(`al.resource_type = $${paramIndex++}`);
            params.push(resourceType);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const logs = await db.query(query, params);

        res.json({
            success: true,
            logs,
            pagination: { page, limit }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
