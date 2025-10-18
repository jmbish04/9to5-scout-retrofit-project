/**
 * Job processing API endpoints
 * Provides endpoints for submitting job URLs and checking processing status
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { 
  submitJobUrlsForProcessing, 
  getJobQueueEntries 
} from '../services/job-processing.service';
import type { Env } from '../../../config/env';

const jobProcessing = new Hono<{ Bindings: Env }>();

// Validation schemas
const JobProcessingSubmitSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one URL is required'),
  source: z.string().optional().default('api'),
  source_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const JobProcessingStatusSchema = z.object({
  source: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// POST /job-processing/submit - Submit job URLs for processing
jobProcessing.post('/submit', zValidator('json', JobProcessingSubmitSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    
    console.log(`🚀 Submitting ${data.urls.length} job URLs from ${data.source}...`);

    const result = await submitJobUrlsForProcessing(c.env, data);

    return c.json({
      success: result.success,
      processed_count: result.processed_count,
      failed_count: result.failed_count,
      results: result.results,
    });
  } catch (error) {
    console.error('Error submitting job URLs for processing:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to submit job URLs for processing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /job-processing/status - Get processing status
jobProcessing.get('/status', zValidator('query', JobProcessingStatusSchema), async (c) => {
  try {
    const { source, status, limit } = c.req.valid('query');
    
    const entries = await getJobQueueEntries(c.env, {
      source,
      status,
      limit,
    });

    return c.json({
      success: true,
      entries,
      total: entries.length,
    });
  } catch (error) {
    console.error('Error fetching job processing status:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch processing status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /job-processing/queue - Get job queue entries (alias for status)
jobProcessing.get('/queue', zValidator('query', JobProcessingStatusSchema), async (c) => {
  try {
    const { source, status, limit } = c.req.valid('query');
    
    const entries = await getJobQueueEntries(c.env, {
      source,
      status,
      limit,
    });

    return c.json({
      success: true,
      entries,
      total: entries.length,
    });
  } catch (error) {
    console.error('Error fetching job queue:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch job queue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// GET /job-processing/stats - Get processing statistics
jobProcessing.get('/stats', async (c) => {
  try {
    const allEntries = await getJobQueueEntries(c.env, { limit: 1000 });
    
    const stats = {
      total: allEntries.length,
      pending: allEntries.filter(e => e.status === 'pending').length,
      processing: allEntries.filter(e => e.status === 'processing').length,
      completed: allEntries.filter(e => e.status === 'completed').length,
      failed: allEntries.filter(e => e.status === 'failed').length,
      by_source: allEntries.reduce((acc, entry) => {
        acc[entry.source] = (acc[entry.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return c.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching processing stats:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch processing stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default jobProcessing;
