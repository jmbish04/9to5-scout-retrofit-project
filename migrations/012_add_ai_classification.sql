-- Add AI classification column to enhanced_email_logs
ALTER TABLE enhanced_email_logs ADD COLUMN ai_classification TEXT;

-- Create index for AI classification
CREATE INDEX IF NOT EXISTS idx_enhanced_email_logs_ai_classification ON enhanced_email_logs(ai_classification);
