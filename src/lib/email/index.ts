/**
 * Email module - Centralized email processing functionality
 *
 * This module consolidates all email-related functionality including:
 * - Email parsing and processing
 * - AI-powered email analysis
 * - OTP detection and forwarding
 * - Job link extraction
 * - Email templates
 * - Email routing and forwarding
 */

// Core email types and interfaces
export type {
  AIEmailClassification,
  EmailConfig,
  EmailEmbedding,
  EmailInsights,
  EmailJobLink,
  EmailMessage,
  EmailTemplate,
  EnhancedEmailMessage,
  ExtractedJobInfo,
  OTPForwardingLog,
} from "./types";

// Note: Email parsing, job extraction, and OTP handling are now handled by EmailProcessorAgent

// Email templates
export {
  generateEmailHTMLPreview,
  generateJobInsightsHTML,
  generateJobInsightsTemplate,
  generateAnnouncementTemplate,
  generateOTPAlertHTML,
  generateWelcomeHTML,
  sendHTMLEmail,
  type JobInsightsData,
  type OTPAlertData,
  type EmailTemplateData,
  type JobInsightsTemplateData,
  type AnnouncementTemplateData,
} from "./templates";

// Email utilities
export {
  buildOutlookHtml,
  buildR2Url,
  extractEmailAddress,
  forwardEmail,
  generateEmailEmbeddings,
  getPlainTextContent,
  renderEmailPdf,
  saveEnhancedEmail,
} from "./utils";

// Email insights and reporting
export {
  formatInsightsEmail,
  generateEmailInsights,
  sendInsightsEmail,
} from "./insights";

// Email search and filtering
export {
  buildEmailFilterWhereClause,
  buildSearchWhereClause,
  generateAISearchTerms,
} from "./search";

// Note: Email event handling is now done by EmailProcessorAgent

// Note: AI-powered email classification is now handled by EmailProcessorAgent
