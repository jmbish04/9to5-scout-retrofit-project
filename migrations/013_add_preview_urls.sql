-- Add preview URL columns to enhanced_email_logs
ALTER TABLE enhanced_email_logs ADD COLUMN html_preview_url TEXT;
ALTER TABLE enhanced_email_logs ADD COLUMN pdf_preview_url TEXT;
