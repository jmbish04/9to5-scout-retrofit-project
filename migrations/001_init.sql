-- Ensures that foreign key constraints are enforced, which is crucial for maintaining data integrity.
PRAGMA foreign_keys=ON;

--
-- Table: sites
-- Description: Stores information about the websites that are being monitored for job postings.
--
CREATE TABLE sites (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the site
  name TEXT NOT NULL,                        -- Human-readable name of the site (e.g., "Google Careers")
  base_url TEXT NOT NULL,                    -- The base URL of the careers section of the site
  robots_txt TEXT,                           -- The content of the site's robots.txt file, for respecting crawl rules
  sitemap_url TEXT,                          -- URL to the site's sitemap, if available
  discovery_strategy TEXT NOT NULL,          -- The method used to find job posting URLs (e.g., "sitemap", "crawl")
  last_discovered_at TEXT,                   -- Timestamp of the last time new job URLs were discovered for this site
  created_at TEXT DEFAULT CURRENT_TIMESTAMP  -- Timestamp when the site was first added to the database
);

--
-- Table: search_configs
-- Description: Defines specific search criteria used for discovering jobs, often through external search engines.
--
CREATE TABLE search_configs (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the search configuration
  name TEXT NOT NULL,                        -- A descriptive name for the search configuration
  keywords TEXT NOT NULL,                    -- Keywords to use in the search (e.g., "Software Engineer")
  locations TEXT,                            -- Geographic locations to include in the search (e.g., "San Francisco, CA")
  include_domains TEXT,                      -- A list of domains to restrict the search to
  exclude_domains TEXT,                      -- A list of domains to exclude from the search
  min_comp_total INTEGER,                    -- Minimum total compensation to filter by
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the configuration was created
  updated_at TEXT                            -- Timestamp of the last update to this configuration
);

--
-- Table: jobs
-- Description: Contains the core details of each individual job posting discovered.
--
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the job
  site_id TEXT REFERENCES sites(id),         -- Foreign key linking to the site where the job was found
  url TEXT UNIQUE NOT NULL,                  -- The unique URL of the job posting
  canonical_url TEXT,                        -- The canonical URL, if different from the discovered URL
  title TEXT,                                -- The title of the job position
  company TEXT,                              -- The name of the company (often redundant if site_id is present, but useful)
  location TEXT,                             -- The location of the job
  employment_type TEXT,                      -- The type of employment (e.g., "Full-time", "Contract")
  department TEXT,                           -- The department or team the job belongs to
  salary_min INTEGER,                        -- The minimum salary, if specified
  salary_max INTEGER,                        -- The maximum salary, if specified
  salary_currency TEXT,                      -- The currency of the salary (e.g., "USD")
  salary_raw TEXT,                           -- The raw, unparsed salary information from the page
  compensation_raw TEXT,                     -- The raw, unparsed text describing overall compensation
  description_md TEXT,                       -- The job description, converted to Markdown format
  requirements_md TEXT,                      -- The job requirements, converted to Markdown format
  posted_at TEXT,                            -- The date the job was originally posted
  closed_at TEXT,                            -- The date the job was observed as closed
  status TEXT NOT NULL DEFAULT 'open',       -- The current status of the job ('open', 'closed', 'expired')
  last_seen_open_at TEXT,                    -- Timestamp of the last time the job was confirmed to be open
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when this job was first recorded in the database
  last_crawled_at TEXT,                      -- Timestamp of the most recent crawl attempt for this job URL
  -- PDF Document Tracking Fields
  job_listing_pdf_url TEXT,                  -- URL to a PDF snapshot of the original job listing
  custom_resume_pdf_url TEXT,                -- URL to the tailored resume PDF generated for this job
  cover_letter_pdf_url TEXT,                 -- URL to the tailored cover letter PDF generated for this job
  documents_generated_at TEXT                -- Timestamp when the application documents were generated
);

--
-- Table: snapshots
-- Description: Stores a historical record of a job page's content at a specific point in time.
--
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the snapshot
  job_id TEXT REFERENCES jobs(id),           -- Foreign key linking to the job that was snapshotted
  run_id TEXT,                               -- Identifier for the crawl or discovery run that generated this snapshot
  content_hash TEXT,                         -- A hash of the page's content to detect changes without storing the full content
  html_r2_key TEXT,                          -- The key for the raw HTML file stored in an R2 bucket
  json_r2_key TEXT,                          -- The key for the extracted and structured JSON data stored in R2
  screenshot_r2_key TEXT,                    -- The key for a screenshot of the page stored in R2
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the content was fetched
  http_status INTEGER,                       -- The HTTP status code from the fetch attempt (e.g., 200, 404)
  etag TEXT                                  -- The ETag header from the HTTP response, used for caching
);

--
-- Table: changes
-- Description: Logs significant changes detected between two snapshots of the same job.
--
CREATE TABLE changes (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the change record
  job_id TEXT REFERENCES jobs(id),           -- Foreign key linking to the job that changed
  from_snapshot_id TEXT REFERENCES snapshots(id), -- The snapshot before the change
  to_snapshot_id TEXT REFERENCES snapshots(id),   -- The snapshot after the change
  diff_json TEXT NOT NULL,                   -- A JSON object detailing the specific fields that changed
  semantic_summary TEXT,                     -- An AI-generated summary of what the change means (e.g., "Salary was increased")
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP  -- Timestamp when the change was detected
);

--
-- Table: runs
-- Description: A log of each execution of a discovery or crawl process.
--
CREATE TABLE runs (
  id TEXT PRIMARY KEY,                       -- Unique identifier for the run
  type TEXT NOT NULL,                        -- The type of run (e.g., "discovery", "crawl", "update")
  config_id TEXT,                            -- The ID of the search_config or site used for this run
  started_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the run began
  finished_at TEXT,                          -- Timestamp when the run completed
  status TEXT,                               -- The final status of the run (e.g., "completed", "failed", "in_progress")
  stats_json TEXT                            -- A JSON object containing statistics about the run (e.g., pages crawled, jobs found)
);

