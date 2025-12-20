// Internal Linking Suggestions API
import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';

const router = Router();

// b51 - Get internal linking suggestions for content
router.get('/:id/suggestions', async (req: Request, res: Response) => {
    try {
        const contentId = req.params.id;
        const limit = parseInt(req.query.limit as string) || 10;

        // Get current content
        const content = await db.queryOne(
            'SELECT id, title, tenant_id, markdown_content FROM content_queue WHERE id = $1',
            [contentId]
        );

        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        // Extract keywords from title
        const titleWords = content.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w: string) => w.length > 3);

        // Find related content from same tenant that could be linked
        const relatedContent = await db.query(`
            SELECT id, title, published_url, status, created_at
            FROM content_queue
            WHERE tenant_id = $1
              AND id != $2
              AND status = 'complete'
              AND published_url IS NOT NULL
            ORDER BY created_at DESC
            LIMIT $3
        `, [content.tenant_id, contentId, limit * 2]);

        // Score each piece of content for relevance
        const scoredContent = relatedContent.map((c: any) => {
            const cTitleWords = c.title
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter((w: string) => w.length > 3);
            
            // Count matching words
            const matchingWords = titleWords.filter((w: string) => 
                cTitleWords.some((cw: string) => cw.includes(w) || w.includes(cw))
            );

            return {
                id: c.id,
                title: c.title,
                url: c.published_url,
                relevance_score: matchingWords.length,
                matching_keywords: matchingWords,
                anchor_text_suggestion: c.title.length > 50 ? c.title.substring(0, 50) + '...' : c.title
            };
        });

        // Sort by relevance and take top results
        const suggestions = scoredContent
            .filter((c: any) => c.relevance_score > 0)
            .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
            .slice(0, limit);

        res.json({
            success: true,
            content_id: contentId,
            content_title: content.title,
            suggestions,
            total_found: suggestions.length
        });
    } catch (error) {
        console.error('Internal linking error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Apply internal link to content
router.post('/:id/apply-link', async (req: Request, res: Response) => {
    try {
        const contentId = req.params.id;
        const { target_url, anchor_text } = req.body;

        if (!target_url || !anchor_text) {
            return res.status(400).json({ 
                success: false, 
                error: 'target_url and anchor_text are required' 
            });
        }

        const content = await db.queryOne(
            'SELECT markdown_content FROM content_queue WHERE id = $1',
            [contentId]
        );

        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        // Check if anchor text exists in content
        if (!content.markdown_content || !content.markdown_content.includes(anchor_text)) {
            return res.status(400).json({
                success: false,
                error: 'Anchor text not found in content'
            });
        }

        // Replace first occurrence of anchor text with link
        const linkMarkdown = `[${anchor_text}](${target_url})`;
        const updatedContent = content.markdown_content.replace(anchor_text, linkMarkdown);

        await db.query(
            'UPDATE content_queue SET markdown_content = $1, updated_at = NOW() WHERE id = $2',
            [updatedContent, contentId]
        );

        res.json({
            success: true,
            message: 'Internal link applied successfully',
            link: { anchor_text, target_url }
        });
    } catch (error) {
        console.error('Apply link error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
