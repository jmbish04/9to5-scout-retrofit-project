# EmailProcessorAgent Testing Guide

## 🧪 **Test Overview**

This guide covers testing the EmailProcessorAgent, a Cloudflare Agents SDK-based email processing system that handles AI classification, job link extraction, OTP detection, and centralized job processing.

## 🚀 **Quick Start**

### **1. Start the Worker**

```bash
# Start the development server
pnpm dev

# Or start with specific port
WORKER_URL=http://localhost:8787 pnpm dev
```

### **2. Run Tests**

```bash
# Run all email agent tests
pnpm test:email-agent

# Run integration tests (requires running worker)
pnpm test:email-agent-integration

# Run simple TypeScript test
pnpm test:email-agent-simple

# Run comprehensive test suite
pnpm test:comprehensive
```

## 📋 **Test Types**

### **1. Unit Tests (`test:email-agent`)**

- **File**: `tests/email-agent.test.js`
- **Purpose**: Test agent initialization and basic functionality
- **Requirements**: No running worker needed
- **Features**:
  - Agent initialization
  - Mock email processing
  - AI classification simulation
  - Database logging simulation
  - Job processing integration simulation

### **2. Integration Tests (`test:email-agent-integration`)**

- **File**: `tests/email-agent-integration.test.js`
- **Purpose**: Test agent via REST API with real email processing
- **Requirements**: Running worker (pnpm dev)
- **Features**:
  - Real email processing via `/api/email/test`
  - Multiple email types (job alerts, OTP, spam, etc.)
  - Database verification
  - Error handling and recovery
  - Performance testing

### **3. Simple Tests (`test:email-agent-simple`)**

- **File**: `tests/test-email-agent.ts`
- **Purpose**: Quick TypeScript-based testing
- **Requirements**: Running worker (pnpm dev)
- **Features**:
  - Basic email processing
  - Multiple test scenarios
  - Clean output and reporting

## 📧 **Test Email Types**

### **Job Alert Email**

```json
{
  "from": "jobs@linkedin.com",
  "to": "EmailProcessorAgent+test123@example.com",
  "subject": "New Software Engineer Position Available",
  "body": "Position: Senior Software Engineer...",
  "html": "<html>...</html>"
}
```

**Expected**: Category `JOB_ALERT`, job links extracted and processed

### **OTP Email**

```json
{
  "from": "noreply@bank.com",
  "to": "user@example.com",
  "subject": "Your verification code",
  "body": "Your verification code is: 123456"
}
```

**Expected**: Category `OTP`, code detected and forwarded

### **Recruiter Message**

```json
{
  "from": "sarah.johnson@techcorp.com",
  "to": "candidate@example.com",
  "subject": "Exciting opportunity at TechCorp",
  "body": "Hi there! I came across your profile..."
}
```

**Expected**: Category `RECRUITER`, logged and archived

### **Spam Email**

```json
{
  "from": "nigerian.prince@scam.com",
  "to": "victim@example.com",
  "subject": "URGENT: Claim your $1,000,000 inheritance",
  "body": "Dear Sir/Madam, I am writing to inform you..."
}
```

**Expected**: Category `SPAM`, filtered and archived

### **Networking Email**

```json
{
  "from": "john.doe@linkedin.com",
  "to": "professional@example.com",
  "subject": "Let's connect on LinkedIn",
  "body": "Hi! I'd like to connect with you on LinkedIn..."
}
```

**Expected**: Category `NETWORKING`, logged and archived

## 🔧 **Test Configuration**

### **Environment Variables**

```bash
# Worker URL for integration tests
WORKER_URL=http://localhost:8787

# Optional: Custom test endpoint
TEST_ENDPOINT=http://localhost:8787/api/email/test
```

### **Test Options**

```bash
# Test specific email type
node tests/email-agent-integration.test.js --single jobAlert

# Health check only
node tests/email-agent-integration.test.js --health-check

# Help
node tests/email-agent-integration.test.js --help
```

## 📊 **Test Results**

### **Success Criteria**

- ✅ Agent initializes successfully
- ✅ Emails are processed without errors
- ✅ AI classification works correctly
- ✅ Database logging functions properly
- ✅ Job links are extracted and processed
- ✅ OTP codes are detected and forwarded
- ✅ Error handling works as expected

### **Output Examples**

**Successful Test:**

```
🧪 Testing: Job Alert Email
📧 From: jobs@linkedin.com
📧 To: EmailProcessorAgent+test123@example.com
📧 Subject: New Software Engineer Position Available
✅ Success: {
  "success": true,
  "message": "Email processed successfully",
  "agentId": "test-agent-id",
  "emailData": {
    "from": "jobs@linkedin.com",
    "to": "EmailProcessorAgent+test123@example.com",
    "subject": "New Software Engineer Position Available",
    "bodyLength": 456,
    "htmlLength": 1234
  }
}
```

**Failed Test:**

```
🧪 Testing: Job Alert Email
📧 From: jobs@linkedin.com
📧 To: EmailProcessorAgent+test123@example.com
📧 Subject: New Software Engineer Position Available
❌ Error: 500 Internal Server Error
Error details: {"error":"Internal Server Error","message":"Database connection failed"}
```

## 🗄️ **Database Verification**

### **Check Email Logs**

```sql
-- View processed emails
SELECT id, from_email, subject, ai_category, ai_processing_status, received_at
FROM email_logs
ORDER BY received_at DESC
LIMIT 10;

-- Check job links
SELECT email_id, job_url, status, job_id, created_at
FROM email_job_links
ORDER BY created_at DESC
LIMIT 10;

-- Check AI classification results
SELECT ai_category, COUNT(*) as count
FROM email_logs
WHERE received_at > datetime('now', '-1 hour')
GROUP BY ai_category;
```

### **Expected Database State**

After running tests, you should see:

- New entries in `email_logs` table
- AI classification data populated
- Job links in `email_job_links` table (for job alert emails)
- OTP detection data (for OTP emails)
- Proper status tracking

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Worker Not Running**

```
❌ Network error: fetch failed
💡 Make sure the server is running with: pnpm dev
```

**Solution**: Start the worker with `pnpm dev`

#### **2. Database Connection Error**

```
❌ Error: 500 Internal Server Error
Error details: {"error":"Database connection failed"}
```

**Solution**: Check database migrations with `pnpm migrate:local`

#### **3. AI Model Error**

```
❌ Error: AI classification failed
```

**Solution**: Check AI model configuration and environment variables

#### **4. Agent Initialization Error**

```
❌ Error: Agent initialization failed
```

**Solution**: Check wrangler.toml configuration and Durable Object bindings

### **Debug Steps**

1. **Check Worker Logs**

   ```bash
   pnpm logs:tail
   ```

2. **Verify Database Schema**

   ```bash
   pnpm schema:check
   ```

3. **Test Individual Components**

   ```bash
   # Test AI classification
   pnpm test:email-agent

   # Test database connection
   pnpm schema:export
   ```

4. **Check Environment Variables**
   ```bash
   # Verify required secrets are set
   pnpm wrangler secret list
   ```

## 📈 **Performance Testing**

### **Load Testing**

```bash
# Run multiple tests concurrently
for i in {1..10}; do
  pnpm test:email-agent-simple &
done
wait
```

### **Memory Usage**

Monitor worker memory usage during tests:

```bash
# Check worker metrics
pnpm wrangler tail --format=pretty | grep -i memory
```

## 🔄 **Continuous Integration**

### **GitHub Actions Example**

```yaml
name: Email Agent Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: pnpm install
      - run: pnpm test:email-agent
      - run: pnpm dev &
      - run: sleep 10
      - run: pnpm test:email-agent-integration
```

## 📚 **Additional Resources**

- **EmailProcessorAgent Documentation**: `src/lib/agents/README.md`
- **Email System Guide**: `src/lib/email/AGENTS.md`
- **Cloudflare Agents SDK**: [Official Documentation](https://developers.cloudflare.com/agents/)
- **Workers AI**: [AI Documentation](https://developers.cloudflare.com/workers-ai/)

---

**🎯 This testing suite ensures the EmailProcessorAgent works correctly across all email types and processing scenarios.**
