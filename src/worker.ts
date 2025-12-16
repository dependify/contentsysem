/**
 * ContentSys BullMQ Worker
 * Processes content generation jobs from the queue
 */

import { Worker, Queue } from 'bullmq';
import { contentWorkflow } from './workflows/content_engine';
import { multimediaWorkflow } from './workflows/multimedia_workflow';
import { db } from './execution/db_client';
import * as dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
const redisConfig = {
  connection: {
    host: '20.14.88.69',
    port: 6379,
    password: 'VyJ3asGrXipJka4aKcvk1vsYKZ8JJTrDEaXerj9BTbr7P7PL9AYZPKtYCNtxcId2',
    tls: {}
  }
};

// Create the content generation queue
export const contentQueue = new Queue('ContentSysQueue', redisConfig);

// Main content generation worker
const contentWorker = new Worker('ContentSysQueue', async (job) => {
  const { tenantId, blogTitle, queueId } = job.data;
  
  console.log(`[Worker] Processing job ${job.id}: ${blogTitle}`);
  
  try {
    // Update queue status to processing
    await db.query(
      "UPDATE content_queue SET status='processing', current_step=0 WHERE id=$1", 
      [queueId]
    );

    // Execute the main content workflow
    console.log('[Worker] Starting content generation workflow...');
    
    const contentResult = await contentWorkflow.execute({
      tenantId,
      title: blogTitle,
      queueId
    });

    if (!contentResult.success) {
      throw new Error(`Content workflow failed: ${contentResult.error}`);
    }

    // Execute multimedia and deployment workflow
    console.log('[Worker] Starting multimedia workflow...');
    
    const multimediaResult = await multimediaWorkflow.execute({
      queueId,
      tenantId,
      finalContent: contentResult.data.prism.final_draft,
      contentOutline: contentResult.data.vertex
    });

    if (!multimediaResult.success) {
      throw new Error(`Multimedia workflow failed: ${multimediaResult.error}`);
    }

    // Final success update
    await db.query(
      "UPDATE content_queue SET status='complete', published_url=$1 WHERE id=$2",
      [multimediaResult.data.deployer.postUrl, queueId]
    );

    console.log(`[Worker] Job ${job.id} completed successfully`);
    
    return {
      success: true,
      publishedUrl: multimediaResult.data.deployer.postUrl,
      contentResult,
      multimediaResult
    };

  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error);
    
    // Update queue status to failed
    await db.query(
      "UPDATE content_queue SET status='failed' WHERE id=$1", 
      [queueId]
    );
    
    throw error;
  }
}, redisConfig);

// Worker event handlers
contentWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed:`, result.publishedUrl);
});

contentWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

contentWorker.on('progress', (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down gracefully...');
  await contentWorker.close();
  await db.close();
  process.exit(0);
});

console.log('[Worker] ContentSys worker started and listening for jobs...');

export { contentWorker };
