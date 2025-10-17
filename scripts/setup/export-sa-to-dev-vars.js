#!/usr/bin/env node

/**
 * Export Service Account Credentials to .dev.vars
 *
 * This script reads the service account JSON file and exports the credentials
 * as environment variables that can be used in .dev.vars for Cloudflare Workers.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SA_KEY_FILE = path.join(__dirname, "talent-api-sa-key.json");
const DEV_VARS_FILE = path.join(__dirname, "..", "..", ".dev.vars");

function exportServiceAccountToDevVars() {
  try {
    // Check if service account file exists
    if (!fs.existsSync(SA_KEY_FILE)) {
      console.error("❌ Service account file not found:", SA_KEY_FILE);
      console.log(
        "Please ensure the service account JSON file is in the correct location."
      );
      process.exit(1);
    }

    // Read service account file
    const saData = JSON.parse(fs.readFileSync(SA_KEY_FILE, "utf8"));

    // Validate required fields
    const requiredFields = [
      "type",
      "project_id",
      "private_key_id",
      "private_key",
      "client_email",
      "client_id",
      "auth_uri",
      "token_uri",
    ];

    for (const field of requiredFields) {
      if (!saData[field]) {
        console.error(`❌ Missing required field: ${field}`);
        process.exit(1);
      }
    }

    // Create environment variables
    const envVars = {
      // Google Cloud Project Configuration
      GCP_PROJECT_ID: saData.project_id,
      GCP_TENANT_ID: saData.project_id, // Using project_id as tenant_id

      // Service Account Credentials (as JSON string)
      GCP_SERVICE_ACCOUNT_JSON: JSON.stringify(saData),

      // Individual credential fields (for easier access)
      GCP_PRIVATE_KEY_ID: saData.private_key_id,
      GCP_PRIVATE_KEY: saData.private_key,
      GCP_CLIENT_EMAIL: saData.client_email,
      GCP_CLIENT_ID: saData.client_id,
      GCP_AUTH_URI: saData.auth_uri,
      GCP_TOKEN_URI: saData.token_uri,
      GCP_AUTH_PROVIDER_X509_CERT_URL: saData.auth_provider_x509_cert_url,
      GCP_CLIENT_X509_CERT_URL: saData.client_x509_cert_url,
      GCP_UNIVERSE_DOMAIN: saData.universe_domain || "googleapis.com",
    };

    // Read existing .dev.vars if it exists
    let existingVars = {};
    if (fs.existsSync(DEV_VARS_FILE)) {
      const existingContent = fs.readFileSync(DEV_VARS_FILE, "utf8");
      existingContent.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          existingVars[key.trim()] = valueParts.join("=").trim();
        }
      });
    }

    // Merge with existing variables (service account vars take precedence)
    const mergedVars = { ...existingVars, ...envVars };

    // Create .dev.vars content
    const devVarsContent = Object.entries(mergedVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Write to .dev.vars
    fs.writeFileSync(DEV_VARS_FILE, devVarsContent);

    console.log(
      "✅ Successfully exported service account credentials to .dev.vars"
    );
    console.log(`📁 File: ${DEV_VARS_FILE}`);
    console.log("\n📋 Exported variables:");
    Object.keys(envVars).forEach((key) => {
      console.log(
        `   ${key}=${envVars[key].length > 50 ? envVars[key].substring(0, 50) + "..." : envVars[key]}`
      );
    });

    console.log("\n🔐 Security Notes:");
    console.log("   - .dev.vars is already in .gitignore");
    console.log(
      "   - Never commit service account credentials to version control"
    );
    console.log("   - For production, use Cloudflare Workers secrets:");
    console.log("     wrangler secret put GCP_SERVICE_ACCOUNT_JSON");
    console.log("     wrangler secret put GCP_PROJECT_ID");
    console.log("     wrangler secret put GCP_TENANT_ID");
  } catch (error) {
    console.error(
      "❌ Error exporting service account credentials:",
      error.message
    );
    process.exit(1);
  }
}

// Run the export
exportServiceAccountToDevVars();
