/**
 * @module src/domains/scraping/services/scrape-queue.service.ts
 * @description
 * Service for managing the job scraping queue in the D1 database.
 */

// ... (imports and existing service methods)

export class ScrapeQueueService {
  // ... (constructor, enqueue, claimPending, processIntake)

  /**
   * Records the details of a scraped job and updates the queue status.
   */
  async recordScrapedJob(details: any): Promise<any> {
    const { queueId, status, errorMessage } = details;

    // Simplified logic from handleScrapedJobDetailsPost
    const { meta } = await this.env.DB.prepare(
      `INSERT INTO scraped_job_details (queue_id, job_url, source, company, title, raw_payload)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      queueId,
      details.job_url,
      details.source,
      details.company,
      details.title,
      JSON.stringify(details)
    ).run();

    const insertedId = meta.last_row_id;

    if (queueId) {
      const nextStatus = (status === 'failed' || status === 'error') ? 'failed' : 'completed';
      await this.env.DB.prepare(
        `UPDATE scrape_queue SET status = ?, error_message = ? WHERE id = ?`
      ).bind(nextStatus, errorMessage, queueId).run();
    }

    return await this.env.DB.prepare("SELECT * FROM scraped_job_details WHERE id = ?").bind(insertedId).first();
  }

  async submitUrlsForScraping(submission: {
    urls: string[];
    source: string;
    source_id?: string;
    metadata?: any;
  }): Promise<any> {
    const { urls, source, source_id, metadata } = submission;
    let processedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const url of urls) {
      try {
        await this.enqueue({
          job_url: url,
          source,
          source_id,
          metadata: JSON.stringify(metadata),
        });
        processedCount++;
        results.push({ url, status: 'success' });
      } catch (error) {
        failedCount++;
        results.push({ url, status: 'failed', error: error.message });
      }
    }

    return {
      success: failedCount === 0,
      processed_count: processedCount,
      failed_count: failedCount,
      results,
    };
  }
}
