/**
 * Email types and interfaces - Consolidated
 * Contains all email-related type definitions for the 9to5-scout system
 */

// ============================================================================
// BASIC EMAIL TYPES
// ============================================================================

// Basic email message structure
export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  raw?: string;
  headers: Record<string, string>;
}

// Centralized email log entry (consolidated from email_logs and enhanced_email_logs)
export interface EmailLogEntry {
  // Primary key and identification
  id: number;
  uuid: string;

  // Basic email information
  from_email: string;
  to_email?: string;
  subject?: string;
  message_id?: string;
  date_received?: string;

  // Email content
  content_text?: string;
  content_html?: string;
  content_preview?: string;
  headers?: string; // JSON string of all headers

  // Job processing tracking
  job_links_extracted: number;
  jobs_processed: number;

  // AI classification fields
  ai_from?: string;
  ai_subject?: string;
  ai_body?: string;
  ai_category?:
    | "SPAM"
    | "JOB_ALERT"
    | "MESSAGE"
    | "RECRUITER"
    | "NETWORKING"
    | "MARKETING_SPAM"
    | "OTP"
    | "SYSTEM"
    | "UNKNOWN";
  ai_category_reasoning?: string;
  ai_job_links?: string; // JSON array of extracted job URLs
  ai_processed_at?: string;
  ai_processing_status?: "pending" | "processing" | "completed" | "failed";

  // Embeddings and semantic search
  embeddings_id?: string; // UUID for embeddings storage
  embeddings_vector?: string; // JSON array of embedding values for semantic search

  // OTP detection and forwarding
  otp_detected: boolean;
  otp_code?: string;
  otp_forwarded_to?: string;

  // Status and timestamps
  status: string;
  received_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// Job information extracted from emails
export interface ExtractedJobInfo {
  url: string;
  title?: string;
  company?: string;
  location?: string;
}

// Email configuration for insights
export interface EmailConfig {
  recipient_email: string;
  frequency_hours: number;
  include_new_jobs: boolean;
  include_job_changes: boolean;
  include_statistics: boolean;
}

// Email insights data structure
export interface EmailInsights {
  newJobs: Array<{
    title: string;
    company: string;
    location: string;
    url: string;
    posted_at: string;
  }>;
  jobChanges: Array<{
    title: string;
    company: string;
    url: string;
    change_summary: string;
  }>;
  statistics: {
    totalJobs: number;
    newJobsLastPeriod: number;
    roleStats: Array<{
      role: string;
      count: number;
      avgMinSalary: number | null;
      avgMaxSalary: number | null;
    }>;
  };
}

// ============================================================================
// ENHANCED EMAIL TYPES
// ============================================================================

// Enhanced email message with additional metadata
export interface EnhancedEmailMessage {
  id?: number;
  uuid?: string;
  from: string;
  to: string;
  subject: string;
  messageId: string;
  dateReceived: string;
  contentText?: string;
  contentHtml?: string;
  contentPreview?: string;
  headers: Record<string, string>;
  jobLinksExtracted?: number;
  jobsProcessed?: number;
  embeddingsId?: string;
  otpDetected?: boolean;
  otpCode?: string;
  otpForwardedTo?: string;
  status: "pending" | "processing" | "processed" | "failed";
  receivedAt?: string;
  processedAt?: string;
  ai_classification?: string;
  html_preview_url?: string;
  pdf_preview_url?: string;
}

// Email embedding data
export interface EmailEmbedding {
  id?: number;
  emailUuid: string;
  contentType: "subject" | "body" | "full";
  content: string;
  embedding: number[];
  createdAt?: string;
}

// OTP forwarding log
export interface OTPForwardingLog {
  id?: number;
  emailUuid: string;
  otpCode: string;
  forwardedTo: string;
  forwardedAt?: string;
  status: "sent" | "failed";
}

// Email template structure
export interface EmailTemplate {
  id?: number;
  name: string;
  subjectTemplate: string;
  htmlTemplate: string;
  variables?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// AI extraction result
export interface EmailAIExtraction {
  from: string;
  to: string;
  subject: string;
  messageId: string;
  dateReceived: string;
  contentText: string;
  contentHtml: string;
  contentPreview: string;
  classification:
    | "job_alert"
    | "announcement"
    | "otp"
    | "spam"
    | "personal"
    | "other";
  otpDetected: boolean;
  otpCode?: string;
  otpService?: string;
  jobLinks: string[];
  headers: Record<string, string>;
}

// ============================================================================
// AI CLASSIFICATION TYPES
// ============================================================================

// AI-powered email classification result
export interface AIEmailClassification {
  from: string;
  subject: string;
  body: string;
  category:
    | "SPAM"
    | "JOB_ALERT"
    | "MESSAGE"
    | "RECRUITER"
    | "NETWORKING"
    | "MARKETING_SPAM"
    | "OTP"
    | "SYSTEM"
    | "UNKNOWN";
  category_reasoning: string;
  job_links: string[];
}

// Email job link for processing
export interface EmailJobLink {
  email_id: number;
  job_url: string;
  status: "pending" | "processing" | "completed" | "failed";
  job_id?: string;
  processing_error?: string;
}
