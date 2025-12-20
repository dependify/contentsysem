import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';

const router = Router();

// b62 - Export content queue as CSV
router.get('/content/csv', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenant_id;
        const status = req.query.status as string;

        if (!tenantId) {
            return res.status(400).json({ success: false, error: 'tenant_id required' });
        }

        let query = `
      SELECT id, title, status, current_step, scheduled_for, published_url, created_at, updated_at
      FROM content_queue
      WHERE tenant_id = $1
    `;
        const params: any[] = [tenantId];

        if (status) {
            query += ` AND status = $2`;
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const content = await db.query(query, params);

        // Generate CSV
        const headers = ['id', 'title', 'status', 'current_step', 'scheduled_for', 'published_url', 'created_at', 'updated_at'];
        const csvRows = [headers.join(',')];

        for (const row of content) {
            const values = headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                if (val instanceof Date) return val.toISOString();
                // Escape quotes and wrap in quotes if contains comma
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });
            csvRows.push(values.join(','));
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="content_export_${tenantId}_${Date.now()}.csv"`);
        res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b62 - Export content queue as JSON
router.get('/content/json', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenant_id;
        const status = req.query.status as string;
        const includeArtifacts = req.query.include_artifacts === 'true';

        if (!tenantId) {
            return res.status(400).json({ success: false, error: 'tenant_id required' });
        }

        let query = `
      SELECT id, title, status, current_step, scheduled_for, published_url, 
             html_content, markdown_content, created_at, updated_at
      FROM content_queue
      WHERE tenant_id = $1
    `;
        const params: any[] = [tenantId];

        if (status) {
            query += ` AND status = $2`;
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const content = await db.query(query, params);

        // Optionally include artifacts
        if (includeArtifacts) {
            for (const item of content) {
                const artifacts = await db.query(
                    'SELECT step_name, data, created_at FROM artifacts WHERE queue_id = $1 ORDER BY created_at',
                    [item.id]
                );
                item.artifacts = artifacts;
            }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="content_export_${tenantId}_${Date.now()}.json"`);
        res.json({
            exported_at: new Date().toISOString(),
            tenant_id: parseInt(tenantId as string),
            count: content.length,
            content
        });
    } catch (error) {
        console.error('Export JSON error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Export reports as JSON
router.get('/reports/json', async (req: Request, res: Response) => {
    try {
        const contentId = req.query.content_id;

        if (!contentId) {
            return res.status(400).json({ success: false, error: 'content_id required' });
        }

        const content = await db.queryOne(
            'SELECT * FROM content_queue WHERE id = $1',
            [contentId]
        );

        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        // Get all artifacts for this content
        const artifacts = await db.query(
            'SELECT step_name, data, created_at FROM artifacts WHERE queue_id = $1 ORDER BY created_at',
            [contentId]
        );

        // Get images
        const images = await db.query(
            'SELECT filename, file_path, prompt_used, image_type FROM image_assets WHERE queue_id = $1',
            [contentId]
        );

        // Get agent logs
        const agentLogs = await db.query(
            'SELECT agent_name, duration_ms, token_usage, success, created_at FROM agent_logs WHERE queue_id = $1 ORDER BY created_at',
            [contentId]
        );

        const report = {
            exported_at: new Date().toISOString(),
            content: {
                id: content.id,
                title: content.title,
                status: content.status,
                html_content: content.html_content,
                markdown_content: content.markdown_content,
                published_url: content.published_url,
                created_at: content.created_at,
                updated_at: content.updated_at
            },
            artifacts: artifacts.map((a: any) => ({
                step: a.step_name,
                data: typeof a.data === 'string' ? JSON.parse(a.data) : a.data,
                created_at: a.created_at
            })),
            images,
            agent_logs: agentLogs,
            processing_summary: {
                total_duration_ms: agentLogs.reduce((acc: number, l: any) => acc + (l.duration_ms || 0), 0),
                total_tokens: agentLogs.reduce((acc: number, l: any) => acc + (l.token_usage || 0), 0),
                success_rate: agentLogs.length > 0
                    ? (agentLogs.filter((l: any) => l.success).length / agentLogs.length * 100).toFixed(1) + '%'
                    : 'N/A'
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report_${contentId}_${Date.now()}.json"`);
        res.json(report);
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Export tenant data (for backup)
router.get('/tenant/:id', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.id;

        const tenant = await db.queryOne('SELECT * FROM tenants WHERE id = $1', [tenantId]);
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        // Get all content
        const content = await db.query('SELECT * FROM content_queue WHERE tenant_id = $1', [tenantId]);

        // Get all artifacts for this tenant's content
        const artifacts = await db.query(`
      SELECT a.* FROM artifacts a
      JOIN content_queue cq ON a.queue_id = cq.id
      WHERE cq.tenant_id = $1
    `, [tenantId]);

        // Get images
        const images = await db.query('SELECT * FROM image_assets WHERE tenant_id = $1', [tenantId]);

        // Get schedules
        const schedules = await db.query('SELECT * FROM content_schedules WHERE tenant_id = $1', [tenantId]);

        // Get blog titles
        const titles = await db.query('SELECT * FROM blog_titles WHERE tenant_id = $1', [tenantId]);

        const backup = {
            exported_at: new Date().toISOString(),
            version: '1.0',
            tenant: {
                ...tenant,
                wp_credentials: '[REDACTED]' // Don't export sensitive data
            },
            content,
            artifacts,
            images,
            schedules,
            titles,
            stats: {
                content_count: content.length,
                artifact_count: artifacts.length,
                image_count: images.length,
                schedule_count: schedules.length,
                title_count: titles.length
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="tenant_backup_${tenantId}_${Date.now()}.json"`);
        res.json(backup);
    } catch (error) {
        console.error('Export tenant error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
