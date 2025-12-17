
import express from 'express';
import request from 'supertest';
import { app } from './index';

// Mock dependencies if needed, but for now we test middleware integration
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
      // Mock db response for this test to avoid actual DB call failure
      // or expect 500 but pass auth check. 
      // Since we just check auth, 500 is fine as long as it's not 401.
      const res = await request(app)
        .get('/api/queue/status/1')
        .set('x-api-key', validApiKey);
      
      expect(res.status).not.toBe(401);
    });

    test('should allow health check without API key', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    test('should return welcome message on root path', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Welcome to ContentSys');
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
       // We expect 500 because DB mock isn't set up here fully, 
       // but validation should pass (so not 400).
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
});
