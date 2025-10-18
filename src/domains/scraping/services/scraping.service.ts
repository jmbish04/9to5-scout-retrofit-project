/**
 * @file Core Scraping Service
 *
 * This file provides the core scraping functionality for the 9to5-Scout platform.
 * It handles web crawling, job extraction, browser automation, and scraping orchestration.
 *
 * Key Features:
 * - Multi-strategy URL discovery (sitemap, crawling, search)
 * - Browser automation with Playwright
 * - AI-powered job extraction
 * - Rate limiting and error handling
 * - Progress tracking and monitoring
 *
 * @author 9to5-Scout Development Team
 * @since 1.0.0
 */

import { chromium } from "@cloudflare/playwright";
import { z } from "zod";
import type { Env } from "../../../config/env";
import { ScrapingJobSchema } from "../models/scraping.schema";
import type {
  BrowserOptions,
  ExtractedJob,
  JobSiteCredentials,
  ScrapingConfig,
  ScrapingJob,
  ScrapingProgress,
  ScrapingResults,
  ValidationResult,
} from "../types/scraping.types";
import { ScrapingStatus } from "../types/scraping.types";

/**
 * Core scraping service class
 */
export class ScrapingService {
  private env: Env;
  private activeJobs: Map<string, ScrapingJob> = new Map();
  private progressCallbacks: Map<string, (progress: ScrapingProgress) => void> =
    new Map();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create a new scraping job
   */
  async createJob(
    siteId: string,
    urls: string[],
    config: ScrapingConfig,
    credentials?: JobSiteCredentials
  ): Promise<ScrapingJob> {
    const job: ScrapingJob = {
      id: crypto.randomUUID(),
      siteId,
      urls,
      config,
      credentials,
      status: ScrapingStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    // Validate the job configuration
    const validation = this.validateJob(job);
    if (!validation.valid) {
      throw new Error(
        `Invalid job configuration: ${validation.errors.join(", ")}`
      );
    }

    this.activeJobs.set(job.id, job);
    return job;
  }

  /**
   * Start a scraping job
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== ScrapingStatus.PENDING) {
      throw new Error(`Job ${jobId} is not in pending status`);
    }

    job.status = ScrapingStatus.RUNNING;
    job.startedAt = new Date().toISOString();

    try {
      const results = await this.executeScrapingJob(job);
      job.results = results;
      job.status = ScrapingStatus.COMPLETED;
      job.completedAt = new Date().toISOString();
    } catch (error) {
      job.status = ScrapingStatus.FAILED;
      job.error = error instanceof Error ? error.message : "Unknown error";
      job.completedAt = new Date().toISOString();
      throw error;
    }
  }

  /**
   * Execute a scraping job
   */
  private async executeScrapingJob(job: ScrapingJob): Promise<ScrapingResults> {
    const startTime = Date.now();
    const results: ScrapingResults = {
      totalUrls: job.urls.length,
      successful: 0,
      failed: 0,
      jobs: [],
      errors: [],
      metadata: {
        startTime: new Date().toISOString(),
        endTime: "",
        duration: 0,
        totalSize: 0,
        averageResponseTime: 0,
        userAgent: job.config.userAgent || "9to5-Scout/1.0",
      },
    };

    const browser = await this.launchBrowser(job.config);
    const page = await browser.newPage();

    try {
      for (let i = 0; i < job.urls.length; i++) {
        const url = job.urls[i];

        try {
          // Update progress
          this.updateProgress(job.id, {
            jobId: job.id,
            current: i + 1,
            total: job.urls.length,
            percentage: Math.round(((i + 1) / job.urls.length) * 100),
            currentUrl: url || "",
            status: ScrapingStatus.RUNNING,
            errors: results.errors,
          });

          // Scrape the URL
          const extractedJobs = await this.scrapeUrl(
            page,
            url || "",
            job.config,
            job.credentials
          );
          results.jobs.push(...extractedJobs);
          results.successful++;

          // Rate limiting
          if (job.config.delay > 0) {
            await this.delay(job.config.delay);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            url: url || "",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            retryCount: 0,
            type: "unknown",
          });
        }
      }
    } finally {
      await browser.close();
    }

    // Update metadata
    const endTime = Date.now();
    results.metadata.endTime = new Date().toISOString();
    results.metadata.duration = endTime - startTime;
    results.metadata.totalSize = results.jobs.reduce(
      (sum, job) => sum + job.description.length,
      0
    );
    results.metadata.averageResponseTime =
      results.metadata.duration / results.totalUrls;

    return results;
  }

  /**
   * Scrape a single URL
   */
  private async scrapeUrl(
    page: any,
    url: string,
    config: ScrapingConfig,
    credentials?: JobSiteCredentials
  ): Promise<ExtractedJob[]> {
    try {
      // Navigate to the URL
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: config.timeout,
      });

      // Wait for specific selector if configured
      if (config.waitForSelector) {
        await page.waitForSelector(config.waitForSelector, {
          timeout: config.waitForTimeout || 10000,
        });
      }

      // Scroll to bottom if configured
      if (config.scrollToBottom) {
        await page.evaluate(() => {
          // Scroll to bottom of page
          const doc = (globalThis as any).document;
          const win = (globalThis as any).window;
          if (doc && win) {
            const scrollHeight = Math.max(
              doc.body.scrollHeight,
              doc.body.offsetHeight,
              doc.documentElement.clientHeight,
              doc.documentElement.scrollHeight,
              doc.documentElement.offsetHeight
            );
            win.scrollTo(0, scrollHeight);
          }
        });
      }

      // Take screenshot if configured
      if (config.screenshot) {
        const screenshot = await page.screenshot({ fullPage: true });
        // Save screenshot to R2
        await this.saveScreenshot(url, screenshot);
      }

      // Generate PDF if configured
      if (config.pdf) {
        const pdf = await page.pdf({ format: "A4" });
        // Save PDF to R2
        await this.savePDF(url, pdf);
      }

      // Extract job data using AI
      const content = await page.content();
      const extractedJobs = await this.extractJobsWithAI(content, url);

      return extractedJobs;
    } catch (error) {
      throw new Error(
        `Failed to scrape ${url}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract jobs using AI
   */
  private async extractJobsWithAI(
    content: string,
    url: string
  ): Promise<ExtractedJob[]> {
    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_WEB_BROWSER as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content: `You are a job extraction AI. Extract job postings from the provided HTML content. 
              Return a JSON array of job objects with the following structure:
              {
                "title": "Job Title",
                "company": "Company Name", 
                "location": "Location",
                "salary": "Salary Range (optional)",
                "description": "Job Description",
                "requirements": "Requirements (optional)",
                "postedAt": "Posted Date (optional)",
                "confidence": 0.95
              }`,
            },
            {
              role: "user",
              content: `Extract job postings from this HTML content:\n\n${content}`,
            },
          ],
        }
      );

      const extractedData = response.choices?.[0]?.message?.content;
      if (!extractedData) {
        return [];
      }

      const jobs = JSON.parse(extractedData);
      if (!Array.isArray(jobs)) {
        return [];
      }

      return jobs.map((job: any) => ({
        id: crypto.randomUUID(),
        url,
        title: job.title || "",
        company: job.company || "",
        location: job.location || "",
        salary: job.salary,
        description: job.description || "",
        requirements: job.requirements,
        postedAt: job.postedAt,
        scrapedAt: new Date().toISOString(),
        source: new URL(url).hostname,
        confidence: job.confidence || 0.5,
        rawData: job,
      }));
    } catch (error) {
      console.error("AI extraction failed:", error);
      return [];
    }
  }

  /**
   * Launch browser with configuration
   */
  private async launchBrowser(config: ScrapingConfig): Promise<any> {
    const browserOptions: BrowserOptions = {
      headless: true,
      viewport: { width: 1920, height: 1080 },
      timeout: config.timeout,
      userAgent: config.userAgent,
      scrollToBottom: config.scrollToBottom,
      screenshot: config.screenshot,
      pdf: config.pdf,
    };

    return await chromium.launch(this.env.MYBROWSER);
  }

  /**
   * Save screenshot to R2
   */
  private async saveScreenshot(url: string, screenshot: Buffer): Promise<void> {
    const key = `screenshots/${new URL(url).hostname}/${Date.now()}.png`;
    await this.env.R2.put(key, screenshot, {
      httpMetadata: { contentType: "image/png" },
    });
  }

  /**
   * Save PDF to R2
   */
  private async savePDF(url: string, pdf: Buffer): Promise<void> {
    const key = `pdfs/${new URL(url).hostname}/${Date.now()}.pdf`;
    await this.env.R2.put(key, pdf, {
      httpMetadata: { contentType: "application/pdf" },
    });
  }

  /**
   * Update job progress
   */
  private updateProgress(jobId: string, progress: ScrapingProgress): void {
    const callback = this.progressCallbacks.get(jobId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Register progress callback
   */
  onProgress(
    jobId: string,
    callback: (progress: ScrapingProgress) => void
  ): void {
    this.progressCallbacks.set(jobId, callback);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): ScrapingJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getAllJobs(): ScrapingJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === ScrapingStatus.RUNNING) {
      job.status = ScrapingStatus.CANCELLED;
      job.completedAt = new Date().toISOString();
    }
  }

  /**
   * Pause a job
   */
  async pauseJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === ScrapingStatus.RUNNING) {
      job.status = ScrapingStatus.PAUSED;
    }
  }

  /**
   * Resume a job
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === ScrapingStatus.PAUSED) {
      job.status = ScrapingStatus.RUNNING;
    }
  }

  /**
   * Validate job configuration
   */
  private validateJob(job: ScrapingJob): ValidationResult {
    try {
      ScrapingJobSchema.parse(job);
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          ),
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: ["Unknown validation error"],
        warnings: [],
      };
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up completed jobs
   */
  cleanup(): void {
    const completedJobs = Array.from(this.activeJobs.entries())
      .filter(([, job]) =>
        [
          ScrapingStatus.COMPLETED,
          ScrapingStatus.FAILED,
          ScrapingStatus.CANCELLED,
        ].includes(job.status)
      )
      .map(([id]) => id);

    completedJobs.forEach((id) => {
      this.activeJobs.delete(id);
      this.progressCallbacks.delete(id);
    });
  }
}

/**
 * Factory function to create scraping service
 */
export function createScrapingService(env: Env): ScrapingService {
  return new ScrapingService(env);
}
