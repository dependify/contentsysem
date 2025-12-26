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
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import tenantRoutes from './routes/tenantRoutes';
import contentRoutes from './routes/contentRoutes';
import calendarRoutes from './routes/calendarRoutes';
import postRoutes from './routes/postRoutes';
import imageRoutes from './routes/imageRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import exportRoutes from './routes/exportRoutes';
import docsRoutes from './routes/docs';
import { z } from 'zod';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Sanitize filename to prevent path traversal and collision
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allowed extensions
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|md|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    // Mimetype check
    const mimetype = allowedTypes.test(file.mimetype) ||
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'text/plain' ||
                     file.mimetype === 'text/markdown' ||
                     file.mimetype === 'application/json';

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development simplicity with inline scripts/styles if needed
}));
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Public routes
app.use('/api/auth', authRoutes);

// Apply authentication to API routes (excluding health and auth)
app.use('/api', authenticate);

// Admin Routes
app.use('/api/admin', adminRoutes);

// New Feature Routes
app.use('/api/tenants', tenantRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);

// Documentation
app.use('/api-docs', docsRoutes);

// Serve uploads
app.use('/uploads', express.static('uploads'));

// Serve static files from the React client
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Handle React routing, return all requests to React app (except API)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    service: 'ContentSys Engine',
    version: '1.0.0',
    checks: {
      database: 'unknown',
      redis: 'unknown',
      worker: 'unknown'
    }
  };

  try {
    // Check database connectivity
    await db.query('SELECT 1');
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check Redis connectivity (if available)
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    await redis.ping();
    health.checks.redis = 'healthy';
    redis.disconnect();
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'degraded';
  }

  // Check worker status (simplified)
  health.checks.worker = 'healthy'; // Assume healthy if server is running

  // Set appropriate HTTP status
  const httpStatus = health.status === 'healthy' ? 200 : 503;
  res.status(httpStatus).json(health);
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

// Blog Post Management
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await db.queryOne(
      'SELECT * FROM content_queue WHERE id = $1',
      [req.params.id]
    );
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error fetching post' });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const { html_content, markdown_content } = req.body;
    await db.query(
      'UPDATE content_queue SET html_content = $1, markdown_content = $2 WHERE id = $3',
      [html_content, markdown_content, req.params.id]
    );
    res.json({ success: true, message: 'Post updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error updating post' });
  }
});

// Publish Post (Manual Trigger)
app.post('/api/posts/:id/publish', async (req, res) => {
  try {
    const queueId = req.params.id;
    const post = await db.queryOne('SELECT * FROM content_queue WHERE id = $1', [queueId]);

    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const tenant = await db.queryOne('SELECT wp_credentials FROM tenants WHERE id = $1', [post.tenant_id]);

    if (!tenant || !tenant.wp_credentials) {
      return res.status(400).json({ success: false, error: 'No WordPress credentials configured' });
    }

    // Trigger deployment logic directly (simplified reuse of Deployer logic would be better, but for now we simulate)
    // In a real app, we'd call the deployer function here.
    // Importing the function from execution/wp_deployer.ts
    const { deployArticle } = require('./execution/wp_deployer');

    const articleData = {
      title: post.title,
      content: post.html_content || post.markdown_content || '',
      images: [], // Images should be attached but for simple publish we skip complex re-gathering
      categories: ['Blog'],
      tags: []
    };

    const wpCredentials = JSON.parse(tenant.wp_credentials);
    const result = await deployArticle(wpCredentials, articleData);

    if (result.success) {
      await db.query(
        'UPDATE content_queue SET status = $1, published_url = $2 WHERE id = $3',
        ['complete', result.postUrl, queueId]
      );
      res.json({ success: true, url: result.postUrl });
    } else {
      throw new Error(result.error);
    }

  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ success: false, error: 'Publish failed' });
  }
});

// Image Asset Library
app.get('/api/images', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id;
    let query = `
      SELECT a.data, cq.title, cq.id as queue_id, a.created_at
      FROM artifacts a
      JOIN content_queue cq ON a.queue_id = cq.id
      WHERE a.step_name = 'pixel'
    `;
    const params = [];

    if (tenantId) {
      query += ` AND cq.tenant_id = $1`;
      params.push(tenantId);
    }

    query += ` ORDER BY a.created_at DESC`;

    const images = await db.query(query, params);

    // Parse JSON data to get simple list
    const flatImages = images.map((row: any) => {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return (data.image_data || []).map((img: any) => ({
        url: img.url,
        prompt: img.prompt, // Assuming we store prompt in image data, if not it's in Canvas artifact
        post_title: row.title,
        post_id: row.queue_id,
        created_at: row.created_at
      }));
    }).flat();

    res.json({ success: true, images: flatImages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error fetching images' });
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
    auto_publish: z.boolean().optional(),
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
      api_config,
      auto_publish
    } = req.body;

    const result = await db.query(`
      INSERT INTO tenants (business_name, domain_url, icp_profile, brand_voice, wp_credentials, api_config, auto_publish)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      business_name,
      domain_url,
      JSON.stringify(icp_profile),
      brand_voice,
      JSON.stringify(wp_credentials),
      JSON.stringify(api_config),
      auto_publish ?? true
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

// Tenant file upload
app.post('/api/tenants/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const tenantId = req.params.id;
    const field = req.body.field;
    const file = req.file;

    if (!file || !field) {
      return res.status(400).json({ success: false, error: 'File and field required' });
    }

    const validFields = ['icp_profile', 'brand_voice', 'marketing_frameworks', 'lead_magnets'];
    if (!validFields.includes(field)) {
      return res.status(400).json({ success: false, error: 'Invalid field' });
    }

    // Update tenant record with file path
    // For simplicity, we just store the path. In production, might parse text content.
    await db.query(
      `UPDATE tenants SET ${field} = $1 WHERE id = $2`,
      [file.path, tenantId]
    );

    res.json({ success: true, message: 'File uploaded', path: file.path });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
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

// ==ror handling middleware
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

// Start the server only if executed directly
if (require.main === module) {
  startServer();
}

export { app };