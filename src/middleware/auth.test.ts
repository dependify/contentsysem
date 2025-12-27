
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth';

describe('Auth Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Use the auth middleware
    app.use(authenticate);
    app.get('/protected', (req, res) => res.json({ success: true }));
  });

  afterEach(() => {
    delete process.env.CONTENTSYS_API_KEY;
    delete process.env.JWT_SECRET;
  });

  it('should block request if no API key is set in env and no credentials provided', async () => {
    // Ensure no API key in env
    delete process.env.CONTENTSYS_API_KEY;

    const res = await request(app).get('/protected');

    // Expect 500 because it's a server config error now (fail closed)
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Server configuration error: Missing API Key');
  });

  it('should allow request with valid API key in header', async () => {
    process.env.CONTENTSYS_API_KEY = 'test-key';
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
  });

  it('should deny request with invalid API key', async () => {
    process.env.CONTENTSYS_API_KEY = 'test-key';
    const res = await request(app)
      .get('/protected')
      .set('x-api-key', 'wrong-key');

    expect(res.status).toBe(401);
  });

  it('should allow request to /health without credentials', async () => {
    // We need to route /health to verify it passes
    app.get('/health', (req, res) => res.json({ status: 'ok' }));

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('should NOT allow /api/init anymore (it was removed from bypass)', async () => {
    // Even if we define the route, the middleware should block it if we didn't add the bypass
    app.post('/api/init', (req, res) => res.json({ success: true }));

    process.env.CONTENTSYS_API_KEY = 'test-key';

    // Request without credentials
    const res = await request(app).post('/api/init');

    // Should be 401 because it's not in the bypass list anymore
    expect(res.status).toBe(401);
  });
});
