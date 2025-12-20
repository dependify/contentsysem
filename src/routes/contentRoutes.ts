import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';
import { contentQueue } from '../worker';
import { scheduler } from '../scheduler';

const router = Router();

// b18 - Cancel pending job
router.post('/queue/:id/cancel', async (req: Request, res: Response) => {
    try {
        const queueId = req.params.id;

        // Check if job exists and is pending
        const job = await db.queryOne(
            'SELECT id, status FROM content_queue WHERE id = $1',
            [queueId]
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Content item not found' });
        }

        if (job.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel job with status: ${job.status}. Only pending jobs can be cancelled.`
            });
        }

        await db.query(
            'UPDATE content_queue SET status = $1, updated_at = NOW() WHERE id = $2',
            ['cancelled', queueId]
        );

        res.json({
            success: true,
            message: 'Job cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel job error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b18 - Pause processing job
router.post('/queue/:id/pause', async (req: Request, res: Response) => {
    try {
        const queueId = req.params.id;

        const job = await db.queryOne(
            'SELECT id, status FROM content_queue WHERE id = $1',
            [queueId]
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Content item not found' });
        }

        if (job.status !== 'processing' && job.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot pause job with status: ${job.status}`
            });
        }

        await db.query(
            'UPDATE content_queue SET status = $1, updated_at = NOW() WHERE id = $2',
            ['paused', queueId]
        );

        res.json({
            success: true,
            message: 'Job paused successfully'
        });
    } catch (error) {
        console.error('Pause job error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Resume paused job
router.post('/queue/:id/resume', async (req: Request, res: Response) => {
    try {
        const queueId = req.params.id;

        const job = await db.queryOne(
            'SELECT id, status, tenant_id, title, current_step FROM content_queue WHERE id = $1',
            [queueId]
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Content item not found' });
        }

        if (job.status !== 'paused') {
            return res.status(400).json({
                success: false,
                error: `Cannot resume job with status: ${job.status}. Only paused jobs can be resumed.`
            });
        }

        // Update status and re-queue
        await db.query(
            'UPDATE content_queue SET status = $1, updated_at = NOW() WHERE id = $2',
            ['pending', queueId]
        );

        // Re-add to BullMQ
        await contentQueue.add('generate-content', {
            tenantId: job.tenant_id,
            blogTitle: job.title,
            queueId: parseInt(queueId),
            resumeFromStep: job.current_step
        });

        res.json({
            success: true,
            message: 'Job resumed successfully'
        });
    } catch (error) {
        console.error('Resume job error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b19 - Retry failed job
router.post('/queue/:id/retry', async (req: Request, res: Response) => {
    try {
        const queueId = req.params.id;

        const job = await db.queryOne(
            'SELECT id, status, tenant_id, title FROM content_queue WHERE id = $1',
            [queueId]
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Content item not found' });
        }

        if (job.status !== 'failed') {
            return res.status(400).json({
                success: false,
                error: `Cannot retry job with status: ${job.status}. Only failed jobs can be retried.`
            });
        }

        // Reset job status and current step
        await db.query(
            'UPDATE content_queue SET status = $1, current_step = 0, updated_at = NOW() WHERE id = $2',
            ['pending', queueId]
        );

        // Re-add to BullMQ
        await contentQueue.add('generate-content', {
            tenantId: job.tenant_id,
            blogTitle: job.title,
            queueId: parseInt(queueId)
        });

        res.json({
            success: true,
            message: 'Job queued for retry'
        });
    } catch (error) {
        console.error('Retry job error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b20 - Delete content item
router.delete('/queue/:id', async (req: Request, res: Response) => {
    try {
        const queueId = req.params.id;

        const job = await db.queryOne(
            'SELECT id, status FROM content_queue WHERE id = $1',
            [queueId]
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Content item not found' });
        }

        // Don't allow deleting processing jobs
        if (job.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete a job that is currently processing. Pause or cancel it first.'
            });
        }

        // Delete related artifacts first
        await db.query('DELETE FROM artifacts WHERE queue_id = $1', [queueId]);

        // Delete the content queue item
        await db.query('DELETE FROM content_queue WHERE id = $1', [queueId]);

        res.json({
            success: true,
            message: 'Content item deleted successfully'
        });
    } catch (error) {
        console.error('Delete content error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b21 - Search/filter content queue
router.get('/queue/search', async (req: Request, res: Response) => {
    try {
        const {
            tenant_id,
            status,
            keyword,
            from_date,
            to_date,
            page = '1',
            limit = '20'
        } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (tenant_id) {
            conditions.push(`tenant_id = $${paramIndex++}`);
            params.push(parseInt(tenant_id as string));
        }

        if (status) {
            const statuses = (status as string).split(',');
            conditions.push(`status IN (${statuses.map(() => `$${paramIndex++}`).join(', ')})`);
            params.push(...statuses);
        }

        if (keyword) {
            conditions.push(`title ILIKE $${paramIndex++}`);
            params.push(`%${keyword}%`);
        }

        if (from_date) {
            conditions.push(`scheduled_for >= $${paramIndex++}`);
            params.push(new Date(from_date as string));
        }

        if (to_date) {
            conditions.push(`scheduled_for <= $${paramIndex++}`);
            params.push(new Date(to_date as string));
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get results
        const query = `
      SELECT id, tenant_id, title, status, current_step, scheduled_for, published_url, created_at, updated_at
      FROM content_queue
      ${whereClause}
      ORDER BY scheduled_for DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
        params.push(limitNum, offset);

        const results = await db.query(query, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM content_queue ${whereClause}`;
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await db.queryOne(countQuery, countParams);
        const total = parseInt(countResult?.total || '0');

        res.json({
            success: true,
            results,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                total_pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Search queue error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Bulk operations
router.post('/queue/bulk-cancel', async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids array required' });
        }

        const result = await db.query(
            `UPDATE content_queue SET status = 'cancelled', updated_at = NOW() 
       WHERE id = ANY($1) AND status = 'pending'
       RETURNING id`,
            [ids]
        );

        res.json({
            success: true,
            cancelled_count: result.length,
            message: `${result.length} jobs cancelled`
        });
    } catch (error) {
        console.error('Bulk cancel error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.post('/queue/bulk-retry', async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids array required' });
        }

        // Get failed jobs
        const jobs = await db.query(
            `SELECT id, tenant_id, title FROM content_queue WHERE id = ANY($1) AND status = 'failed'`,
            [ids]
        );

        // Reset status and re-queue
        await db.query(
            `UPDATE content_queue SET status = 'pending', current_step = 0, updated_at = NOW() 
       WHERE id = ANY($1) AND status = 'failed'`,
            [ids]
        );

        // Add to BullMQ
        for (const job of jobs) {
            await contentQueue.add('generate-content', {
                tenantId: job.tenant_id,
                blogTitle: job.title,
                queueId: job.id
            });
        }

        res.json({
            success: true,
            retried_count: jobs.length,
            message: `${jobs.length} jobs queued for retry`
        });
    } catch (error) {
        console.error('Bulk retry error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
