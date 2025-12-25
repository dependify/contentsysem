
import express from 'express';
import request from 'supertest';

// Mock everything before importing app
jest.mock('./execution/db_client', () => ({
  db: {
    query: jest.fn(),
    queryOne: jest.fn(),
    initializeSchema: jest.fn().mockResolvedValue(undefined),
    close: jest.fn()
  }
}));

jest.mock('./scheduler', () => ({
  scheduler: {
    addContent: jest.fn(),
    bulkAddContent: jest.fn(),
    getQueueStatus: jest.fn(),
    getSystemStats: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }
}));

jest.mock('./worker', () => ({
  contentQueue: {
    add: jest.fn(),
    getJob: jest.fn()
  }
}));

// Import app after mocks
import { app } from './index';

describe('API Professionalism & Security', () => {
  const validApiKey = 'test-secret-key';
  process.env.CONTENTSYS_API_KEY = validApiKey;

  describe('Security Middleware', () => {
    test('should reject requests without API key', async () => {
      const res = await request(app).get('/api/queue/status/1');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    test('should reject requests with invalid API key', async () => {
      const res = await request(app)
        .get('/api/queue/status/1')
        .set('x-api-key', 'wrong-key');
      expect(res.status).toBe(401);
    });

    test('should allow requests with valid API key', async () => {
      const res = await request(app)
        .get('/api/queue/status/1')
        .set('x-api-key', validApiKey);
      
      expect(res.status).not.toBe(401);
    });

    test('should allow health check without API key', async () => {
      // Mock db response for health check
      const { db } = require('./execution/db_client');
      db.query.mockResolvedValueOnce([{ '?column?': 1 }]);
      // Also mock redis
      jest.mock('ioredis', () => {
        return jest.fn().mockImplementation(() => ({
          ping: jest.fn().mockResolvedValue('PONG'),
          disconnect: jest.fn()
        }));
      });

      const res = await request(app).get('/health');
      expect(res.status).not.toBe(401);
    });

    test('should allow health check to return 200/503', async () => {
         // Mock db response for health check
         const { db } = require('./execution/db_client');
         db.query.mockResolvedValueOnce([{ '?column?': 1 }]);

         const res = await request(app).get('/health');
         expect([200, 503]).toContain(res.status);
    });

    test('should return 200 on root path (HTML)', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });
  });

  describe('Validation Middleware', () => {
    test('should validate content add payload', async () => {
      const res = await request(app)
        .post('/api/content/add')
        .set('x-api-key', validApiKey)
        .send({
          // Missing tenant_id
          title: 'Test Title'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
    });

    test('should accept valid content add payload', async () => {
       const res = await request(app)
        .post('/api/content/add')
        .set('x-api-key', validApiKey)
        .send({
          tenant_id: 1,
          title: 'Test Title'
        });

      expect(res.status).not.toBe(400); 
    });
  });

  describe('Removed Endpoints', () => {
      test('should NOT allow access to /api/init', async () => {
          // It should either be 404 (if removed) or 401 (if protected)
          // Since we removed it, it won't match the specific handler, but falls through to authentication or 404
          // But wait, if we removed it from index.ts, it's 404.
          // IF we only removed from auth whitelist, it's 401.
          // I removed it from both. So it should be 404 (Not Found) or 401 (Unauthorized) depending on where it hits.
          // In index.ts, `app.use('/api', authenticate)` catches it if it starts with /api.
          // Since it starts with /api, it hits authenticate first.
          // Since we removed it from whitelist in authenticate, it should return 401 if no key provided.

          const res = await request(app).post('/api/init');
          expect(res.status).toBe(401);
      });

      test('should return 404 for /api/init even with auth if removed from routes', async () => {
        const res = await request(app)
            .post('/api/init')
            .set('x-api-key', validApiKey);

        // Since the route is removed from index.ts, it should return 404
        expect(res.status).toBe(404);
      });
  });
});
