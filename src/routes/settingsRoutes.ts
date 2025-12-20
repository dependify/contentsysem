import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = Router();

// b57 - Get system settings
router.get('/settings', async (req: Request, res: Response) => {
    try {
        const settings = await db.query('SELECT * FROM system_settings ORDER BY setting_key');

        // Parse values based on type
        const parsed = settings.map((s: any) => ({
            key: s.setting_key,
            value: s.setting_type === 'json' ? JSON.parse(s.setting_value || '{}') :
                s.setting_type === 'boolean' ? s.setting_value === 'true' :
                    s.setting_type === 'number' ? parseFloat(s.setting_value) :
                        s.setting_value,
            type: s.setting_type,
            description: s.description
        }));

        res.json({ success: true, settings: parsed });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b57 - Update system settings
router.put('/settings', async (req: Request, res: Response) => {
    try {
        const { settings } = req.body;

        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ success: false, error: 'settings array required' });
        }

        for (const setting of settings) {
            const { key, value, type = 'string', description } = setting;

            if (!key) continue;

            const stringValue = type === 'json' ? JSON.stringify(value) :
                type === 'boolean' ? String(value) :
                    String(value);

            await db.query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, description, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = $2, 
          setting_type = $3, 
          description = COALESCE($4, system_settings.description),
          updated_at = NOW()
      `, [key, stringValue, type, description]);
        }

        res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b59 - Get API keys for tenant
router.get('/tenants/:id/api-keys', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;

        const keys = await db.query(`
      SELECT id, key_name, key_prefix, permissions, is_active, expires_at, last_used_at, created_at
      FROM api_keys
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [tenantId]);

        res.json({ success: true, api_keys: keys });
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b59 - Create API key for tenant
router.post('/tenants/:id/api-keys', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;
        const { key_name, permissions, expires_days } = req.body;

        // Generate API key
        const rawKey = crypto.randomBytes(32).toString('hex');
        const prefix = rawKey.substring(0, 8);
        const keyHash = await bcrypt.hash(rawKey, 10);

        const expiresAt = expires_days
            ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000)
            : null;

        const result = await db.query(`
      INSERT INTO api_keys (tenant_id, key_name, key_hash, key_prefix, permissions, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [tenantId, key_name || 'API Key', keyHash, prefix, JSON.stringify(permissions || {}), expiresAt]);

        res.json({
            success: true,
            key_id: result[0].id,
            api_key: rawKey, // Only shown once!
            prefix,
            message: 'API key created. Save this key - it will not be shown again.'
        });
    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b59 - Delete API key
router.delete('/tenants/:tenantId/api-keys/:keyId', async (req: Request, res: Response) => {
    try {
        const { tenantId, keyId } = req.params;

        const result = await db.query(
            'DELETE FROM api_keys WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [keyId, tenantId]
        );

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'API key not found' });
        }

        res.json({ success: true, message: 'API key deleted' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Toggle API key active status
router.patch('/tenants/:tenantId/api-keys/:keyId/toggle', async (req: Request, res: Response) => {
    try {
        const { tenantId, keyId } = req.params;

        const result = await db.query(`
      UPDATE api_keys 
      SET is_active = NOT is_active 
      WHERE id = $1 AND tenant_id = $2 
      RETURNING id, is_active
    `, [keyId, tenantId]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'API key not found' });
        }

        res.json({
            success: true,
            is_active: result[0].is_active,
            message: result[0].is_active ? 'API key activated' : 'API key deactivated'
        });
    } catch (error) {
        console.error('Toggle API key error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// System health check (detailed)
router.get('/health', async (req: Request, res: Response) => {
    try {
        const checks: Record<string, any> = {};

        // Database check
        try {
            const dbResult = await db.queryOne('SELECT NOW() as time, version() as version');
            checks.database = {
                status: 'healthy',
                time: dbResult.time,
                version: dbResult.version.split(' ')[0]
            };
        } catch (e) {
            checks.database = { status: 'unhealthy', error: (e as Error).message };
        }

        // Queue counts
        try {
            const queueStats = await db.query(`
        SELECT status, COUNT(*) as count
        FROM content_queue
        GROUP BY status
      `);
            checks.queue = {
                status: 'healthy',
                stats: queueStats.reduce((acc: any, s: any) => {
                    acc[s.status] = parseInt(s.count);
                    return acc;
                }, {})
            };
        } catch (e) {
            checks.queue = { status: 'unknown' };
        }

        // Tenant count
        try {
            const tenantCount = await db.queryOne('SELECT COUNT(*) as count FROM tenants WHERE archived = FALSE OR archived IS NULL');
            checks.tenants = {
                active_count: parseInt(tenantCount?.count || '0')
            };
        } catch (e) {
            checks.tenants = { status: 'unknown' };
        }

        const isHealthy = checks.database?.status === 'healthy';

        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            checks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
