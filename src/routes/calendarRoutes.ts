import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router = Router();

// Validation schemas
const rescheduleSchema = z.object({
    body: z.object({
        scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    })
});

const recurringSchema = z.object({
    body: z.object({
        tenant_id: z.number().int().positive(),
        title_template: z.string().min(1),
        frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        count: z.number().int().positive().max(52).optional(),
        scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        auto_publish: z.boolean().optional(),
    })
});

// b38 - Get calendar view (content by date range)
router.get('/', async (req: Request, res: Response) => {
    try {
        const {
            tenant_id,
            start_date,
            end_date,
            status
        } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ success: false, error: 'tenant_id required' });
        }

        // Default to current month
        const start = start_date
            ? new Date(start_date as string)
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const end = end_date
            ? new Date(end_date as string)
            : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        let query = `
      SELECT 
        id, title, status, current_step, scheduled_for, published_url, created_at
      FROM content_queue
      WHERE tenant_id = $1 
        AND scheduled_for >= $2 
        AND scheduled_for <= $3
    `;
        const params: any[] = [tenant_id, start, end];

        if (status) {
            const statuses = (status as string).split(',');
            query += ` AND status IN (${statuses.map((_, i) => `$${params.length + i + 1}`).join(', ')})`;
            params.push(...statuses);
        }

        query += ' ORDER BY scheduled_for ASC';

        const content = await db.query(query, params);

        // Also get content schedules
        const schedules = await db.query(`
      SELECT id, title, scheduled_date, scheduled_time, status, auto_publish
      FROM content_schedules
      WHERE tenant_id = $1 
        AND scheduled_date >= $2::date 
        AND scheduled_date <= $3::date
      ORDER BY scheduled_date, scheduled_time
    `, [tenant_id, start, end]);

        // Group by date for calendar view
        const calendarData: Record<string, any[]> = {};

        for (const item of content) {
            const dateKey = item.scheduled_for.toISOString().split('T')[0];
            if (!calendarData[dateKey]) calendarData[dateKey] = [];
            calendarData[dateKey].push({
                ...item,
                type: 'content'
            });
        }

        for (const item of schedules) {
            const dateKey = item.scheduled_date.toISOString().split('T')[0];
            if (!calendarData[dateKey]) calendarData[dateKey] = [];
            calendarData[dateKey].push({
                ...item,
                type: 'schedule'
            });
        }

        res.json({
            success: true,
            calendar: calendarData,
            date_range: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        });
    } catch (error) {
        console.error('Calendar view error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b39 - Reschedule content
router.put('/:id/reschedule', validate(rescheduleSchema), async (req: Request, res: Response) => {
    try {
        const contentId = req.params.id;
        const { scheduled_date, scheduled_time = '09:00:00' } = req.body;

        // Check if content exists
        const content = await db.queryOne(
            'SELECT id, status FROM content_queue WHERE id = $1',
            [contentId]
        );

        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        // Combine date and time
        const newScheduledFor = new Date(`${scheduled_date}T${scheduled_time}`);

        await db.query(
            'UPDATE content_queue SET scheduled_for = $1, updated_at = NOW() WHERE id = $2',
            [newScheduledFor, contentId]
        );

        res.json({
            success: true,
            message: 'Content rescheduled successfully',
            new_scheduled_for: newScheduledFor.toISOString()
        });
    } catch (error) {
        console.error('Reschedule error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b40 - Create recurring content schedule
router.post('/recurring', validate(recurringSchema), async (req: Request, res: Response) => {
    try {
        const {
            tenant_id,
            title_template,
            frequency,
            start_date,
            end_date,
            count = 12,
            scheduled_time = '09:00:00',
            auto_publish = true
        } = req.body;

        const dates: Date[] = [];
        let currentDate = new Date(start_date);
        const endLimit = end_date ? new Date(end_date) : null;

        const frequencyDays: Record<string, number> = {
            daily: 1,
            weekly: 7,
            biweekly: 14,
            monthly: 30 // Approximate
        };

        while (dates.length < count) {
            if (endLimit && currentDate > endLimit) break;

            dates.push(new Date(currentDate));

            if (frequency === 'monthly') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else {
                currentDate.setDate(currentDate.getDate() + frequencyDays[frequency]);
            }
        }

        // Create schedule entries
        const createdSchedules: number[] = [];
        for (let i = 0; i < dates.length; i++) {
            const title = title_template.replace('{n}', (i + 1).toString());

            const result = await db.query(`
        INSERT INTO content_schedules (tenant_id, title, scheduled_date, scheduled_time, auto_publish)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [tenant_id, title, dates[i], scheduled_time, auto_publish]);

            createdSchedules.push(result[0].id);
        }

        res.json({
            success: true,
            message: `Created ${createdSchedules.length} scheduled entries`,
            schedule_ids: createdSchedules,
            dates: dates.map(d => d.toISOString().split('T')[0])
        });
    } catch (error) {
        console.error('Recurring schedule error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update schedule entry
router.put('/schedules/:id', async (req: Request, res: Response) => {
    try {
        const scheduleId = req.params.id;
        const { title, scheduled_date, scheduled_time, auto_publish, status } = req.body;

        const existing = await db.queryOne(
            'SELECT id FROM content_schedules WHERE id = $1',
            [scheduleId]
        );

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if (scheduled_date !== undefined) {
            updates.push(`scheduled_date = $${paramIndex++}`);
            values.push(scheduled_date);
        }
        if (scheduled_time !== undefined) {
            updates.push(`scheduled_time = $${paramIndex++}`);
            values.push(scheduled_time);
        }
        if (auto_publish !== undefined) {
            updates.push(`auto_publish = $${paramIndex++}`);
            values.push(auto_publish);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(scheduleId);

        await db.query(
            `UPDATE content_schedules SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        res.json({
            success: true,
            message: 'Schedule updated successfully'
        });
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete schedule entry
router.delete('/schedules/:id', async (req: Request, res: Response) => {
    try {
        const scheduleId = req.params.id;

        const result = await db.query(
            'DELETE FROM content_schedules WHERE id = $1 RETURNING id',
            [scheduleId]
        );

        if (result.length === 0) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }

        res.json({
            success: true,
            message: 'Schedule deleted'
        });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
