import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { db } from './execution/db_client';
import { scheduler } from './scheduler';
import { contentQueue } from './worker';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';
import { authenticate } from './middleware/auth';
import { validate } from './middleware/validation';
import { errorHandler } from './middleware/error_handler';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Apply authentication to API routes (excluding health)
app.use('/api', authenticate);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    service: 'ContentSys Engine'
  });
});

// Initialize database schema
app.post('/api/init', async (req, res) => {
  try {
    await db.initializeSchema();
    res.json({ success: true, message: 'Database schema initialized' });
  } catch (error) {
    console.error('Schema initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Validation Schemas
const tenantSchema = z.object({
  body: z.object({
    business_name: z.string().min(1),
    domain_url: z.string().url().optional(),
    icp_profile: z.record(z.any()).optional(),
    brand_voice: z.string().optional(),
    wp_credentials: z.record(z.any()).optional(),
    api_config: z.record(z.any()).optional(),
  })
});

const contentSchema = z.object({
  body: z.object({
    tenant_id: z.number().int().positive(),
    title: z.string().min(1),
    scheduled_for: z.string().datetime().optional(),
  })
});

// Tenant management endpoints
app.post('/api/tenants', validate(tenantSchema), async (req, res, next) => {
  try {
    const { 
      business_name, 
      domain_url, 
      icp_profile, 
      brand_voice, 
      wp_credentials, 
      api_config 
    } = req.body;

    const result = await db.query(`
      INSERT INTO tenants (business_name, domain_url, icp_profile, brand_voice, wp_credentials, api_config)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      business_name,
      domain_url,
      JSON.stringify(icp_profile),
      brand_voice,
      JSON.stringify(wp_credentials),
      JSON.stringify(api_config)
    ]);

    res.json({ 
      success: true, 
      tenant_id: result[0].id,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('Tenant creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/api/tenants/:id', async (req, res) => {
  try {
    const tenant = await db.queryOne(
      'SELECT * FROM tenants WHERE id = $1',
      [req.params.id]
    );

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    // Parse JSON fields
    tenant.icp_profile = tenant.icp_profile ? JSON.parse(tenant.icp_profile) : null;
    tenant.wp_credentials = tenant.wp_credentials ? JSON.parse(tenant.wp_credentials) : null;
    tenant.api_config = tenant.api_config ? JSON.parse(tenant.api_config) : null;

    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Tenant fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Content queue management
app.post('/api/content/add', validate(contentSchema), async (req, res, next) => {
  try {
    const { tenant_id, title, scheduled_for } = req.body;

    const queueId = await scheduler.addContent(
      tenant_id, 
      title, 
      scheduled_for ? new Date(scheduled_for) : undefined
    );

    res.json({ 
      success: true, 
      queue_id: queueId,
      message: 'Content added to queue'
    });
  } catch (error) {
    console.error('Content add error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.post('/api/content/bulk-add', async (req, res) => {
  try {
    const { tenant_id, titles, interval_hours = 24 } = req.body;

    if (!tenant_id || !titles || !Array.isArray(titles)) {
      return res.status(400).json({ 
        success: false, 
        error: 'tenant_id and titles array are required' 
      });
    }

    const queueIds = await scheduler.bulkAddContent(tenant_id, titles, interval_hours);

    res.json({ 
      success: true, 
      queue_ids: queueIds,
      message: `${titles.length} items added to queue`
    });
  } catch (error) {
    console.error('Bulk add error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Queue status and monitoring
app.get('/api/queue/status/:tenant_id', async (req, res) => {
  try {
    const status = await scheduler.getQueueStatus(parseInt(req.params.tenant_id));
    res.json({ success: true, queue_status: status });
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/api/system/stats', async (req, res) => {
  try {
    const stats = await scheduler.getSystemStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Manual job triggering (for testing)
app.post('/api/jobs/trigger', async (req, res) => {
  try {
    const { tenant_id, title } = req.body;

    if (!tenant_id || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'tenant_id and title are required' 
      });
    }

    // Add to queue and trigger immediately
    const queueId = await scheduler.addContent(tenant_id, title, new Date());

    // Add job to BullMQ
    const job = await contentQueue.add('generate-content', {
      tenantId: tenant_id,
      blogTitle: title,
      queueId: queueId
    });

    res.json({ 
      success: true, 
      job_id: job.id,
      queue_id: queueId,
      message: 'Job triggered manually'
    });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get job details
app.get('/api/jobs/:job_id', async (req, res) => {
  try {
    const job = await contentQueue.getJob(req.params.job_id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ 
      success: true, 
      job: {
        id: job.id,
        data: job.data,
        progress: job.progress,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
      }
    });
  } catch (error) {
    console.error('Job details error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database
    await db.initializeSchema();
    console.log('✅ Database schema initialized');

    // Start scheduler
    scheduler.start();
    console.log('✅ Content scheduler started');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ ContentSys API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down ContentSys server...');
  scheduler.stop();
  await db.close();
  process.exit(0);
});

// Start the server
startServer();

export { app };