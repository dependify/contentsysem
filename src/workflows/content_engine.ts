/**
 * ContentSys Content Generation Workflow
 * Orchestrates the content creation pipeline: Nexus → Vantage → Vertex → Hemingway → Prism
 */

import { Workflow, StepResult } from './workflow_engine';
import { runMinimax } from '../execution/llm_minimax';
import { performDeepSearch, analyzeCompetitors, findStatistics } from '../execution/search_tavily';
import { searchWithExa } from '../execution/search_exa';
import { db } from '../execution/db_client';

interface ContentWorkflowInput {
  tenantId: number;
  title: string;
  queueId: number;
}

// Helper function to log agent execution
async function logAgentExecution(
  queueId: number,
  agentName: string,
  success: boolean,
  duration: number,
  tokenUsage: number = 0,
  error?: string
) {
  try {
    await db.query(
      `INSERT INTO agent_logs (queue_id, agent_name, duration_ms, token_usage, success, error_trace)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [queueId, agentName, duration, tokenUsage, success, error]
    );
  } catch (logError) {
    console.error('Failed to log agent execution:', logError);
  }
}

// Helper function to save artifact
async function saveArtifact(queueId: number, stepName: string, data: any) {
  try {
    await db.query(
      `INSERT INTO artifacts (queue_id, step_name, data) VALUES ($1, $2, $3)`,
      [queueId, stepName, JSON.stringify(data)]
    );
  } catch (error) {
    console.error('Failed to save artifact:', error);
  }
}

// Create the content workflow
export const contentWorkflow = new Workflow('ContentSys-Engine');

// Step 1: Nexus (Strategy)
contentWorkflow.step('nexus', {
  retries: 2,
  retryDelay: 2000,
  handler: async (input: ContentWorkflowInput): Promise<StepResult> => {
    const startTime = Date.now();
    console.log(`[Nexus] Starting strategy for: ${input.title}`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET status = $1, current_step = $2 WHERE id = $3',
        ['processing', 1, input.queueId]
      );

      // Fetch tenant context
      const tenant = await db.queryOne(
        'SELECT * FROM tenants WHERE id = $1',
        [input.tenantId]
      );

      if (!tenant) {
        throw new Error(`Tenant not found: ${input.tenantId}`);
      }

      // Prepare context for Nexus
      const context = JSON.stringify({
        title: input.title,
        business_name: tenant.business_name,
        icp: tenant.icp_profile ? JSON.parse(tenant.icp_profile) : {},
        brand_voice: tenant.brand_voice || 'Professional'
      });

      // Execute Nexus agent
      const result = await runMinimax('01_nexus_strategist.md', context);
      
      // Parse JSON response (handle potential markdown code blocks)
      let strategicBrief;
      try {
        const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || 
                          result.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : result;
        strategicBrief = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error('Failed to parse Nexus response:', result);
        throw new Error('Invalid JSON response from Nexus agent');
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(input.queueId, 'nexus', true, duration);
      await saveArtifact(input.queueId, 'nexus', strategicBrief);

      return {
        success: true,
        data: strategicBrief,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(input.queueId, 'nexus', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 2: Vantage (Research)
contentWorkflow.step('vantage', {
  retries: 2,
  retryDelay: 3000,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { nexus, queueId } = data;
    
    console.log(`[Vantage] Researching: ${nexus.research_questions?.length || 0} queries`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [2, queueId]
      );

      // Execute research using multiple sources
      const researchPromises = [];
      
      // Tavily deep search
      if (nexus.research_questions && nexus.research_questions.length > 0) {
        researchPromises.push(
          performDeepSearch(nexus.research_questions).catch(e => {
            console.warn('Tavily search failed:', e.message);
            return [];
          })
        );
      } else {
        researchPromises.push(Promise.resolve([]));
      }

      // Exa search for first question
      const primaryQuery = nexus.research_questions?.[0] || nexus.strategic_hook;
      researchPromises.push(
        searchWithExa(primaryQuery, { numResults: 5 }).catch(e => {
          console.warn('Exa search failed:', e.message);
          return { results: [] };
        })
      );

      // Competitor analysis
      researchPromises.push(
        analyzeCompetitors(primaryQuery).catch(e => {
          console.warn('Competitor analysis failed:', e.message);
          return [];
        })
      );

      // Statistics search
      researchPromises.push(
        findStatistics(primaryQuery).catch(e => {
          console.warn('Statistics search failed:', e.message);
          return { statistical_sources: [] };
        })
      );

      const [tavilyResults, exaResults, competitorAnalysis, statisticsData] = await Promise.all(researchPromises);

      // Compile research data
      const researchContext = JSON.stringify({
        strategic_brief: nexus,
        tavily_results: tavilyResults,
        exa_results: exaResults,
        competitor_analysis: competitorAnalysis,
        statistics: statisticsData
      });

      // Synthesize research using Vantage agent
      const factSheetRaw = await runMinimax('02_vantage_researcher.md', researchContext);
      
      // Parse JSON response
      let parsedFactSheet;
      try {
        const jsonMatch = factSheetRaw.match(/```json\s*([\s\S]*?)\s*```/) || 
                          factSheetRaw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : factSheetRaw;
        parsedFactSheet = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.warn('Failed to parse Vantage response as JSON, using raw text');
        parsedFactSheet = { raw_research: factSheetRaw };
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'vantage', true, duration);
      await saveArtifact(queueId, 'vantage', {
        fact_sheet: parsedFactSheet,
        raw_research: {
          tavily: tavilyResults,
          exa: exaResults,
          competitors: competitorAnalysis,
          statistics: statisticsData
        }
      });

      return {
        success: true,
        data: {
          fact_sheet: parsedFactSheet,
          raw_research: { tavilyResults, exaResults, competitorAnalysis, statisticsData }
        },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'vantage', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 3: Vertex (SEO Architecture)
contentWorkflow.step('vertex', {
  retries: 2,
  retryDelay: 2000,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { nexus, vantage, queueId } = data;
    
    console.log(`[Vertex] Creating content structure`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [3, queueId]
      );

      // Prepare context for Vertex
      const context = JSON.stringify({
        strategic_brief: nexus,
        research_findings: vantage.fact_sheet,
        primary_keyword: nexus.research_questions?.[0] || nexus.strategic_hook
      });

      // Execute Vertex agent
      const contentOutlineRaw = await runMinimax('03_vertex_seo_architect.md', context);
      
      // Parse JSON response
      let parsedOutline;
      try {
        const jsonMatch = contentOutlineRaw.match(/```json\s*([\s\S]*?)\s*```/) || 
                          contentOutlineRaw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : contentOutlineRaw;
        parsedOutline = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.warn('Failed to parse Vertex response as JSON');
        parsedOutline = { raw_outline: contentOutlineRaw };
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'vertex', true, duration);
      await saveArtifact(queueId, 'vertex', parsedOutline);

      return {
        success: true,
        data: parsedOutline,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'vertex', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 4: Hemingway (Writing)
contentWorkflow.step('hemingway', {
  retries: 2,
  retryDelay: 3000,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { nexus, vantage, vertex, queueId, tenantId } = data;
    
    console.log(`[Hemingway] Writing content`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [4, queueId]
      );

      // Get tenant brand voice
      const tenant = await db.queryOne('SELECT brand_voice FROM tenants WHERE id = $1', [tenantId]);

      // Prepare context for Hemingway
      const context = JSON.stringify({
        fact_sheet: vantage.fact_sheet,
        content_outline: vertex,
        strategic_brief: nexus,
        brand_voice: tenant?.brand_voice || 'Professional'
      });

      // Execute Hemingway agent
      const draft = await runMinimax('04_hemingway_writer.md', context);

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'hemingway', true, duration);
      await saveArtifact(queueId, 'hemingway', { draft });

      return {
        success: true,
        data: { draft },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'hemingway', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 5: Prism (Quality Control)
contentWorkflow.step('prism', {
  retries: 1,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { nexus, vantage, vertex, hemingway, queueId, tenantId } = data;
    
    console.log(`[Prism] Reviewing content quality`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [5, queueId]
      );

      // Get tenant brand voice
      const tenant = await db.queryOne('SELECT brand_voice FROM tenants WHERE id = $1', [tenantId]);

      // Prepare context for Prism
      const context = JSON.stringify({
        draft_content: hemingway.draft,
        content_outline: vertex,
        research_facts: vantage.fact_sheet,
        brand_voice: tenant?.brand_voice || 'Professional'
      });

      // Execute Prism agent
      const reviewRaw = await runMinimax('05_prism_editor.md', context);
      
      // Parse JSON response
      let parsedReview;
      try {
        const jsonMatch = reviewRaw.match(/```json\s*([\s\S]*?)\s*```/) || 
                          reviewRaw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : reviewRaw;
        parsedReview = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.warn('Failed to parse Prism response as JSON');
        parsedReview = { overall_score: 85, raw_review: reviewRaw };
      }

      // Check if content passes quality threshold
      const score = parsedReview.overall_score || 85;
      
      if (score < 85 && parsedReview.revision_requirements) {
        console.log(`[Prism] Quality score ${score} below threshold. Requesting revision.`);
        
        // Prepare revision context
        const revisionContext = JSON.stringify({
          original_draft: hemingway.draft,
          editor_feedback: parsedReview,
          fact_sheet: vantage.fact_sheet,
          content_outline: vertex,
          brand_voice: tenant?.brand_voice || 'Professional',
          revision_required: true
        });

        // Request revision from Hemingway
        const revisedDraft = await runMinimax('04_hemingway_writer.md', revisionContext);

        const duration = Date.now() - startTime;
        await logAgentExecution(queueId, 'prism', true, duration);
        await saveArtifact(queueId, 'prism', {
          review: parsedReview,
          final_draft: revisedDraft,
          revision_performed: true
        });

        return {
          success: true,
          data: {
            review: parsedReview,
            final_draft: revisedDraft,
            revision_performed: true
          },
          duration
        };
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'prism', true, duration);
      await saveArtifact(queueId, 'prism', {
        review: parsedReview,
        final_draft: hemingway.draft,
        revision_performed: false
      });

      return {
        success: true,
        data: {
          review: parsedReview,
          final_draft: hemingway.draft,
          revision_performed: false
        },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'prism', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});
