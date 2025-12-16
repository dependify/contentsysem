import * as cron from 'node-cron';
import { contentQueue } from './worker';
import { db } from './execution/db_client';
import * as dotenv from 'dotenv';

dotenv.config();

// Scheduler to check for pending content and queue jobs
class ContentScheduler {
  private cronTask: any;

  constructor() {
    // Run every minute to check for scheduled content
    this.cronTask = null;
  }

  // Check database for content scheduled for current time
  async checkScheduledContent(): Promise<void> {
    try {
      const now = new Date();
      
      // Find content scheduled for now or earlier that's still pending
      const scheduledContent = await db.query(`
        SELECT cq.*, t.business_name 
        FROM content_queue cq
        JOIN tenants t ON cq.tenant_id = t.id
        WHERE cq.status = 'pending' 
        AND cq.scheduled_for <= $1
        ORDER BY cq.scheduled_for ASC
        LIMIT 5
      `, [now]);

      if (scheduledContent.length === 0) {
        return;
      }

      console.log(`[Scheduler] Found ${scheduledContent.length} items to process`);

      // Queue each item for processing
      for (const item of scheduledContent) {
        try {
          await contentQueue.add('generate-content', {
            tenantId: item.tenant_id,
            blogTitle: item.title,
            queueId: item.id
          }, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            },
            removeOnComplete: 10,
            removeOnFail: 5
          });

          // Update status to queued
          await db.query(
            'UPDATE content_queue SET status = $1 WHERE id = $2',
            ['queued', item.id]
          );

          console.log(`[Scheduler] Queued: ${item.title} for ${item.business_name}`);
          
        } catch (error) {
          console.error(`[Scheduler] Failed to queue item ${item.id}:`, error);
        }
      }

    } catch (error) {
      console.error('[Scheduler] Error checking scheduled content:', error);
    }
  }

  // Start the scheduler
  start(): void {
    this.cronTask = cron.schedule('* * * * *', this.checkScheduledContent.bind(this), {
      scheduled: false
    });
    this.cronTask.start();
    console.log('[Scheduler] Content scheduler started');
  }

  // Stop the scheduler
  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('[Scheduler] Content scheduler stopped');
    }
  }

  // Add content to the queue manually
  async addContent(
    tenantId: number, 
    title: string, 
    scheduledFor?: Date
  ): Promise<number> {
    try {
      const result = await db.query(`
        INSERT INTO content_queue (tenant_id, title, scheduled_for, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `, [tenantId, title, scheduledFor || new Date()]);

      const queueId = result[0].id;
      console.log(`[Scheduler] Added content to queue: ${title} (ID: ${queueId})`);
      
      return queueId;
    } catch (error) {
      console.error('[Scheduler] Error adding content:', error);
      throw error;
    }
  }

  // Bulk add content from a list
  async bulkAddContent(
    tenantId: number, 
    titles: string[], 
    intervalHours: number = 24
  ): Promise<number[]> {
    const queueIds: number[] = [];
    const now = new Date();

    for (let i = 0; i < titles.length; i++) {
      const scheduledFor = new Date(now.getTime() + (i * intervalHours * 60 * 60 * 1000));
      const queueId = await this.addContent(tenantId, titles[i], scheduledFor);
      queueIds.push(queueId);
    }

    console.log(`[Scheduler] Bulk added ${titles.length} items for tenant ${tenantId}`);
    return queueIds;
  }

  // Get queue status for a tenant
  async getQueueStatus(tenantId: number): Promise<any[]> {
    try {
      const status = await db.query(`
        SELECT 
          id,
          title,
          status,
          current_step,
          scheduled_for,
          published_url,
          created_at
        FROM content_queue 
        WHERE tenant_id = $1 
        ORDER BY scheduled_for DESC
        LIMIT 50
      `, [tenantId]);

      return status;
    } catch (error) {
      console.error('[Scheduler] Error getting queue status:', error);
      return [];
    }
  }

  // Get system-wide statistics
  async getSystemStats(): Promise<any> {
    try {
      const stats = await db.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM content_queue 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY status
      `);

      const agentStats = await db.query(`
        SELECT 
          agent_name,
          COUNT(*) as executions,
          AVG(duration_ms) as avg_duration,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
          SUM(CASE WHEN success THEN 0 ELSE 1 END) as failures
        FROM agent_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY agent_name
      `);

      return {
        queue_stats: stats,
        agent_performance: agentStats,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[Scheduler] Error getting system stats:', error);
      return null;
    }
  }
}

// Create and export scheduler instance
export const scheduler = new ContentScheduler();

// Auto-start if this file is run directly
if (require.main === module) {
  scheduler.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[Scheduler] Shutting down...');
    scheduler.stop();
    process.exit(0);
  });
}