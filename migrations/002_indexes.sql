-- Indexes for performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_site_id ON jobs(site_id);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at);
CREATE INDEX idx_snapshots_job_id ON snapshots(job_id);
CREATE INDEX idx_changes_job_id ON changes(job_id);