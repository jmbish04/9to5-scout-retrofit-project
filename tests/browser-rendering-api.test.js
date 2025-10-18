/**
 * Cloudflare Browser Rendering REST API Test Script
 *
 * This script demonstrates and tests the Cloudflare Browser Rendering REST API
 * for various web scraping and content extraction tasks, including authenticated sessions.
 * All console output is redirected to a log file that is overwritten on each run.
 * All generated assets (screenshots, PDFs, etc.) are saved to the `scripts/assets/browser-render` directory.
 */

import Cloudflare from "cloudflare";
import { readFileSync, createWriteStream, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// --- Logging Setup ---
const LOGS_DIR = join(process.cwd(), "scripts", "logs");
mkdirSync(LOGS_DIR, { recursive: true });
const logFile = join(LOGS_DIR, "browser-rendering-api.log");
const logStream = createWriteStream(logFile, { flags: 'w' }); // 'w' flag overwrites the file

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const logToStream = (level, ...args) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
  logStream.write(`[${level}] ${new Date().toISOString()} - ${message}\n`);
};

console.log = (...args) => {
  logToStream('LOG', ...args);
  originalConsoleLog.apply(console, args);
};

console.warn = (...args) => {
  logToStream('WARN', ...args);
  originalConsoleWarn.apply(console, args);
};

console.error = (...args) => {
  logToStream('ERROR', ...args);
  originalConsoleError.apply(console, args);
};

console.log(`📝 Logging test output to: ${logFile}`);
// --- End Logging Setup ---

// Load environment variables from .dev.vars file
function loadDevVars() {
  try {
    const devVarsPath = join(process.cwd(), ".dev.vars");
    const devVarsContent = readFileSync(devVarsPath, "utf8");
    const envVars = {};

    devVarsContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, ""); // Remove quotes
          envVars[key.trim()] = value;
        }
      }
    });

    return envVars;
  } catch (error) {
    console.warn("Could not load .dev.vars file, falling back to process.env");
    return {};
  }
}

// Load configuration from .dev.vars or environment
const devVars = loadDevVars();
const CLOUDFLARE_API_TOKEN =
  devVars.BROWSER_RENDERING_API_TOKEN ||
  process.env.CLOUDFLARE_API_TOKEN ||
  "your-api-token";
const CLOUDFLARE_ACCOUNT_ID =
  devVars.CLOUDFLARE_ACCOUNT_ID ||
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  "your-account-id";
const LINKEDIN_USERNAME =
  devVars.LINKEDIN_USERNAME || process.env.LINKEDIN_USERNAME;
const LINKEDIN_PASSWORD =
  devVars.LINKEDIN_PASSWORD || process.env.LINKEDIN_PASSWORD;

// Asset saving configuration
const ASSETS_DIR = join(process.cwd(), "scripts", "assets", "browser-render");

// Helper function to save assets
function saveAsset(filename, data, type = "text") {
  try {
    mkdirSync(ASSETS_DIR, { recursive: true });
    const filePath = join(ASSETS_DIR, filename);

    if (type === "binary") {
      writeFileSync(filePath, data);
    } else {
      writeFileSync(filePath, data, "utf8");
    }

    console.log(`💾 Asset saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`❌ Failed to save asset ${filename}:`, error.message);
    return null;
  }
}

// Validate configuration
if (
  CLOUDFLARE_API_TOKEN === "your-api-token" ||
  CLOUDFLARE_ACCOUNT_ID === "your-account-id"
) {
  console.error("❌ Configuration Error: Please update your .dev.vars file with BROWSER_RENDERING_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.");
  process.exit(1);
}

const hasLinkedInCredentials = LINKEDIN_USERNAME && LINKEDIN_PASSWORD;
if (!hasLinkedInCredentials) {
  console.warn("⚠️ LinkedIn credentials not found. LinkedIn-specific examples will be skipped.");
}

// Initialize Cloudflare client
const client = new Cloudflare({
  apiToken: CLOUDFLARE_API_TOKEN,
});

console.log("✅ Configuration loaded successfully");
console.log(`📋 Account ID: ${CLOUDFLARE_ACCOUNT_ID}`);

// --- Test Cases ---

async function takeScreenshot() {
  console.log("--- Running Test 1: Take Screenshot ---");
  try {
    const screenshot = await client.browserRendering.screenshot.create({
      account_id: CLOUDFLARE_ACCOUNT_ID,
      url: "https://example.com",
      screenshotOptions: { fullPage: true, type: "png" },
    });
    const filename = `test-1-screenshot.png`;
    saveAsset(filename, screenshot, "binary");
    console.log("✅ Screenshot test passed.");
  } catch (error) {
    console.error("❌ Screenshot test failed:", error);
  }
}

async function scrapeLinkedInJob() {
  if (!hasLinkedInCredentials) {
    console.log("--- Skipping Test: Scrape LinkedIn Job (No Credentials) ---");
    return;
  }
  console.log("--- Running Test: Scrape LinkedIn Job (Authenticated) ---");
  const jobId = "3791988393"; // A valid, recent job ID
  const url = `https://www.linkedin.com/jobs/view/${jobId}`;

  try {
    const markdownResult = await client.browserRendering.markdown.create({
        account_id: CLOUDFLARE_ACCOUNT_ID,
        url: url,
        authenticate: {
          username: LINKEDIN_USERNAME,
          password: LINKEDIN_PASSWORD,
        },
      });

    if (markdownResult) {
        const filename = `test-linkedin-job-${jobId}.md`;
        saveAsset(filename, markdownResult, "text");
        console.log(`✅ LinkedIn scrape test passed. Markdown saved.`);
    } else {
        throw new Error("Markdown result was empty.");
    }
  } catch (error) {
    console.error(`❌ LinkedIn scrape test failed for job ID ${jobId}:`, error);
  }
}


// --- Test Runner ---
async function runTests() {
  try {
    console.log("🚀 Starting Browser Rendering API test suite...\n");

    await takeScreenshot();
    console.log("\n" + "=".repeat(50) + "\n");

    await scrapeLinkedInJob();
    console.log("\n" + "=".repeat(50) + "\n");

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error running test suite:", error);
  } finally {
    logStream.end();
  }
}

runTests();
