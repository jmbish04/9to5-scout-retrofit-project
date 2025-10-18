# Deployment Guide

## Cloudflare Pages Deployment

When deploying this project to Cloudflare Pages, use the following configuration:

### Build Configuration

**Build command:**
```bash
pnpm deploy
```

**Build output directory:**
```
dist
```

**Root directory:**
```
/
```

### Important Notes

- **Do NOT use** `wrangler versions upload` directly as the build command
- The `wrangler` CLI is installed as a dev dependency via pnpm and needs to be executed through pnpm
- The `pnpm deploy` script handles the complete deployment workflow including:
  - Type generation
  - Build compilation
  - Database migrations
  - Version upload

### Manual Deployment

For manual deployments from your local machine:

```bash
# Install dependencies
pnpm install

# Run the deploy script
pnpm deploy
```

### Troubleshooting

**Error: `wrangler: not found`**

This error occurs when trying to run `wrangler` directly without pnpm. Always use:
```bash
pnpm wrangler <command>
# or use the predefined scripts
pnpm deploy
```

**Error: `wrangler versions upload` fails in Cloudflare Pages**

Update your Cloudflare Pages project settings:
1. Go to your Cloudflare Pages project
2. Navigate to Settings > Builds & deployments
3. Change the build command from `wrangler versions upload` to `pnpm deploy`
4. Ensure the build output directory is set to `dist`

## Alternative: Cloudflare Workers Direct Deployment

If you prefer to deploy directly to Cloudflare Workers (not Pages):

```bash
# Deploy to production
pnpm deploy

# Deploy to a specific environment
pnpm wrangler deploy --env production
```

## Environment Variables

Ensure the following secrets are set in your Cloudflare account:
- `ACCOUNT_ID` (for production deployments)
- Any API keys or tokens required by your application
