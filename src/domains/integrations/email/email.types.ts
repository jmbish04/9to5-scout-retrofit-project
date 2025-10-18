/**
 * @fileoverview Email Integration Types
 *
 * Type definitions for email processing, classification, template generation,
 * and email management functionality.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Email service environment configuration
 */
export interface EmailServiceEnv {
  AI: Ai;
  DB: D1Database;
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
  DEFAULT_MODEL_REASONING: keyof AiModels;
  EMBEDDING_MODEL: keyof AiModels;
}

/**
 * Email parsing result from raw email content
 */
export interface EmailParseResult {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: ArrayBuffer;
  }>;
  headers: Record<string, string>;
  messageId: string;
  date: string;
}

/**
 * Email classification result
 */
export interface EmailClassificationResult {
  category:
    | "job_alert"
    | "application_response"
    | "interview_invite"
    | "rejection"
    | "otp"
    | "other";
  confidence: number;
  reasoning: string;
  job_links: string[];
  otp_codes: string[];
  priority: "low" | "normal" | "high" | "urgent";
  action_required: boolean;
  suggested_actions: string[];
}

/**
 * Email template data for variable substitution
 */
export interface EmailTemplateData {
  recipient_name: string;
  company_name: string;
  job_title: string;
  position: string;
  salary_range?: string;
  location?: string;
  application_deadline?: string;
  interview_date?: string;
  interview_time?: string;
  interview_location?: string;
  contact_person?: string;
  contact_email?: string;
  additional_notes?: string;
  [key: string]: any;
}

/**
 * Email generation result
 */
export interface EmailGenerationResult {
  subject: string;
  body: string;
  html: string;
  template_used: string;
  variables_used: string[];
  word_count: number;
  estimated_read_time: number;
}

/**
 * Email template definition
 */
export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  body: string;
  html: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Email attachment information
 */
export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  r2Key: string;
  r2Url: string;
  created_at: string;
}

/**
 * Email search result
 */
export interface EmailSearchResult {
  id: string;
  from: string;
  to: string;
  subject: string;
  category: string;
  priority: string;
  action_required: boolean;
  created_at: string;
  similarity_score: number;
  snippet: string;
}

/**
 * Email processing job
 */
export interface EmailProcessingJob {
  id: string;
  email_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  retry_count: number;
  max_retries: number;
}

/**
 * Email routing rule
 */
export interface EmailRoutingRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    from_pattern?: string;
    to_pattern?: string;
    subject_pattern?: string;
    body_pattern?: string;
    category?: string;
  };
  actions: {
    forward_to?: string;
    store_in_folder?: string;
    mark_as_read?: boolean;
    add_label?: string;
    delete_email?: boolean;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Email notification settings
 */
export interface EmailNotificationSettings {
  user_id: string;
  job_alerts: boolean;
  interview_invites: boolean;
  application_responses: boolean;
  rejections: boolean;
  otp_codes: boolean;
  priority_emails: boolean;
  digest_frequency: "immediate" | "hourly" | "daily" | "weekly";
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Email analytics data
 */
export interface EmailAnalytics {
  total_emails: number;
  emails_by_category: Record<string, number>;
  emails_by_priority: Record<string, number>;
  action_required_count: number;
  average_response_time_hours: number;
  most_common_senders: Array<{
    email: string;
    count: number;
  }>;
  email_volume_by_day: Array<{
    date: string;
    count: number;
  }>;
  last_updated: string;
}

/**
 * Email processing error
 */
export interface EmailProcessingError {
  id: string;
  email_id: string;
  error_type: "parsing" | "classification" | "storage" | "routing" | "unknown";
  error_message: string;
  error_details?: string;
  stack_trace?: string;
  occurred_at: string;
  resolved: boolean;
  resolved_at?: string;
}

/**
 * Email webhook payload
 */
export interface EmailWebhookPayload {
  event:
    | "email_received"
    | "email_processed"
    | "email_classified"
    | "email_action_taken";
  email_id: string;
  timestamp: string;
  data: {
    from?: string;
    to?: string;
    subject?: string;
    category?: string;
    priority?: string;
    action_required?: boolean;
  };
}

/**
 * Email batch processing result
 */
export interface EmailBatchProcessingResult {
  batch_id: string;
  total_emails: number;
  processed_emails: number;
  failed_emails: number;
  processing_time_ms: number;
  results: Array<{
    email_id: string;
    success: boolean;
    error?: string;
    processing_time_ms: number;
  }>;
  created_at: string;
  completed_at: string;
}

/**
 * Email template variable
 */
export interface EmailTemplateVariable {
  name: string;
  description: string;
  type: "string" | "number" | "date" | "boolean" | "array";
  required: boolean;
  default_value?: any;
  validation_pattern?: string;
  example_value?: any;
}

/**
 * Email template category
 */
export interface EmailTemplateCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

/**
 * Email processing metrics
 */
export interface EmailProcessingMetrics {
  total_processed: number;
  successful_processing: number;
  failed_processing: number;
  average_processing_time_ms: number;
  classification_accuracy: number;
  most_common_categories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  processing_errors: Array<{
    error_type: string;
    count: number;
    percentage: number;
  }>;
  last_updated: string;
}
