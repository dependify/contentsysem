/**
 * ContentSys Multimedia & Deployment Workflow
 * Orchestrates: Canvas → Lens → Pixel → Mosaic → Deployer
 */

import { Workflow, StepResult } from './workflow_engine';
import { runMinimax } from '../execution/llm_minimax';
import { generateArticleImages } from '../execution/image_generator';
import { searchWithExa } from '../execution/search_exa';
import { deployArticle } from '../execution/wp_deployer';
import { db } from '../execution/db_client';

interface MultimediaWorkflowInput {
  queueId: number;
  tenantId: number;
  finalContent: string;
  contentOutline: any;
}

// Helper functions
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

// Create the multimedia workflow
export const multimediaWorkflow = new Workflow('ContentSys-Multimedia');

// Step 6: Canvas (Visual Direction)
multimediaWorkflow.step('canvas', {
  retries: 2,
  retryDelay: 2000,
  handler: async (input: MultimediaWorkflowInput): Promise<StepResult> => {
    const startTime = Date.now();
    const { queueId, finalContent, contentOutline } = input;
    
    console.log(`[Canvas] Creating image prompts`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [6, queueId]
      );

      // Prepare context for Canvas
      const context = JSON.stringify({
        article_content: finalContent.substring(0, 5000), // Limit content size
        content_outline: contentOutline,
        target_sections: 2
      });

      // Execute Canvas agent
      const imageDirectivesRaw = await runMinimax('06_canvas_visual_director.md', context);
      
      // Parse JSON response
      let parsedDirectives;
      try {
        const jsonMatch = imageDirectivesRaw.match(/```json\s*([\s\S]*?)\s*```/) || 
                          imageDirectivesRaw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : imageDirectivesRaw;
        parsedDirectives = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.warn('Failed to parse Canvas response, using defaults');
        parsedDirectives = {
          selected_sections: [{ section_title: 'Main Content' }],
          image_prompts: [
            {
              image_number: 1,
              section_placement: 'Introduction',
              prompt: 'Professional business concept illustration, modern clean design, 16:9 aspect ratio',
              alt_text: 'Article illustration',
              caption: ''
            }
          ]
        };
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'canvas', true, duration);
      await saveArtifact(queueId, 'canvas', parsedDirectives);

      return {
        success: true,
        data: parsedDirectives,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'canvas', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 7: Lens (Video Curation)
multimediaWorkflow.step('lens', {
  retries: 2,
  retryDelay: 2000,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { canvas, queueId, finalContent } = data;
    
    console.log(`[Lens] Curating videos`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [7, queueId]
      );

      // Extract key topics for video search
      const topics = canvas.selected_sections?.map((section: any) => section.section_title) || ['main topic'];
      
      // Search for relevant videos using Exa
      const videoSearchResults = [];
      for (const topic of topics.slice(0, 2)) {
        try {
          const results = await searchWithExa(`${topic} tutorial video site:youtube.com`, {
            numResults: 3,
            type: 'neural'
          });
          videoSearchResults.push(results);
        } catch (e) {
          console.warn(`Video search failed for topic: ${topic}`);
          videoSearchResults.push({ results: [] });
        }
      }

      // Prepare context for Lens
      const context = JSON.stringify({
        article_content: finalContent.substring(0, 3000),
        key_topics: topics,
        video_search_results: videoSearchResults
      });

      // Execute Lens agent
      const videoRecommendationsRaw = await runMinimax('07_lens_video_curator.md', context);
      
      // Parse JSON response
      let parsedRecommendations;
      try {
        const jsonMatch = videoRecommendationsRaw.match(/```json\s*([\s\S]*?)\s*```/) || 
                          videoRecommendationsRaw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : videoRecommendationsRaw;
        parsedRecommendations = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.warn('Failed to parse Lens response, using empty recommendations');
        parsedRecommendations = { recommended_videos: [] };
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'lens', true, duration);
      await saveArtifact(queueId, 'lens', parsedRecommendations);

      return {
        success: true,
        data: parsedRecommendations,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'lens', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 8: Pixel (Image Generation)
multimediaWorkflow.step('pixel', {
  retries: 1,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { canvas, queueId } = data;
    
    console.log(`[Pixel] Generating images`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [8, queueId]
      );

      // Check if we have image prompts
      if (!canvas.image_prompts || canvas.image_prompts.length === 0) {
        console.warn('[Pixel] No image prompts provided, skipping image generation');
        return {
          success: true,
          data: {
            generated_images: [],
            image_data: []
          },
          duration: Date.now() - startTime
        };
      }

      // Extract prompts from Canvas directives
      const prompts = canvas.image_prompts.map((img: any) => img.prompt);

      // Generate images (will skip if no API key)
      let generatedImages: any[] = [];
      try {
        generatedImages = await generateArticleImages(prompts, 'runware');
      } catch (imgError) {
        console.warn('[Pixel] Image generation failed, continuing without images:', imgError);
      }

      // Prepare image data with alt text
      const imageData = generatedImages.map((img, index) => ({
        path: img?.localPath || '',
        url: img?.url || '',
        altText: canvas.image_prompts[index]?.alt_text || 'Article image',
        caption: canvas.image_prompts[index]?.caption || '',
        placement: canvas.image_prompts[index]?.section_placement || ''
      }));

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'pixel', true, duration);
      await saveArtifact(queueId, 'pixel', {
        generated_images: generatedImages,
        image_data: imageData
      });

      return {
        success: true,
        data: {
          generated_images: generatedImages,
          image_data: imageData
        },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'pixel', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 9: Mosaic (HTML Assembly)
multimediaWorkflow.step('mosaic', {
  retries: 2,
  retryDelay: 2000,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { canvas, lens, pixel, queueId, finalContent, contentOutline } = data;
    
    console.log(`[Mosaic] Assembling HTML`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [9, queueId]
      );

      // Prepare context for Mosaic
      const context = JSON.stringify({
        article_content: finalContent,
        content_outline: contentOutline,
        image_data: pixel?.image_data || [],
        video_recommendations: lens?.recommended_videos || [],
        seo_requirements: contentOutline?.schema_markup || {}
      });

      // Execute Mosaic agent
      const htmlAssemblyRaw = await runMinimax('08_mosaic_frontend_dev.md', context);
      
      // Parse JSON response
      let parsedHtml;
      try {
        const jsonMatch = htmlAssemblyRaw.match(/```json\s*([\s\S]*?)\s*```/) || 
                          htmlAssemblyRaw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : htmlAssemblyRaw;
        parsedHtml = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.warn('Failed to parse Mosaic response, using raw content');
        // If JSON parsing fails, use the markdown content directly
        parsedHtml = {
          html_content: finalContent,
          raw_output: htmlAssemblyRaw
        };
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'mosaic', true, duration);
      await saveArtifact(queueId, 'mosaic', parsedHtml);

      return {
        success: true,
        data: parsedHtml,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'mosaic', false, duration, 0, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});

// Step 10: Deployer (WordPress Publishing)
multimediaWorkflow.step('deployer', {
  retries: 2,
  retryDelay: 3000,
  handler: async (data: any): Promise<StepResult> => {
    const startTime = Date.now();
    const { mosaic, pixel, queueId, tenantId, contentOutline } = data;
    
    console.log(`[Deployer] Publishing to WordPress`);

    try {
      // Update queue status
      await db.query(
        'UPDATE content_queue SET current_step = $1 WHERE id = $2',
        [10, queueId]
      );

      // Get tenant WordPress credentials
      const tenant = await db.queryOne(
        'SELECT wp_credentials, business_name FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (!tenant || !tenant.wp_credentials) {
        console.warn('[Deployer] No WordPress credentials found, skipping deployment');
        
        // Mark as complete without publishing
        await db.query(
          'UPDATE content_queue SET status = $1, current_step = $2 WHERE id = $3',
          ['draft_ready', 11, queueId]
        );

        return {
          success: true,
          data: {
            deployed: false,
            reason: 'No WordPress credentials configured',
            htmlContent: mosaic?.html_content || mosaic?.raw_output
          },
          duration: Date.now() - startTime
        };
      }

      let wpCredentials;
      try {
        wpCredentials = JSON.parse(tenant.wp_credentials);
      } catch (e) {
        throw new Error('Invalid WordPress credentials format');
      }

      // Prepare article data for deployment
      const articleData = {
        title: contentOutline?.seo_title || contentOutline?.meta_title || 'Untitled Article',
        content: mosaic?.html_content || mosaic?.raw_output || '',
        images: pixel?.image_data || [],
        categories: ['Blog'],
        tags: contentOutline?.lsi_keywords || [],
        seoTitle: contentOutline?.meta_title,
        seoDescription: contentOutline?.meta_description
      };

      // Deploy to WordPress
      const deploymentResult = await deployArticle(wpCredentials, articleData);

      if (deploymentResult.success) {
        // Update queue with published URL
        await db.query(
          'UPDATE content_queue SET status = $1, published_url = $2, current_step = $3 WHERE id = $4',
          ['complete', deploymentResult.postUrl, 11, queueId]
        );
      } else {
        throw new Error(deploymentResult.error || 'Deployment failed');
      }

      const duration = Date.now() - startTime;
      await logAgentExecution(queueId, 'deployer', true, duration);
      await saveArtifact(queueId, 'deployer', deploymentResult);

      return {
        success: true,
        data: deploymentResult,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logAgentExecution(queueId, 'deployer', false, duration, 0, errorMessage);
      
      // Mark as failed
      await db.query(
        'UPDATE content_queue SET status = $1 WHERE id = $2',
        ['failed', queueId]
      );
      
      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }
});
