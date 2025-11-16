/**
 * @module src/db/types.ts
 * @description
 * Type definitions for Kysely Database interface.
 * These types are derived from Drizzle schema and used by Kysely for type-safe queries.
 */

import type { InferSelectModel } from "drizzle-orm";
import {
  agentActivities,
  agentConfigs,
  agentData,
  agentRagInteractions,
  applicantDocuments,
  applicantProfiles,
  assetEmbeddings,
  benefitsStats,
  careerGoals,
  changes,
  companies,
  companyBenefitsSnapshots,
  companyProfiles,
  documentAnalysis,
  documentEmbeddings,
  emailConfigs,
  emailJobLinks,
  emailLogs,
  emailTemplates,
  embeddingOperations,
  errorLogs,
  industryInterests,
  interviewPrepData,
  interviewSessions,
  jobHistory,
  jobHistorySubmissions,
  jobIntakeQueue,
  jobMarketStats,
  jobMonitoring,
  jobProcessingQueue,
  jobProcessingResults,
  jobRatings,
  jobTrackingHistory,
  jobs,
  otpForwardingLog,
  profileApprovals,
  profileChanges,
  pythonClients,
  ragQueries,
  resumeOptimizations,
  resumeSections,
  runs,
  salaryGoals,
  scrapeQueue,
  scrapedJobDetails,
  searchConfigs,
  sites,
  skills,
  snapshots,
  systemLogs,
  taskConfigs,
  testDefs,
  testLogs,
  testResults,
  workflowConfigs,
} from "./schema";

/**
 * Database interface for Kysely type system
 * Maps table names to their inferred types from Drizzle schema
 */
export interface Database {
  sites: InferSelectModel<typeof sites>;
  companies: InferSelectModel<typeof companies>;
  jobs: InferSelectModel<typeof jobs>;
  snapshots: InferSelectModel<typeof snapshots>;
  changes: InferSelectModel<typeof changes>;
  runs: InferSelectModel<typeof runs>;
  search_configs: InferSelectModel<typeof searchConfigs>;
  email_configs: InferSelectModel<typeof emailConfigs>;
  agent_configs: InferSelectModel<typeof agentConfigs>;
  task_configs: InferSelectModel<typeof taskConfigs>;
  workflow_configs: InferSelectModel<typeof workflowConfigs>;
  applicant_profiles: InferSelectModel<typeof applicantProfiles>;
  job_history: InferSelectModel<typeof jobHistory>;
  job_history_submissions: InferSelectModel<typeof jobHistorySubmissions>;
  job_ratings: InferSelectModel<typeof jobRatings>;
  job_tracking_history: InferSelectModel<typeof jobTrackingHistory>;
  job_market_stats: InferSelectModel<typeof jobMarketStats>;
  scrape_queue: InferSelectModel<typeof scrapeQueue>;
  scraped_job_details: InferSelectModel<typeof scrapedJobDetails>;
  job_intake_queue: InferSelectModel<typeof jobIntakeQueue>;
  job_processing_queue: InferSelectModel<typeof jobProcessingQueue>;
  job_processing_results: InferSelectModel<typeof jobProcessingResults>;
  system_logs: InferSelectModel<typeof systemLogs>;
  test_logs: InferSelectModel<typeof testLogs>;
  error_logs: InferSelectModel<typeof errorLogs>;
  company_benefits_snapshots: InferSelectModel<typeof companyBenefitsSnapshots>;
  benefits_stats: InferSelectModel<typeof benefitsStats>;
  asset_embeddings: InferSelectModel<typeof assetEmbeddings>;
  embedding_operations: InferSelectModel<typeof embeddingOperations>;
  rag_queries: InferSelectModel<typeof ragQueries>;
  agent_rag_interactions: InferSelectModel<typeof agentRagInteractions>;
  applicant_documents: InferSelectModel<typeof applicantDocuments>;
  resume_sections: InferSelectModel<typeof resumeSections>;
  document_embeddings: InferSelectModel<typeof documentEmbeddings>;
  email_logs: InferSelectModel<typeof emailLogs>;
  email_job_links: InferSelectModel<typeof emailJobLinks>;
  email_templates: InferSelectModel<typeof emailTemplates>;
  otp_forwarding_log: InferSelectModel<typeof otpForwardingLog>;
  skills: InferSelectModel<typeof skills>;
  career_goals: InferSelectModel<typeof careerGoals>;
  industry_interests: InferSelectModel<typeof industryInterests>;
  salary_goals: InferSelectModel<typeof salaryGoals>;
  profile_changes: InferSelectModel<typeof profileChanges>;
  profile_approvals: InferSelectModel<typeof profileApprovals>;
  document_analysis: InferSelectModel<typeof documentAnalysis>;
  interview_prep_data: InferSelectModel<typeof interviewPrepData>;
  agent_activities: InferSelectModel<typeof agentActivities>;
  agent_data: InferSelectModel<typeof agentData>;
  company_profiles: InferSelectModel<typeof companyProfiles>;
  interview_sessions: InferSelectModel<typeof interviewSessions>;
  resume_optimizations: InferSelectModel<typeof resumeOptimizations>;
  job_monitoring: InferSelectModel<typeof jobMonitoring>;
  python_clients: InferSelectModel<typeof pythonClients>;
  test_defs: InferSelectModel<typeof testDefs>;
  test_results: InferSelectModel<typeof testResults>;
}
