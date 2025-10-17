# Service Account Setup

This directory contains scripts and configuration files for setting up Google Cloud service account credentials for the Talent API integration.

## Files

- `talent-api-sa-key.json` - Service account credentials (DO NOT COMMIT TO GIT)
- `export-sa-to-dev-vars.js` - Script to export credentials to `.dev.vars`

## Setup Instructions

### 1. Service Account Credentials

The `talent-api-sa-key.json` file contains your Google Cloud service account credentials. This file is automatically excluded from Git via `.gitignore`.

**⚠️ IMPORTANT SECURITY NOTES:**

- This file contains sensitive credentials
- Never commit this file to version control
- Keep this file secure and private
- For production, use Cloudflare Workers secrets instead

### 2. Export to Environment Variables

To use the service account credentials in your Cloudflare Worker, run:

```bash
# Export credentials to .dev.vars
pnpm run setup:export-sa

# Or run directly
node scripts/setup/export-sa-to-dev-vars.js
```

This will create/update your `.dev.vars` file with the following environment variables:

```bash
# Google Cloud Project Configuration
GCP_PROJECT_ID=discovery-383518
GCP_TENANT_ID=discovery-383518

# Service Account Credentials (as JSON string)
GCP_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Individual credential fields
GCP_PRIVATE_KEY_ID=bf486ec3da250c45381ef349e5f01f13bf6eee9f
GCP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
GCP_CLIENT_EMAIL=talent-api-sa@discovery-383518.iam.gserviceaccount.com
GCP_CLIENT_ID=101271343666535325718
GCP_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GCP_TOKEN_URI=https://oauth2.googleapis.com/token
GCP_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GCP_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
GCP_UNIVERSE_DOMAIN=googleapis.com
```

### 3. Production Deployment

For production deployment, use Cloudflare Workers secrets instead of `.dev.vars`:

```bash
# Set secrets in Cloudflare Workers
wrangler secret put GCP_SERVICE_ACCOUNT_JSON
wrangler secret put GCP_PROJECT_ID
wrangler secret put GCP_TENANT_ID
```

When prompted, paste the values from your `.dev.vars` file.

## Usage in Code

The service account credentials are used in `src/lib/talent.ts` for Google Jobs API authentication:

```typescript
// The talent service automatically reads from environment variables
const service = new GoogleJobsService(env);
```

## Troubleshooting

### Common Issues

1. **Service account file not found**
   - Ensure `talent-api-sa-key.json` exists in `scripts/setup/`
   - Check file permissions

2. **Invalid credentials**
   - Verify the service account has the correct permissions
   - Ensure the JSON file is valid and complete

3. **Environment variables not loaded**
   - Check that `.dev.vars` exists and contains the exported variables
   - Restart your development server after exporting

### Verification

To verify the setup is working:

```bash
# Test the Talent API integration
pnpm run test:talent-api

# Test with WebSocket streaming
pnpm run test:websocket:talent
```

## Security Best Practices

1. **Never commit credentials to Git**
   - The `.gitignore` file excludes all service account files
   - Double-check before committing

2. **Use least privilege principle**
   - Only grant necessary permissions to the service account
   - Regularly rotate credentials

3. **Monitor usage**
   - Check Google Cloud Console for API usage
   - Set up billing alerts

4. **Production secrets**
   - Use Cloudflare Workers secrets for production
   - Never use `.dev.vars` in production

## File Structure

```
scripts/setup/
├── README.md                    # This file
├── talent-api-sa-key.json      # Service account credentials (gitignored)
└── export-sa-to-dev-vars.js    # Export script
```

## Related Documentation

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Talent API Documentation](https://developers.google.com/talent-solution/job-search/v3p1beta1)
