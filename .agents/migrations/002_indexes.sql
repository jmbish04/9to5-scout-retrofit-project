CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_site_url ON jobs(site_id, url);
CREATE INDEX idx_snapshots_job ON snapshots(job_id);
CREATE INDEX idx_changes_job ON changes(job_id);
