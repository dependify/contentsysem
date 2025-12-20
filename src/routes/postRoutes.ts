import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';

const router = Router();

// f28/b47 - Autosave content
router.post('/:id/autosave', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        const { content, saved_at } = req.body;
        const userId = (req as any).user?.id;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const post = await db.queryOne(
            'SELECT id FROM content_queue WHERE id = $1',
            [postId]
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Update the draft content
        await db.query(`
            UPDATE content_queue 
            SET markdown_content = $1, updated_at = $2
            WHERE id = $3
        `, [content, saved_at || new Date().toISOString(), postId]);

        res.json({
            success: true,
            saved_at: saved_at || new Date().toISOString(),
            message: 'Autosaved successfully'
        });
    } catch (error) {
        console.error('Autosave error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Autosave failed'
        });
    }
});

// b35 - Regenerate specific section of content
router.post('/:id/regenerate', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        const { section, instructions } = req.body;

        if (!section) {
            return res.status(400).json({ success: false, error: 'section field required' });
        }

        const post = await db.queryOne(
            'SELECT id, tenant_id, title, html_content, markdown_content FROM content_queue WHERE id = $1',
            [postId]
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Get tenant info for AI context
        const tenant = await db.queryOne(
            'SELECT business_name, brand_voice, icp_profile FROM tenants WHERE id = $1',
            [post.tenant_id]
        );

        // Import LLM for regeneration
        const { generateWithMinimax } = require('../execution/llm_minimax');

        const prompt = `You are regenerating a section of a blog post.

Title: ${post.title}
Section to regenerate: ${section}
${instructions ? `Special instructions: ${instructions}` : ''}

Brand Voice: ${tenant?.brand_voice || 'Professional'}

Current content context:
${post.markdown_content?.substring(0, 2000) || post.html_content?.substring(0, 2000) || ''}

Please write ONLY the regenerated ${section} section. Match the existing style and tone.`;

        const regeneratedContent = await generateWithMinimax(prompt, {
            temperature: 0.7,
            max_tokens: 1500
        });

        // Save version before updating
        const versionResult = await db.query(
            `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM content_versions WHERE queue_id = $1`,
            [postId]
        );
        const nextVersion = versionResult[0].next_version;

        await db.query(`
      INSERT INTO content_versions (queue_id, version_number, html_content, markdown_content, change_summary)
      VALUES ($1, $2, $3, $4, $5)
    `, [postId, nextVersion, post.html_content, post.markdown_content, `Regenerated ${section} section`]);

        res.json({
            success: true,
            regenerated_section: section,
            content: regeneratedContent,
            version_saved: nextVersion,
            message: 'Section regenerated. Apply changes using PUT /api/posts/:id'
        });
    } catch (error) {
        console.error('Regenerate section error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b36 - Get content version history
router.get('/:id/versions', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;

        const post = await db.queryOne(
            'SELECT id FROM content_queue WHERE id = $1',
            [postId]
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const versions = await db.query(`
      SELECT 
        cv.id, cv.version_number, cv.change_summary, cv.created_at,
        u.email as created_by_email
      FROM content_versions cv
      LEFT JOIN users u ON cv.created_by = u.id
      WHERE cv.queue_id = $1
      ORDER BY cv.version_number DESC
    `, [postId]);

        res.json({
            success: true,
            versions
        });
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get specific version content
router.get('/:id/versions/:versionId', async (req: Request, res: Response) => {
    try {
        const { id: postId, versionId } = req.params;

        const version = await db.queryOne(`
      SELECT cv.*, u.email as created_by_email
      FROM content_versions cv
      LEFT JOIN users u ON cv.created_by = u.id
      WHERE cv.queue_id = $1 AND cv.id = $2
    `, [postId, versionId]);

        if (!version) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        res.json({
            success: true,
            version
        });
    } catch (error) {
        console.error('Get version error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b36 - Save new version (manual save)
router.post('/:id/versions', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        const { change_summary } = req.body;
        const userId = (req as any).user?.id; // From auth middleware

        const post = await db.queryOne(
            'SELECT id, html_content, markdown_content FROM content_queue WHERE id = $1',
            [postId]
        );

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Get next version number
        const versionResult = await db.query(
            `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM content_versions WHERE queue_id = $1`,
            [postId]
        );
        const nextVersion = versionResult[0].next_version;

        const result = await db.query(`
      INSERT INTO content_versions (queue_id, version_number, html_content, markdown_content, change_summary, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, version_number
    `, [postId, nextVersion, post.html_content, post.markdown_content, change_summary || 'Manual save', userId]);

        res.json({
            success: true,
            version_id: result[0].id,
            version_number: result[0].version_number,
            message: 'Version saved successfully'
        });
    } catch (error) {
        console.error('Save version error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Restore from version
router.post('/:id/versions/:versionId/restore', async (req: Request, res: Response) => {
    try {
        const { id: postId, versionId } = req.params;

        const version = await db.queryOne(
            'SELECT html_content, markdown_content FROM content_versions WHERE queue_id = $1 AND id = $2',
            [postId, versionId]
        );

        if (!version) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        // Save current as new version before restoring
        const currentPost = await db.queryOne(
            'SELECT html_content, markdown_content FROM content_queue WHERE id = $1',
            [postId]
        );

        const versionResult = await db.query(
            `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM content_versions WHERE queue_id = $1`,
            [postId]
        );
        const nextVersion = versionResult[0].next_version;

        await db.query(`
      INSERT INTO content_versions (queue_id, version_number, html_content, markdown_content, change_summary)
      VALUES ($1, $2, $3, $4, $5)
    `, [postId, nextVersion, currentPost.html_content, currentPost.markdown_content, `Before restore from version ${versionId}`]);

        // Restore the selected version
        await db.query(
            'UPDATE content_queue SET html_content = $1, markdown_content = $2, updated_at = NOW() WHERE id = $3',
            [version.html_content, version.markdown_content, postId]
        );

        res.json({
            success: true,
            message: `Restored from version ${versionId}`,
            backup_version: nextVersion
        });
    } catch (error) {
        console.error('Restore version error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Compare two versions
router.get('/:id/versions/:v1/compare/:v2', async (req: Request, res: Response) => {
    try {
        const { id: postId, v1, v2 } = req.params;

        const version1 = await db.queryOne(
            'SELECT version_number, html_content, markdown_content, created_at FROM content_versions WHERE queue_id = $1 AND id = $2',
            [postId, v1]
        );

        const version2 = await db.queryOne(
            'SELECT version_number, html_content, markdown_content, created_at FROM content_versions WHERE queue_id = $1 AND id = $2',
            [postId, v2]
        );

        if (!version1 || !version2) {
            return res.status(404).json({ success: false, error: 'One or both versions not found' });
        }

        res.json({
            success: true,
            version1: {
                id: v1,
                version_number: version1.version_number,
                markdown_content: version1.markdown_content,
                html_content: version1.html_content,
                created_at: version1.created_at
            },
            version2: {
                id: v2,
                version_number: version2.version_number,
                markdown_content: version2.markdown_content,
                html_content: version2.html_content,
                created_at: version2.created_at
            }
        });
    } catch (error) {
        console.error('Compare versions error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
