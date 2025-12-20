import { Router, Request, Response } from 'express';
import { db } from '../execution/db_client';

const router = Router();

// Token costs per 1K tokens (approximate)
const TOKEN_COSTS: Record<string, number> = {
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01,
    'gpt-3.5-turbo': 0.0015,
    'minimax-abab6': 0.002,
    'claude-3-opus': 0.015,
    'claude-3-sonnet': 0.003,
    'default': 0.002
};

// b50 - Content performance metrics (if available)
router.get('/content/:id', async (req: Request, res: Response) => {
    try {
        const contentId = req.params.id;

        const content = await db.queryOne(`
      SELECT 
        cq.id, cq.title, cq.status, cq.published_url, cq.created_at, cq.updated_at,
        (SELECT COUNT(*) FROM artifacts WHERE queue_id = cq.id) as artifact_count
      FROM content_queue cq
      WHERE cq.id = $1
    `, [contentId]);

        if (!content) {
            return res.status(404).json({ success: false, error: 'Content not found' });
        }

        // Get agent execution times
        const agentMetrics = await db.query(`
      SELECT agent_name, duration_ms, token_usage, success, created_at
      FROM agent_logs
      WHERE queue_id = $1
      ORDER BY created_at
    `, [contentId]);

        // Get token usage
        const tokenUsage = await db.query(`
      SELECT agent_name, SUM(input_tokens) as total_input, SUM(output_tokens) as total_output, SUM(cost_usd) as total_cost
      FROM token_usage
      WHERE queue_id = $1
      GROUP BY agent_name
    `, [contentId]);

        const totalDuration = agentMetrics.reduce((acc: number, m: any) => acc + (m.duration_ms || 0), 0);
        const totalTokens = tokenUsage.reduce((acc: number, t: any) =>
            acc + parseInt(t.total_input || '0') + parseInt(t.total_output || '0'), 0);
        const totalCost = tokenUsage.reduce((acc: number, t: any) => acc + parseFloat(t.total_cost || '0'), 0);

        res.json({
            success: true,
            content: {
                id: content.id,
                title: content.title,
                status: content.status,
                published_url: content.published_url,
                created_at: content.created_at,
                updated_at: content.updated_at
            },
            metrics: {
                total_duration_ms: totalDuration,
                total_tokens: totalTokens,
                total_cost_usd: totalCost.toFixed(6),
                artifact_count: parseInt(content.artifact_count),
                agent_breakdown: agentMetrics,
                token_breakdown: tokenUsage
            }
        });
    } catch (error) {
        console.error('Content metrics error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b51 - Token usage tracking per tenant
router.get('/tokens/:tenant_id', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.tenant_id;
        const { from_date, to_date, group_by = 'day' } = req.query;

        // Default to last 30 days
        const fromDate = from_date
            ? new Date(from_date as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to_date ? new Date(to_date as string) : new Date();

        // Daily usage
        const dateFormat = group_by === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

        const usage = await db.query(`
      SELECT 
        TO_CHAR(tu.created_at, '${dateFormat}') as period,
        SUM(tu.input_tokens) as input_tokens,
        SUM(tu.output_tokens) as output_tokens,
        SUM(tu.cost_usd) as cost_usd,
        COUNT(DISTINCT tu.queue_id) as content_count
      FROM token_usage tu
      JOIN content_queue cq ON tu.queue_id = cq.id
      WHERE tu.tenant_id = $1 
        AND tu.created_at >= $2 
        AND tu.created_at <= $3
      GROUP BY TO_CHAR(tu.created_at, '${dateFormat}')
      ORDER BY period
    `, [tenantId, fromDate, toDate]);

        // Agent breakdown
        const agentBreakdown = await db.query(`
      SELECT 
        agent_name,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cost_usd) as cost_usd
      FROM token_usage
      WHERE tenant_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY agent_name
      ORDER BY cost_usd DESC
    `, [tenantId, fromDate, toDate]);

        // Totals
        const totalsResult = await db.queryOne(`
      SELECT 
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(cost_usd) as total_cost
      FROM token_usage
      WHERE tenant_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
    `, [tenantId, fromDate, toDate]);

        res.json({
            success: true,
            tenant_id: parseInt(tenantId),
            date_range: {
                from: fromDate.toISOString(),
                to: toDate.toISOString()
            },
            totals: {
                input_tokens: parseInt(totalsResult?.total_input || '0'),
                output_tokens: parseInt(totalsResult?.total_output || '0'),
                total_tokens: parseInt(totalsResult?.total_input || '0') + parseInt(totalsResult?.total_output || '0'),
                cost_usd: parseFloat(totalsResult?.total_cost || '0').toFixed(6)
            },
            usage_by_period: usage,
            usage_by_agent: agentBreakdown
        });
    } catch (error) {
        console.error('Token usage error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// b52 - Cost estimation per content
router.get('/costs/:tenant_id', async (req: Request, res: Response) => {
    try {
        const tenantId = req.params.tenant_id;
        const { from_date, to_date } = req.query;

        const fromDate = from_date
            ? new Date(from_date as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to_date ? new Date(to_date as string) : new Date();

        // Cost per content item
        const contentCosts = await db.query(`
      SELECT 
        cq.id,
        cq.title,
        cq.status,
        cq.created_at,
        COALESCE(SUM(tu.cost_usd), 0) as total_cost,
        COALESCE(SUM(tu.input_tokens + tu.output_tokens), 0) as total_tokens
      FROM content_queue cq
      LEFT JOIN token_usage tu ON cq.id = tu.queue_id
      WHERE cq.tenant_id = $1 
        AND cq.created_at >= $2 
        AND cq.created_at <= $3
      GROUP BY cq.id, cq.title, cq.status, cq.created_at
      ORDER BY cq.created_at DESC
    `, [tenantId, fromDate, toDate]);

        // Average cost per content
        const avgResult = await db.queryOne(`
      SELECT 
        AVG(content_cost) as avg_cost,
        COUNT(*) as content_count
      FROM (
        SELECT cq.id, COALESCE(SUM(tu.cost_usd), 0) as content_cost
        FROM content_queue cq
        LEFT JOIN token_usage tu ON cq.id = tu.queue_id
        WHERE cq.tenant_id = $1 
          AND cq.created_at >= $2 
          AND cq.created_at <= $3
        GROUP BY cq.id
      ) costs
    `, [tenantId, fromDate, toDate]);

        // Model breakdown
        const modelBreakdown = await db.query(`
      SELECT 
        model,
        SUM(input_tokens + output_tokens) as total_tokens,
        SUM(cost_usd) as total_cost
      FROM token_usage tu
      JOIN content_queue cq ON tu.queue_id = cq.id
      WHERE tu.tenant_id = $1 
        AND tu.created_at >= $2 
        AND tu.created_at <= $3
      GROUP BY model
      ORDER BY total_cost DESC
    `, [tenantId, fromDate, toDate]);

        res.json({
            success: true,
            tenant_id: parseInt(tenantId),
            date_range: {
                from: fromDate.toISOString(),
                to: toDate.toISOString()
            },
            summary: {
                content_count: parseInt(avgResult?.content_count || '0'),
                average_cost_per_content: parseFloat(avgResult?.avg_cost || '0').toFixed(6),
                total_cost: contentCosts.reduce((acc: number, c: any) => acc + parseFloat(c.total_cost), 0).toFixed(6)
            },
            content_costs: contentCosts.map((c: any) => ({
                ...c,
                total_cost: parseFloat(c.total_cost).toFixed(6),
                total_tokens: parseInt(c.total_tokens)
            })),
            model_breakdown: modelBreakdown
        });
    } catch (error) {
        console.error('Cost estimation error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// System-wide analytics (admin only)
router.get('/system', async (req: Request, res: Response) => {
    try {
        const { from_date, to_date } = req.query;

        const fromDate = from_date
            ? new Date(from_date as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to_date ? new Date(to_date as string) : new Date();

        // Tenant usage summary
        const tenantUsage = await db.query(`
      SELECT 
        t.id as tenant_id,
        t.business_name,
        COUNT(DISTINCT cq.id) as content_count,
        COALESCE(SUM(tu.cost_usd), 0) as total_cost
      FROM tenants t
      LEFT JOIN content_queue cq ON t.id = cq.tenant_id AND cq.created_at >= $1 AND cq.created_at <= $2
      LEFT JOIN token_usage tu ON cq.id = tu.queue_id
      WHERE t.archived = FALSE OR t.archived IS NULL
      GROUP BY t.id, t.business_name
      ORDER BY total_cost DESC
    `, [fromDate, toDate]);

        // Overall stats
        const overall = await db.queryOne(`
      SELECT 
        COUNT(DISTINCT tenant_id) as active_tenants,
        COUNT(*) as total_content,
        SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM content_queue
      WHERE created_at >= $1 AND created_at <= $2
    `, [fromDate, toDate]);

        res.json({
            success: true,
            date_range: {
                from: fromDate.toISOString(),
                to: toDate.toISOString()
            },
            overall: {
                active_tenants: parseInt(overall?.active_tenants || '0'),
                total_content: parseInt(overall?.total_content || '0'),
                completed: parseInt(overall?.completed || '0'),
                failed: parseInt(overall?.failed || '0'),
                success_rate: overall?.total_content > 0
                    ? ((parseInt(overall?.completed || '0') / parseInt(overall?.total_content)) * 100).toFixed(1) + '%'
                    : 'N/A'
            },
            tenant_usage: tenantUsage.map((t: any) => ({
                ...t,
                total_cost: parseFloat(t.total_cost).toFixed(6)
            }))
        });
    } catch (error) {
        console.error('System analytics error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
