-- Add PDF document tracking fields to jobs table
ALTER TABLE jobs ADD COLUMN job_listing_pdf_url TEXT;
ALTER TABLE jobs ADD COLUMN custom_resume_pdf_url TEXT;
ALTER TABLE jobs ADD COLUMN cover_letter_pdf_url TEXT;
ALTER TABLE jobs ADD COLUMN documents_generated_at TEXT;
