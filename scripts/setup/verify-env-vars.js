#!/usr/bin/env node

/**
 * Verify Environment Variables
 *
 * This script verifies that the service account environment variables
 * are properly loaded and accessible.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_VARS_FILE = path.join(__dirname, "..", "..", ".dev.vars");

function verifyEnvironmentVariables() {
  try {
    // Check if .dev.vars exists
    if (!fs.existsSync(DEV_VARS_FILE)) {
      console.error("❌ .dev.vars file not found");
      console.log("Run: pnpm run setup:export-sa");
      process.exit(1);
    }

    // Read .dev.vars
    const content = fs.readFileSync(DEV_VARS_FILE, "utf8");
    const lines = content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));

    console.log("🔍 Verifying environment variables...\n");

    // Required variables
    const requiredVars = [
      "GCP_PROJECT_ID",
      "GCP_TENANT_ID",
      "GCP_SERVICE_ACCOUNT_JSON",
      "GCP_PRIVATE_KEY_ID",
      "GCP_PRIVATE_KEY",
      "GCP_CLIENT_EMAIL",
      "GCP_CLIENT_ID",
      "GCP_AUTH_URI",
      "GCP_TOKEN_URI",
    ];

    const foundVars = {};
    let allFound = true;

    // Parse variables
    lines.forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        foundVars[key.trim()] = valueParts.join("=").trim();
      }
    });

    // Check required variables
    requiredVars.forEach((varName) => {
      if (foundVars[varName]) {
        const value = foundVars[varName];
        const displayValue =
          value.length > 50 ? value.substring(0, 50) + "..." : value;
        console.log(`✅ ${varName}=${displayValue}`);
      } else {
        console.log(`❌ ${varName} - MISSING`);
        allFound = false;
      }
    });

    // Validate JSON format
    if (foundVars.GCP_SERVICE_ACCOUNT_JSON) {
      try {
        const saData = JSON.parse(foundVars.GCP_SERVICE_ACCOUNT_JSON);
        console.log(`\n📋 Service Account Details:`);
        console.log(`   Project ID: ${saData.project_id}`);
        console.log(`   Client Email: ${saData.client_email}`);
        console.log(`   Private Key ID: ${saData.private_key_id}`);
        console.log(`   Auth URI: ${saData.auth_uri}`);
        console.log(`   Token URI: ${saData.token_uri}`);
      } catch (error) {
        console.log(`\n❌ GCP_SERVICE_ACCOUNT_JSON is not valid JSON`);
        allFound = false;
      }
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total variables found: ${Object.keys(foundVars).length}`);
    console.log(`   Required variables: ${requiredVars.length}`);
    console.log(
      `   Missing variables: ${requiredVars.filter((v) => !foundVars[v]).length}`
    );

    if (allFound) {
      console.log(`\n✅ All environment variables are properly configured!`);
      console.log(
        `\n🚀 You can now use the Talent API in your Cloudflare Worker.`
      );
    } else {
      console.log(`\n❌ Some environment variables are missing or invalid.`);
      console.log(`   Run: pnpm run setup:export-sa`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error verifying environment variables:", error.message);
    process.exit(1);
  }
}

// Run verification
verifyEnvironmentVariables();
