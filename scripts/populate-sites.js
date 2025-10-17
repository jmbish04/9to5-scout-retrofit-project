#!/usr/bin/env node

/**
 * Script to populate the sites table with default job site configurations
 * This ensures we have proper site data in D1 for the steel-scraper to use
 */

const defaultSites = [
  {
    id: "linkedin",
    name: "LinkedIn",
    base_url: "https://www.linkedin.com",
    robots_txt: "https://www.linkedin.com/robots.txt",
    sitemap_url: null,
    discovery_strategy: "search",
    last_discovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "indeed",
    name: "Indeed",
    base_url: "https://www.indeed.com",
    robots_txt: "https://www.indeed.com/robots.txt",
    sitemap_url: "https://www.indeed.com/sitemap.xml",
    discovery_strategy: "search",
    last_discovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "monster",
    name: "Monster",
    base_url: "https://www.monster.com",
    robots_txt: "https://www.monster.com/robots.txt",
    sitemap_url: "https://www.monster.com/sitemap.xml",
    discovery_strategy: "search",
    last_discovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "cloudflare",
    name: "Cloudflare Careers",
    base_url: "https://careers.cloudflare.com",
    robots_txt: "https://careers.cloudflare.com/robots.txt",
    sitemap_url: "https://careers.cloudflare.com/sitemap.xml",
    discovery_strategy: "list",
    last_discovered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "generic",
    name: "Generic Job Site",
    base_url: "https://example.com",
    robots_txt: null,
    sitemap_url: null,
    discovery_strategy: "custom",
    last_discovered_at: null,
    created_at: new Date().toISOString(),
  },
];

async function populateSites() {
  console.log("🌐 Populating sites table with default configurations...");

  try {
    // Use wrangler to execute the insert statements
    const { execSync } = require("child_process");

    for (const site of defaultSites) {
      const insertQuery = `
        INSERT OR REPLACE INTO sites (
          id, name, base_url, robots_txt, sitemap_url, 
          discovery_strategy, last_discovered_at, created_at
        ) VALUES (
          '${site.id}',
          '${site.name}',
          '${site.base_url}',
          ${site.robots_txt ? `'${site.robots_txt}'` : "NULL"},
          ${site.sitemap_url ? `'${site.sitemap_url}'` : "NULL"},
          '${site.discovery_strategy}',
          ${site.last_discovered_at ? `'${site.last_discovered_at}'` : "NULL"},
          '${site.created_at}'
        );
      `;

      console.log(`  📝 Adding ${site.name} (${site.id})...`);

      try {
        execSync(
          `pnpm wrangler d1 execute DB --local --command="${insertQuery}"`,
          {
            stdio: "pipe",
            cwd: process.cwd(),
          }
        );
        console.log(`  ✅ ${site.name} added successfully`);
      } catch (error) {
        console.error(`  ❌ Failed to add ${site.name}:`, error.message);
      }
    }

    console.log("\n🎉 Sites table populated successfully!");
    console.log("\n📊 Verifying data...");

    // Verify the data was inserted
    const verifyQuery =
      "SELECT id, name, base_url, discovery_strategy FROM sites ORDER BY id;";
    const result = execSync(
      `pnpm wrangler d1 execute DB --local --command="${verifyQuery}"`,
      {
        stdio: "pipe",
        cwd: process.cwd(),
      }
    );

    const data = JSON.parse(result.toString());
    console.log("\n📋 Current sites in database:");
    data[0].results.forEach((site) => {
      console.log(
        `  • ${site.name} (${site.id}) - ${site.base_url} [${site.discovery_strategy}]`
      );
    });
  } catch (error) {
    console.error("❌ Error populating sites table:", error);
    process.exit(1);
  }
}

// Run the script
populateSites();
