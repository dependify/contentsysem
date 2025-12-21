
import express from 'express';
import request from 'supertest';

// Mock dependencies BEFORE importing app
jest.mock('./execution/db_client', () => ({
  db: {
    query: jest.fn(),
    queryOne: jest.fn(),
    initializeSchema: jest.fn().mockResolvedValue(true),
    close: jest.fn()
  }
}));

jest.mock('./scheduler', () => ({
  scheduler: {
    start: jest.fn(),
    stop: jest.fn(),
    addContent: jest.fn(),
    getQueueStatus: jest.fn(),
    getSystemStats: jest.fn()
  }
}));

jest.mock('./worker', () => ({
  contentQueue: {
    add: jest.fn(),
    getJob: jest.fn()
  }
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
    on: jest.fn()
  }));
});

import { app } from './index';

// Note: We need to set CONTENTSYS_API_KEY env var for this test

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
      // Mock db response for this test
      const { scheduler } = require('./scheduler');
      (scheduler.getQueueStatus as jest.Mock).mockResolvedValue({ pending: 0 });

      const res = await request(app)
        .get('/api/queue/status/1')
        .set('x-api-key', validApiKey);
      
      expect(res.status).not.toBe(401);
    });

    test('should allow health check without API key', async () => {
      // Mock db query for health check
      const { db } = require('./execution/db_client');
      (db.query as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
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
       const { scheduler } = require('./scheduler');
       (scheduler.addContent as jest.Mock).mockResolvedValue(123);

       const res = await request(app)
        .post('/api/content/add')
        .set('x-api-key', validApiKey)
        .send({
          tenant_id: 1,
          title: 'Test Title'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
