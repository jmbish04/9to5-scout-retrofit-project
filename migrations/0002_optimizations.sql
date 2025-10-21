-- Migration 0002: Add indexes for query optimization
-- This migration adds indexes to columns that are frequently used in WHERE
-- clauses and ORDER BY clauses to improve query performance.

-- Index on sites.base_url to speed up duplicate checks during site creation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_base_url ON sites(base_url);

-- Index on sites.name to speed up searching and sorting by name.
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);

-- Index on sites.last_discovered_at to optimize the query for fetching sites
-- that are due for content discovery.
CREATE INDEX IF NOT EXISTS idx_sites_last_discovered_at ON sites(last_discovered_at);

-- Index on applicant_profiles.user_id for faster profile lookups.
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicant_profiles_user_id ON applicant_profiles(user_id);

-- Index on job_history_submissions.applicant_id for fetching submissions by applicant.
CREATE INDEX IF NOT EXISTS idx_job_history_submissions_applicant_id ON job_history_submissions(applicant_id);

-- Index on job_ratings.applicant_id and job_id for faster lookups and upserts.
CREATE INDEX IF NOT EXISTS idx_job_ratings_applicant_job ON job_ratings(applicant_id, job_id);
