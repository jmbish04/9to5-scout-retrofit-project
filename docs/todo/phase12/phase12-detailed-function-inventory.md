# Phase 12A: Detailed Function Inventory - High-Risk Files

## Overview

This document provides a detailed function-level inventory of the high-risk files identified in the modularization audit. These files require careful verification to ensure no functionality is lost during migration.

**Audit Date**: 2025-01-18  
**Purpose**: Function-level verification for Phase 12B migration

## High-Risk Files Analysis

### 1. src/lib/storage.ts (991 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: Split across multiple domains  
**Risk Level**: 🔴 HIGH

#### Exported Functions & Interfaces (31 total)

**Interfaces:**

- `StorageEnv` - Environment interface for storage operations

**Job Operations:**

- `saveJob(env: StorageEnv, job: Job): Promise<string>` - Save or update job with embeddings
- `getJobs(env: StorageEnv, options?: GetJobsOptions): Promise<Job[]>` - Get jobs with filtering
- `getJob(env: StorageEnv, id: string): Promise<Job | null>` - Get single job by ID
- `getJobById` - Alias for getJob
- `getJobsForMonitoring(env: StorageEnv): Promise<Job[]>` - Get jobs for monitoring
- `updateJobStatus(env: StorageEnv, id: string, status: string): Promise<void>` - Update job status

**Site Operations:**

- `saveSite(env: StorageEnv, site: Site): Promise<string>` - Save or update site
- `getSites(env: StorageEnv, options?: GetSitesOptions): Promise<Site[]>` - Get sites with filtering
- `getSiteById(env: StorageEnv, id: string): Promise<Site | null>` - Get site by ID
- `createSite(env: StorageEnv, site: Site): Promise<string>` - Create new site
- `updateSite(env: StorageEnv, id: string, updates: Partial<Site>): Promise<void>` - Update site
- `deleteSite(env: StorageEnv, id: string): Promise<void>` - Delete site

**Search & Configuration:**

- `saveSearchConfig(env: StorageEnv, config: SearchConfig): Promise<string>` - Save search config
- `getSearchConfigs(env: StorageEnv): Promise<SearchConfig[]>` - Get all search configs

**Run Tracking:**

- `createRun(env: StorageEnv, run: Omit<Run, 'id' | 'created_at'>): Promise<string>` - Create run
- `getRuns(env: StorageEnv, options?: GetRunsOptions): Promise<Run[]>` - Get runs with filtering

**Snapshots:**

- `createSnapshot(env: StorageEnv, jobId: string, content: string): Promise<string>` - Create job snapshot

**Job History & Tracking:**

- `createJobTrackingHistory(env: StorageEnv, entry: JobHistoryEntry): Promise<string>` - Create tracking entry
- `getJobTrackingHistory(env: StorageEnv, jobId: string): Promise<JobHistoryEntry[]>` - Get tracking history

**Market Stats:**

- `saveJobMarketStats(env: StorageEnv, stats: JobMarketStats): Promise<string>` - Save market stats

**Applicant Profiles:**

- `getApplicantProfile(env: StorageEnv, email: string): Promise<ApplicantProfile | null>` - Get applicant profile
- `createApplicantProfile(env: StorageEnv, profile: ApplicantProfile): Promise<string>` - Create profile
- `updateApplicantProfile(env: StorageEnv, email: string, updates: Partial<ApplicantProfile>): Promise<void>` - Update profile

**Job History Submissions:**

- `saveJobHistorySubmission(env: StorageEnv, submission: JobHistorySubmission): Promise<string>` - Save submission
- `updateJobHistorySubmission(env: StorageEnv, id: string, updates: Partial<JobHistorySubmission>): Promise<void>` - Update submission
- `saveJobHistoryEntry(env: StorageEnv, entry: JobHistoryEntry): Promise<string>` - Save history entry
- `getJobHistoryByApplicant(env: StorageEnv, email: string): Promise<JobHistoryEntry[]>` - Get applicant history
- `getJobHistorySubmissions(env: StorageEnv, email: string): Promise<JobHistorySubmission[]>` - Get submissions

**Job Ratings:**

- `saveJobRating(env: StorageEnv, rating: JobRating): Promise<string>` - Save job rating
- `getJobRatingsByApplicant(env: StorageEnv, email: string): Promise<JobRating[]>` - Get applicant ratings

**Migration Verification Needed:**

- [ ] Verify all job operations migrated to `src/domains/jobs/services/`
- [ ] Verify all site operations migrated to `src/domains/sites/services/`
- [ ] Verify all applicant operations migrated to `src/domains/applicants/services/`
- [ ] Verify all monitoring operations migrated to `src/domains/monitoring/services/`
- [ ] Verify all market stats operations migrated to `src/domains/stats/services/`

### 2. src/lib/documents.ts (1139 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: `src/domains/documents/services/`  
**Risk Level**: 🔴 HIGH

#### Exported Types & Interfaces (36 total)

**Core Types:**

- `DocumentType` - "resume" | "cover_letter"
- `DocumentPurpose` - "job_related" | "example" | "reference" | null
- `ResumeSections` - Interface for resume section structure
- `ApplicantDocument` - Core document interface
- `ApplicantDocumentWithSections` - Document with parsed sections
- `DocumentCreateInput` - Input for creating documents
- `DocumentUpdateInput` - Input for updating documents

**Search & Matching:**

- `VectorSearchRequest` - Vector search parameters
- `DocumentSearchMatch` - Search match result
- `DocumentSearchResponse` - Search response structure

**Document Patching:**

- `PatchRangePosition` - Position in document
- `PatchRange` - Range for patching
- `DocumentPatch` - Patch operation
- `ApplyPatchResult` - Patch application result

**ATS Evaluation:**

- `AtsEvaluationDimensionScores` - ATS scoring dimensions
- `AtsRecommendationPath` - Recommendation path
- `AtsRecommendation` - ATS recommendation
- `AtsEvaluation` - Complete ATS evaluation

**Document Generation:**

- `DocumentGenerationInput` - Input for document generation

#### Exported Functions (20 total)

**Document Management:**

- `serialiseEditorJson(editor: unknown): string` - Serialize editor JSON
- `buildResumeSectionInsert(section: string, content: string): string` - Build resume section
- `createApplicantDocument(env: StorageEnv, input: DocumentCreateInput): Promise<string>` - Create document
- `getApplicantDocument(env: StorageEnv, id: string): Promise<ApplicantDocument | null>` - Get document
- `updateApplicantDocument(env: StorageEnv, id: string, input: DocumentUpdateInput): Promise<void>` - Update document
- `deleteApplicantDocument(env: StorageEnv, id: string): Promise<void>` - Delete document
- `searchApplicantDocuments(env: StorageEnv, request: VectorSearchRequest): Promise<DocumentSearchResponse>` - Search documents

**Scoring Functions:**

- `scoreKeywords(resume: string, job: string): number` - Score keyword matches
- `scoreActionVerbs(resume: string): number` - Score action verbs
- `scoreImpact(resume: string): number` - Score impact statements
- `scoreBrevity(resume: string): number` - Score brevity
- `scoreStructure(resume: string): number` - Score document structure
- `scoreSeniority(resume: string, job: string): number` - Score seniority level

**ATS Evaluation:**

- `buildRecommendation(scores: AtsEvaluationDimensionScores): AtsRecommendationPath` - Build recommendation
- `evaluateDocumentAgainstJob(env: StorageEnv, documentId: string, jobId: string): Promise<AtsEvaluation>` - Evaluate document

**Document Generation:**

- `generateDocumentForJob(env: StorageEnv, input: DocumentGenerationInput): Promise<string>` - Generate document
- `applyDocumentPatches(env: StorageEnv, documentId: string, patches: DocumentPatch[]): Promise<ApplyPatchResult>` - Apply patches

**Migration Verification Needed:**

- [ ] Verify document management functions migrated to `src/domains/documents/services/document-storage.service.ts`
- [ ] Verify scoring functions migrated to `src/domains/documents/services/ats-evaluation.service.ts`
- [ ] Verify generation functions migrated to `src/domains/documents/services/resume-generation.service.ts`
- [ ] Verify search functions migrated to `src/domains/documents/services/document-search.service.ts`

### 3. src/lib/steel.ts (1009 lines)

**Status**: ⚠️ Deferred (REFACTORING ON HOLD)  
**New Location**: `src/domains/scraping/services/steel.ts` (moved, not refactored)  
**Risk Level**: 🟡 MEDIUM (deferred)

#### Exported Interfaces & Classes (9 total)

**Interfaces:**

- `SteelEnv` - Environment interface for Steel operations
- `JobSiteCredentials` - Credentials for job sites
- `JobScrapingResult` - Result of job scraping
- `JobSearchParams` - Parameters for job search
- `JobSiteConfig` - Configuration for job sites

**Enums:**

- `JobSite` - Enum of supported job sites

**Classes:**

- `MultiPlatformJobScraper` - Main scraper class (large, complex)

**Functions:**

- `createJobScraper(env: SteelEnv): MultiPlatformJobScraper` - Factory function
- `exampleMultiSiteScraping(env: SteelEnv): Promise<void>` - Example usage

**Migration Status:**

- ✅ **MOVED**: File moved to `src/domains/scraping/services/steel.ts`
- ❌ **NOT REFACTORED**: Intentionally deferred per plan
- ⚠️ **VERIFICATION NEEDED**: Ensure moved file is identical to original

### 4. src/lib/browser-rendering.ts (688 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: `src/integrations/browser/`  
**Risk Level**: 🔴 HIGH

#### Exported Interfaces & Classes (19 total)

**Interfaces:**

- `BrowserRenderingEnv` - Environment interface
- `BrowserRenderingResponse<T>` - Generic response interface
- `ScreenshotOptions` - Screenshot configuration
- `ViewportOptions` - Viewport configuration
- `GotoOptions` - Navigation options
- `ScrapeElement` - Element to scrape
- `AuthenticationOptions` - Authentication configuration
- `BrowserRenderingOptions` - Main options interface
- `ScrapedElement` - Scraped element result
- `ScrapeResult` - Scrape operation result
- `SnapshotResult` - Snapshot result
- `LinksResult` - Links extraction result
- `MarkdownResult` - Markdown conversion result
- `JsonResult` - JSON extraction result
- `ContentResult` - Content extraction result
- `PdfResult` - PDF generation result
- `BrowserRenderingResult` - Complete result interface

**Classes:**

- `BrowserRenderingClient` - Main client class (large, complex)

**Functions:**

- `createBrowserRenderingClient(env: BrowserRenderingEnv): BrowserRenderingClient` - Factory function

**Migration Verification Needed:**

- [ ] Verify client class migrated to `src/integrations/browser/browser-rendering.client.ts`
- [ ] Verify service logic migrated to `src/integrations/browser/browser-testing.service.ts`
- [ ] Verify all interfaces migrated to appropriate type files

### 5. src/routes/scraper.ts (985 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: `src/domains/scraping/routes/`  
**Risk Level**: 🔴 HIGH

**Migration Verification Needed:**

- [ ] Verify main scraper routes migrated to `src/domains/scraping/routes/scraper.routes.ts`
- [ ] Verify queue management routes migrated to `src/domains/scraping/routes/scrape-queue.routes.ts`
- [ ] Verify all route handlers are properly migrated

### 6. src/routes/steel-scraper.ts (993 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: `src/domains/scraping/routes/`  
**Risk Level**: 🔴 HIGH

**Migration Verification Needed:**

- [ ] Verify main routes migrated to `src/domains/scraping/routes/steel-scraper.routes.ts`
- [ ] Verify helper functions migrated to `src/domains/scraping/services/steel-helpers.service.ts`
- [ ] Verify all route handlers are properly migrated

### 7. src/routes/browser-testing.ts (891 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: `src/integrations/browser/routes/`  
**Risk Level**: 🔴 HIGH

**Migration Verification Needed:**

- [ ] Verify main routes migrated to `src/integrations/browser/routes/browser-testing.routes.ts`
- [ ] Verify helper functions migrated to `src/integrations/browser/browser-helpers.ts`
- [ ] Verify all route handlers are properly migrated

### 8. src/routes/api.ts (674 lines)

**Status**: ⚠️ Partially Migrated  
**New Location**: `src/api/router.ts`  
**Risk Level**: 🔴 HIGH

**Migration Verification Needed:**

- [ ] Verify main router migrated to `src/api/router.ts`
- [ ] Verify route aggregation logic migrated to individual domain index files
- [ ] Verify all route registrations are properly migrated

## Verification Process

### Phase 12B Verification Steps

1. **Function-by-Function Verification**:

   - For each exported function, verify it exists in the new modular structure
   - Check function signatures match exactly
   - Verify all dependencies are properly imported
   - Test functionality to ensure behavior is identical

2. **Interface & Type Verification**:

   - Verify all interfaces and types are migrated
   - Check type definitions match exactly
   - Ensure no type information is lost

3. **Import Path Updates**:

   - Update all imports to use new modular structure
   - Verify no broken imports remain
   - Test compilation to ensure no TypeScript errors

4. **Testing Verification**:
   - Run tests after each verification step
   - Verify no functionality is broken
   - Test all API endpoints to ensure they work

### Risk Mitigation

1. **Backup Strategy**: Create git branch before each verification step
2. **Rollback Plan**: Keep commented code until full verification
3. **Testing Strategy**: Run tests after each verification step
4. **Documentation**: Maintain detailed verification log
5. **Gradual Process**: Don't rush - verify each step thoroughly

## Next Steps

1. **Complete Function Inventory**: Finish documenting all remaining files
2. **Begin Phase 12B**: Start systematic verification of migrated functionality
3. **Update Migration Status**: Mark functions as verified as they are checked
4. **Fix Any Issues**: Address any missing or broken functionality found
5. **Prepare for Phase 12C**: Ready for gradual file cleanup

## Notes

- This detailed inventory is critical for ensuring no functionality is lost
- All high-risk files require careful verification
- The steel.ts file is intentionally deferred and should not be refactored
- Focus on functionality preservation over code organization during verification
- Document any issues found during verification for future reference
