
import { Router } from 'express';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const DIRECTIVES_DIR = path.join(__dirname, '../../src/directives');

// List prompts
router.get('/prompts', (req: Request, res: Response) => {
  try {
    // In production (dist), this might be distinct from src
    // For now assuming we edit source files or deployed files
    const files = fs.readdirSync(DIRECTIVES_DIR).filter(f => f.endsWith('.md'));
    res.json({ success: true, files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to list prompts' });
  }
});

// Get prompt content
router.get('/prompts/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const filePath = path.join(DIRECTIVES_DIR, filename);

    // Double check resolved path is within DIRECTIVES_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(DIRECTIVES_DIR);
    if (!resolvedPath.startsWith(resolvedDir)) {
         return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (error) {
    console.error('File read error:', error);
    res.status(500).json({ success: false, error: 'Failed to read file' });
  }
});

// Update prompt content
router.post('/prompts/:filename', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const filename = req.params.filename;

    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const filePath = path.join(DIRECTIVES_DIR, filename);

    // Double check resolved path is within DIRECTIVES_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(DIRECTIVES_DIR);
    if (!resolvedPath.startsWith(resolvedDir)) {
         return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true, message: 'Prompt updated' });
  } catch (error) {
    console.error('File write error:', error);
    res.status(500).json({ success: false, error: 'Failed to save file' });
  }
});

export default router;
