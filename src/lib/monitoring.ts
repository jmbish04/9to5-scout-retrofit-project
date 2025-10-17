/**
 * Daily job monitoring functionality.
 * Monitors all active jobs for changes and updates tracking history.
 */

import { getJobsForMonitoring, updateJobStatus, createJobTrackingHistory, createSnapshot, saveJobMarketStats } from './storage';
import { crawlJobWithSnapshot } from './crawl';
import type { Job, DailyMonitoringResult, JobTrackingHistory } from './types';

export interface MonitoringEnv {
  DB: any;
  R2: any;
  AI: any;
  MYBROWSER?: any;
  BROWSER?: any;
  VECTORIZE_INDEX: any;
  BROWSER_RENDERING_TOKEN: string;
}

/**
 * Run daily monitoring for all active jobs.
 * This function should be called by the scheduled worker.
 */
export async function runDailyJobMonitoring(env: MonitoringEnv): Promise<DailyMonitoringResult> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const startTime = new Date();
  
  console.log(`Starting daily job monitoring for ${today}`);
  
  const result: DailyMonitoringResult = {
    date: today,
    jobs_checked: 0,
    jobs_modified: 0,
    jobs_closed: 0,
    errors: 0,
    snapshots_created: 0,
    pdfs_generated: 0,
    markdown_extracts: 0,
  };

  try {
    // Get all jobs that need monitoring
    const jobsToMonitor = await getJobsForMonitoring(env);
    console.log(`Found ${jobsToMonitor.length} jobs to monitor`);
    
    result.jobs_checked = jobsToMonitor.length;

    // Process jobs in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < jobsToMonitor.length; i += batchSize) {
      const batch = jobsToMonitor.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(job => monitorSingleJob(env, job, today));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Aggregate results
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const jobResult = promiseResult.value;
          if (jobResult.modified) result.jobs_modified++;
          if (jobResult.closed) result.jobs_closed++;
          if (jobResult.snapshotCreated) result.snapshots_created++;
          if (jobResult.pdfGenerated) result.pdfs_generated++;
          if (jobResult.markdownExtracted) result.markdown_extracts++;
        } else {
          result.errors++;
          console.error('Job monitoring error:', promiseResult.reason);
        }
      }
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < jobsToMonitor.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Generate daily market statistics
    await generateDailyMarketStats(env, today, result);
    
    console.log(`Daily monitoring completed. Results:`, result);
    return result;
    
  } catch (error) {
    console.error('Error in daily job monitoring:', error);
    result.errors++;
    return result;
  }
}

/**
 * Monitor a single job for changes.
 */
async function monitorSingleJob(env: MonitoringEnv, job: Job, trackingDate: string): Promise<{
  modified: boolean;
  closed: boolean;
  snapshotCreated: boolean;
  pdfGenerated: boolean;
  markdownExtracted: boolean;
}> {
  const jobResult = {
    modified: false,
    closed: false,
    snapshotCreated: false,
    pdfGenerated: false,
    markdownExtracted: false,
  };

  try {
    console.log(`Monitoring job: ${job.title} at ${job.company}`);
    
    // Get the latest snapshot for comparison
    const latestSnapshot = await env.DB.prepare(`
      SELECT * FROM snapshots 
      WHERE job_id = ? 
      ORDER BY fetched_at DESC 
      LIMIT 1
    `).bind(job.id).first();

    // Crawl the job with full snapshot creation
    const { job: updatedJob, snapshotId } = await crawlJobWithSnapshot(env, job.url!, job.site_id);
    
    if (!updatedJob) {
      // Job is likely closed or inaccessible
      await updateJobStatus(env, job.id!, 'closed', true);
      await createJobTrackingHistory(env, {
        job_id: job.id!,
        tracking_date: trackingDate,
        status: 'closed',
        error_message: 'Job page not accessible',
      });
      jobResult.closed = true;
      return jobResult;
    }

    if (snapshotId) {
      jobResult.snapshotCreated = true;
      jobResult.pdfGenerated = true; // Assuming PDF was generated in crawlJobWithSnapshot
      jobResult.markdownExtracted = true; // Assuming markdown was extracted
    }

    // Compare with previous snapshot to detect changes
    let hasChanges = false;
    let titleChanged = false;
    let requirementsChanged = false;
    let salaryChanged = false;
    let descriptionChanged = false;

    if (latestSnapshot) {
      // Get current snapshot for comparison
      const currentSnapshot = await env.DB.prepare(`
        SELECT * FROM snapshots WHERE id = ?
      `).bind(snapshotId).first();

      if (currentSnapshot && latestSnapshot.content_hash !== currentSnapshot.content_hash) {
        hasChanges = true;
        jobResult.modified = true;

        // Detailed change detection
        titleChanged = job.title !== updatedJob.title;
        requirementsChanged = job.requirements_md !== updatedJob.requirements_md;
        salaryChanged = job.salary_min !== updatedJob.salary_min || job.salary_max !== updatedJob.salary_max;
        descriptionChanged = job.description_md !== updatedJob.description_md;

        console.log(`Detected changes in job ${job.id}: title=${titleChanged}, requirements=${requirementsChanged}, salary=${salaryChanged}, description=${descriptionChanged}`);
      }
    } else {
      // First time monitoring this job
      hasChanges = true;
    }

    // Create tracking history entry
    await createJobTrackingHistory(env, {
      job_id: job.id!,
      snapshot_id: snapshotId,
      tracking_date: trackingDate,
      status: hasChanges ? 'modified' : 'open',
      content_hash: (await env.DB.prepare('SELECT content_hash FROM snapshots WHERE id = ?').bind(snapshotId).first())?.content_hash,
      title_changed: titleChanged,
      requirements_changed: requirementsChanged,
      salary_changed: salaryChanged,
      description_changed: descriptionChanged,
    });

    // Update job status
    await updateJobStatus(env, job.id!, 'open');

    return jobResult;
    
  } catch (error) {
    console.error(`Error monitoring job ${job.id}:`, error);
    
    // Record error in tracking history
    await createJobTrackingHistory(env, {
      job_id: job.id!,
      tracking_date: trackingDate,
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

/**
 * Generate daily market statistics based on monitoring results.
 */
async function generateDailyMarketStats(env: MonitoringEnv, date: string, monitoringResult: DailyMonitoringResult): Promise<void> {
  try {
    console.log('Generating daily market statistics...');
    
    // Get total job counts
    const totalJobs = await env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first();
    const openJobs = await env.DB.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = "open"').first();
    
    // Get new jobs found today
    const newJobsToday = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE date(first_seen_at) = ?
    `).bind(date).first();

    // Calculate average job duration
    const avgDuration = await env.DB.prepare(`
      SELECT AVG(julianday(closure_detected_at) - julianday(first_seen_at)) as avg_days
      FROM jobs 
      WHERE closure_detected_at IS NOT NULL
    `).first();

    // Get top companies by job count
    const topCompanies = await env.DB.prepare(`
      SELECT company, COUNT(*) as job_count
      FROM jobs 
      WHERE status = 'open' AND company IS NOT NULL
      GROUP BY company
      ORDER BY job_count DESC
      LIMIT 10
    `).all();

    // Get trending keywords from job titles and descriptions
    const trendingKeywords = await env.DB.prepare(`
      SELECT title FROM jobs 
      WHERE date(first_seen_at) >= date(?, '-7 days')
      AND title IS NOT NULL
    `).bind(date).all();

    // Simple keyword extraction (could be enhanced with AI)
    const keywordCounts: Record<string, number> = {};
    trendingKeywords.results?.forEach((job: any) => {
      const words = job.title.toLowerCase().match(/\b\w{3,}\b/g) || [];
      words.forEach(word => {
        if (!['the', 'and', 'for', 'with', 'job', 'position', 'role'].includes(word)) {
          keywordCounts[word] = (keywordCounts[word] || 0) + 1;
        }
      });
    });

    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ keyword: word, count }));

    // Get salary statistics
    const salaryStats = await env.DB.prepare(`
      SELECT 
        AVG(salary_min) as avg_min,
        AVG(salary_max) as avg_max,
        MIN(salary_min) as min_salary,
        MAX(salary_max) as max_salary,
        COUNT(*) as salary_count
      FROM jobs 
      WHERE status = 'open' AND salary_min IS NOT NULL AND salary_max IS NOT NULL
    `).first();

    // Get location statistics
    const locationStats = await env.DB.prepare(`
      SELECT location, COUNT(*) as job_count
      FROM jobs 
      WHERE status = 'open' AND location IS NOT NULL
      GROUP BY location
      ORDER BY job_count DESC
      LIMIT 20
    `).all();

    // Save market statistics
    await saveJobMarketStats(env, date, {
      total_jobs_tracked: totalJobs?.count || 0,
      new_jobs_found: newJobsToday?.count || 0,
      jobs_closed: monitoringResult.jobs_closed,
      jobs_modified: monitoringResult.jobs_modified,
      avg_job_duration_days: avgDuration?.avg_days || null,
      top_companies: topCompanies.results || [],
      trending_keywords: topKeywords,
      salary_stats: salaryStats || {},
      location_stats: locationStats.results || [],
    });
    
    console.log('Daily market statistics generated successfully');
    
  } catch (error) {
    console.error('Error generating daily market statistics:', error);
  }
}

/**
 * Get comprehensive job tracking data for a specific job.
 */
export async function getJobTrackingTimeline(env: MonitoringEnv, jobId: string): Promise<{
  job: any;
  timeline: any[];
  snapshots: any[];
  changes: any[];
}> {
  try {
    // Get job details
    const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Get tracking timeline
    const timeline = await env.DB.prepare(`
      SELECT 
        jth.*,
        s.html_r2_key,
        s.pdf_r2_key,
        s.markdown_r2_key,
        s.screenshot_r2_key,
        s.fetched_at as snapshot_fetched_at
      FROM job_tracking_history jth
      LEFT JOIN snapshots s ON jth.snapshot_id = s.id
      WHERE jth.job_id = ?
      ORDER BY jth.tracking_date DESC, jth.created_at DESC
    `).bind(jobId).all();

    // Get all snapshots
    const snapshots = await env.DB.prepare(`
      SELECT * FROM snapshots 
      WHERE job_id = ?
      ORDER BY fetched_at DESC
    `).bind(jobId).all();

    // Get all changes
    const changes = await env.DB.prepare(`
      SELECT c.*, 
        fs.fetched_at as from_snapshot_date,
        ts.fetched_at as to_snapshot_date
      FROM changes c
      LEFT JOIN snapshots fs ON c.from_snapshot_id = fs.id
      LEFT JOIN snapshots ts ON c.to_snapshot_id = ts.id
      WHERE c.job_id = ?
      ORDER BY c.changed_at DESC
    `).bind(jobId).all();

    return {
      job,
      timeline: timeline.results || [],
      snapshots: snapshots.results || [],
      changes: changes.results || [],
    };
    
  } catch (error) {
    console.error('Error getting job tracking timeline:', error);
    throw error;
  }
}