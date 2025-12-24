
import request from 'supertest';
import express from 'express';
import adminRoutes from './adminRoutes';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes Security', () => {

    test('Path Traversal: accessing ../index.ts should return 400 or 403', async () => {
        const res = await request(app).get('/api/admin/prompts/..%2Findex.ts');

        // It should catch ".." or fail on path check
        expect(res.status).not.toBe(200);
        expect(res.status).toBe(400); // We now check if includes '..'
        expect(res.body.error).toMatch(/Invalid filename/);
    });

    test('Valid file access should work', async () => {
        // Create a dummy file in the correct location
        // DIRECTIVES_DIR is ../../src/directives relative to routes/adminRoutes.ts
        // In the test setup, adminRoutes uses __dirname.
        // __dirname in compiled code might differ.

        // Since we are running ts-jest, source mapping might handle it.
        // Let's create a file in `src/directives`
        const dir = path.join(process.cwd(), 'src/directives');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'test-valid.md'), 'safe content');

        const res = await request(app).get('/api/admin/prompts/test-valid.md');
        expect(res.status).toBe(200);
        expect(res.body.content).toBe('safe content');
    });
});
