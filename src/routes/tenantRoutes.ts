import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';
import { z } from 'zod';
import { validate } from '../middleware/validation';
import axios from 'axios';

const router = Router();

// Validation schemas
const updateTenantSchema = z.object({
    body: z.object({
        business_name: z.string().min(1).optional(),
        domain_url: z.string().url().optional(),
        icp_profile: z.union([z.string(), z.record(z.any())]).optional(),
        brand_voice: z.string().optional(),
        wp_credentials: z.record(z.any()).optional(),
        api_config: z.record(z.any()).optional(),
        auto_publish: z.boolean().optional(),
        niche: z.string().optional(),
    })
});

// b12 - List all tenants (admin only, paginated)
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const includeArchived = req.query.include_archived === 'true';

        let query = `
      SELECT id, business_name, domain_url, niche, auto_publish, archived, created_at
      FROM tenants
    `;

        if (!includeArchived) {
            query += ` WHERE archived = FALSE OR archived IS NULL`;
        }

        query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

        const tenants = await db.query(query, [limit, offset]);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM tenants';
        if (!includeArchived) {
            countQuery += ` WHERE archived = FALSE OR archived IS NULL`;
        }
        const countResult = await db.queryOne(countQuery);
        const total = parseInt(countResult?.total || '0');

        res.json({
            success: true,
            tenants,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('List tenants error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b10 - Update tenant endpoint
router.put('/:id', validate(updateTenantSchema), async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;
        const updates = req.body;

        // Check tenant exists
        const existing = await db.queryOne('SELECT id FROM tenants WHERE id = $1', [tenantId]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        // Build dynamic update query
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.business_name !== undefined) {
            fields.push(`business_name = $${paramIndex++}`);
            values.push(updates.business_name);
        }
        if (updates.domain_url !== undefined) {
            fields.push(`domain_url = $${paramIndex++}`);
            values.push(updates.domain_url);
        }
        if (updates.icp_profile !== undefined) {
            fields.push(`icp_profile = $${paramIndex++}`);
            values.push(typeof updates.icp_profile === 'string' ? updates.icp_profile : JSON.stringify(updates.icp_profile));
        }
        if (updates.brand_voice !== undefined) {
            fields.push(`brand_voice = $${paramIndex++}`);
            values.push(updates.brand_voice);
        }
        if (updates.wp_credentials !== undefined) {
            fields.push(`wp_credentials = $${paramIndex++}`);
            values.push(JSON.stringify(updates.wp_credentials));
        }
        if (updates.api_config !== undefined) {
            fields.push(`api_config = $${paramIndex++}`);
            values.push(JSON.stringify(updates.api_config));
        }
        if (updates.auto_publish !== undefined) {
            fields.push(`auto_publish = $${paramIndex++}`);
            values.push(updates.auto_publish);
        }
        if (updates.niche !== undefined) {
            fields.push(`niche = $${paramIndex++}`);
            values.push(updates.niche);
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields to update' });
        }

        values.push(tenantId);
        const query = `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id`;

        await db.query(query, values);

        res.json({
            success: true,
            message: 'Tenant updated successfully'
        });
    } catch (error) {
        console.error('Update tenant error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b11 - Delete/archive tenant endpoint
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;
        const permanent = req.query.permanent === 'true';

        // Check tenant exists
        const existing = await db.queryOne('SELECT id FROM tenants WHERE id = $1', [tenantId]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        if (permanent) {
            // Permanent delete - cascade will handle related records
            await db.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
            res.json({
                success: true,
                message: 'Tenant permanently deleted'
            });
        } else {
            // Soft delete (archive)
            await db.query('UPDATE tenants SET archived = TRUE WHERE id = $1', [tenantId]);
            res.json({
                success: true,
                message: 'Tenant archived successfully'
            });
        }
    } catch (error) {
        console.error('Delete tenant error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Restore archived tenant
router.post('/:id/restore', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;

        const result = await db.query(
            'UPDATE tenants SET archived = FALSE WHERE id = $1 AND archived = TRUE RETURNING id',
            [tenantId]
        );

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'Archived tenant not found' });
        }

        res.json({
            success: true,
            message: 'Tenant restored successfully'
        });
    } catch (error) {
        console.error('Restore tenant error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b13 - Validate WordPress connection
router.post('/:id/validate-wp', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;

        // Get tenant WP credentials
        const tenant = await db.queryOne(
            'SELECT wp_credentials FROM tenants WHERE id = $1',
            [tenantId]
        );

        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        if (!tenant.wp_credentials) {
            return res.status(400).json({ success: false, error: 'No WordPress credentials configured' });
        }

        const wpCreds = typeof tenant.wp_credentials === 'string'
            ? JSON.parse(tenant.wp_credentials)
            : tenant.wp_credentials;

        if (!wpCreds.site_url || !wpCreds.username || !wpCreds.app_password) {
            return res.status(400).json({
                success: false,
                error: 'Incomplete WordPress credentials. Required: site_url, username, app_password'
            });
        }

        // Test connection by fetching current user
        const wpApiUrl = `${wpCreds.site_url}/wp-json/wp/v2/users/me`;
        const authString = Buffer.from(`${wpCreds.username}:${wpCreds.app_password}`).toString('base64');

        try {
            const response = await axios.get(wpApiUrl, {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            res.json({
                success: true,
                message: 'WordPress connection successful',
                wordpress_user: {
                    id: response.data.id,
                    name: response.data.name,
                    slug: response.data.slug
                }
            });
        } catch (wpError: any) {
            const status = wpError.response?.status;
            let errorMessage = 'WordPress connection failed';

            if (status === 401) {
                errorMessage = 'Invalid WordPress credentials';
            } else if (status === 404) {
                errorMessage = 'WordPress REST API not found. Ensure REST API is enabled.';
            } else if (wpError.code === 'ECONNREFUSED') {
                errorMessage = 'Could not connect to WordPress site';
            } else if (wpError.code === 'ENOTFOUND') {
                errorMessage = 'WordPress site URL not found';
            }

            res.status(400).json({
                success: false,
                error: errorMessage,
                details: wpError.message
            });
        }
    } catch (error) {
        console.error('Validate WP error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
