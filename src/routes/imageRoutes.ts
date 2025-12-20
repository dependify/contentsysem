import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// b43 - Delete image asset
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const imageId = req.params.id;

        const image = await db.queryOne(
            'SELECT id, file_path FROM image_assets WHERE id = $1',
            [imageId]
        );

        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found' });
        }

        // Delete file from disk if it exists
        if (image.file_path && fs.existsSync(image.file_path)) {
            fs.unlinkSync(image.file_path);
        }

        // Delete from database (cascade will handle tags)
        await db.query('DELETE FROM image_assets WHERE id = $1', [imageId]);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b44 - Update image metadata
router.put('/:id/metadata', async (req: Request, res: Response) => {
    try {
        const imageId = req.params.id;
        const { filename, prompt_used, image_type } = req.body;

        const image = await db.queryOne(
            'SELECT id FROM image_assets WHERE id = $1',
            [imageId]
        );

        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found' });
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (filename !== undefined) {
            updates.push(`filename = $${paramIndex++}`);
            values.push(filename);
        }
        if (prompt_used !== undefined) {
            updates.push(`prompt_used = $${paramIndex++}`);
            values.push(prompt_used);
        }
        if (image_type !== undefined) {
            updates.push(`image_type = $${paramIndex++}`);
            values.push(image_type);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        values.push(imageId);
        await db.query(
            `UPDATE image_assets SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        res.json({
            success: true,
            message: 'Image metadata updated'
        });
    } catch (error) {
        console.error('Update image metadata error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b46 - Get all tags for a tenant
router.get('/tags', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenant_id;

        let query = 'SELECT id, name, created_at FROM image_tags';
        const params: any[] = [];

        if (tenantId) {
            query += ' WHERE tenant_id = $1 OR tenant_id IS NULL';
            params.push(tenantId);
        }

        query += ' ORDER BY name';

        const tags = await db.query(query, params);

        res.json({
            success: true,
            tags
        });
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create new tag
router.post('/tags', async (req: Request, res: Response) => {
    try {
        const { name, tenant_id } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'name required' });
        }

        const result = await db.query(
            'INSERT INTO image_tags (name, tenant_id) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
            [name.toLowerCase().trim(), tenant_id || null]
        );

        if (result.length === 0) {
            // Tag already exists, fetch it
            const existing = await db.queryOne('SELECT id FROM image_tags WHERE name = $1', [name.toLowerCase().trim()]);
            return res.json({
                success: true,
                tag_id: existing.id,
                message: 'Tag already exists'
            });
        }

        res.json({
            success: true,
            tag_id: result[0].id,
            message: 'Tag created'
        });
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b46 - Add tags to image
router.post('/:id/tags', async (req: Request, res: Response) => {
    try {
        const imageId = req.params.id;
        const { tag_ids, tag_names } = req.body;

        const image = await db.queryOne(
            'SELECT id, tenant_id FROM image_assets WHERE id = $1',
            [imageId]
        );

        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found' });
        }

        const addedTags: number[] = [];

        // Add by tag IDs
        if (tag_ids && Array.isArray(tag_ids)) {
            for (const tagId of tag_ids) {
                try {
                    await db.query(
                        'INSERT INTO image_asset_tags (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [imageId, tagId]
                    );
                    addedTags.push(tagId);
                } catch (e) {
                    // Skip invalid tags
                }
            }
        }

        // Add by tag names (create if not exists)
        if (tag_names && Array.isArray(tag_names)) {
            for (const tagName of tag_names) {
                // Get or create tag
                let tagResult = await db.queryOne('SELECT id FROM image_tags WHERE name = $1', [tagName.toLowerCase().trim()]);

                if (!tagResult) {
                    const created = await db.query(
                        'INSERT INTO image_tags (name, tenant_id) VALUES ($1, $2) RETURNING id',
                        [tagName.toLowerCase().trim(), image.tenant_id]
                    );
                    tagResult = { id: created[0].id };
                }

                await db.query(
                    'INSERT INTO image_asset_tags (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [imageId, tagResult.id]
                );
                addedTags.push(tagResult.id);
            }
        }

        res.json({
            success: true,
            added_tags: addedTags,
            message: `Added ${addedTags.length} tags to image`
        });
    } catch (error) {
        console.error('Add tags to image error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Remove tag from image
router.delete('/:id/tags/:tagId', async (req: Request, res: Response) => {
    try {
        const { id: imageId, tagId } = req.params;

        await db.query(
            'DELETE FROM image_asset_tags WHERE image_id = $1 AND tag_id = $2',
            [imageId, tagId]
        );

        res.json({
            success: true,
            message: 'Tag removed from image'
        });
    } catch (error) {
        console.error('Remove tag error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get tags for an image
router.get('/:id/tags', async (req: Request, res: Response) => {
    try {
        const imageId = req.params.id;

        const tags = await db.query(`
      SELECT t.id, t.name
      FROM image_tags t
      JOIN image_asset_tags iat ON t.id = iat.tag_id
      WHERE iat.image_id = $1
      ORDER BY t.name
    `, [imageId]);

        res.json({
            success: true,
            tags
        });
    } catch (error) {
        console.error('Get image tags error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Search images by tags or keyword
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { tenant_id, tags, image_type, query: searchString } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ success: false, error: 'tenant_id required' });
        }

        let query = `
      SELECT DISTINCT ia.id, ia.filename, ia.file_path, ia.prompt_used, ia.image_type, ia.created_at
      FROM image_assets ia
    `;

        const params: any[] = [tenant_id];
        let paramIndex = 2;

        if (tags) {
            const tagList = (tags as string).split(',').map(t => t.toLowerCase().trim());
            query += `
                JOIN image_asset_tags iat ON ia.id = iat.image_id
                JOIN image_tags it ON iat.tag_id = it.id
            `;
            query += ` WHERE ia.tenant_id = $1 AND it.name IN (${tagList.map(() => `$${paramIndex++}`).join(', ')})`;
            params.push(...tagList);
        } else {
            query += ' WHERE ia.tenant_id = $1';
        }

        if (searchString) {
            query += ` AND (ia.filename ILIKE $${paramIndex} OR ia.prompt_used ILIKE $${paramIndex})`;
            params.push(`%${searchString}%`);
            paramIndex++;
        }

        if (image_type) {
            query += ` AND ia.image_type = $${paramIndex++}`;
            params.push(image_type);
        }

        query += ' ORDER BY ia.created_at DESC';

        const images = await db.query(query, params);

        res.json({
            success: true,
            images
        });
    } catch (error) {
        console.error('Search images error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b45 - Upload image
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
    try {
        const { tenant_id, alt_text, tags, image_type, prompt_used } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }

        if (!tenant_id) {
            return res.status(400).json({ success: false, error: 'tenant_id is required' });
        }

        const imageUrl = `/uploads/${file.filename}`;

        const result = await db.query(`
            INSERT INTO image_assets (tenant_id, filename, file_path, url, alt_text, image_type, prompt_used)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, url, filename
        `, [
            tenant_id,
            file.originalname,
            file.path,
            imageUrl,
            alt_text || '',
            image_type || 'uploaded',
            prompt_used || ''
        ]);

        const newImage = result[0];

        // Add tags if provided
        if (tags) {
            const tagArray = tags.split(',').map((t: string) => t.trim().toLowerCase());
            for (const tagName of tagArray) {
                if (!tagName) continue;
                // Get or create tag
                let tag = await db.queryOne('SELECT id FROM image_tags WHERE name = $1', [tagName]);
                if (!tag) {
                    const tagResult = await db.query('INSERT INTO image_tags (name, tenant_id) VALUES ($1, $2) RETURNING id', [tagName, tenant_id]);
                    tag = tagResult[0];
                }
                await db.query('INSERT INTO image_asset_tags (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newImage.id, tag.id]);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            image: { ...newImage, alt_text, tags: tags ? tags.split(',') : [] }
        });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
