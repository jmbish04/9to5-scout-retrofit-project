#!/usr/bin/env node

/**
 * Schema Check Script
 * Compares local and remote database schemas to help AI agents avoid creating duplicate tables
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SCHEMAS_DIR = path.join(__dirname, "..", "schemas");
const LOCAL_SCHEMA_FILE = path.join(SCHEMAS_DIR, "local-schema.sql");
const REMOTE_SCHEMA_FILE = path.join(SCHEMAS_DIR, "remote-schema.sql");

function ensureSchemasDir() {
  if (!fs.existsSync(SCHEMAS_DIR)) {
    fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
    console.log("📁 Created schemas directory");
  }
}

function exportSchema(environment) {
  const outputFile =
    environment === "local" ? LOCAL_SCHEMA_FILE : REMOTE_SCHEMA_FILE;
  const flag = environment === "local" ? "--local" : "--remote";

  try {
    console.log(`📤 Exporting ${environment} schema...`);

    const command = `pnpm dlx wrangler@latest d1 execute DB --command="SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;" ${flag}`;
    const output = execSync(command, { encoding: "utf8" });

    fs.writeFileSync(outputFile, output);
    console.log(`✅ ${environment} schema exported to ${outputFile}`);

    return output;
  } catch (error) {
    console.error(`❌ Failed to export ${environment} schema:`, error.message);
    return null;
  }
}

function parseSchema(schemaContent) {
  if (!schemaContent) return {};

  const tables = {};
  const lines = schemaContent.split("\n");
  let currentTable = null;
  let currentSql = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("CREATE TABLE")) {
      // Save previous table if exists
      if (currentTable && currentSql) {
        tables[currentTable] = currentSql.trim();
      }

      // Start new table
      const match = trimmed.match(/CREATE TABLE\s+(\w+)/i);
      if (match) {
        currentTable = match[1];
        currentSql = trimmed;
      }
    } else if (currentTable && trimmed) {
      currentSql += " " + trimmed;
    }
  }

  // Save last table
  if (currentTable && currentSql) {
    tables[currentTable] = currentSql.trim();
  }

  return tables;
}

function compareSchemas(localTables, remoteTables) {
  const differences = {
    localOnly: [],
    remoteOnly: [],
    different: [],
  };

  // Find tables only in local
  for (const tableName of Object.keys(localTables)) {
    if (!remoteTables[tableName]) {
      differences.localOnly.push(tableName);
    } else if (localTables[tableName] !== remoteTables[tableName]) {
      differences.different.push(tableName);
    }
  }

  // Find tables only in remote
  for (const tableName of Object.keys(remoteTables)) {
    if (!localTables[tableName]) {
      differences.remoteOnly.push(tableName);
    }
  }

  return differences;
}

function printSchemaReport(localTables, remoteTables, differences) {
  console.log("\n📊 SCHEMA COMPARISON REPORT");
  console.log("=".repeat(50));

  console.log(`\n📈 Table Counts:`);
  console.log(`   Local:  ${Object.keys(localTables).length} tables`);
  console.log(`   Remote: ${Object.keys(remoteTables).length} tables`);

  if (differences.localOnly.length > 0) {
    console.log(`\n🔴 Tables only in LOCAL:`);
    differences.localOnly.forEach((table) => {
      console.log(`   - ${table}`);
    });
  }

  if (differences.remoteOnly.length > 0) {
    console.log(`\n🔵 Tables only in REMOTE:`);
    differences.remoteOnly.forEach((table) => {
      console.log(`   - ${table}`);
    });
  }

  if (differences.different.length > 0) {
    console.log(`\n🟡 Tables with DIFFERENCES:`);
    differences.different.forEach((table) => {
      console.log(`   - ${table}`);
    });
  }

  if (
    differences.localOnly.length === 0 &&
    differences.remoteOnly.length === 0 &&
    differences.different.length === 0
  ) {
    console.log(`\n✅ Schemas are in sync!`);
  }

  console.log("\n📋 All Tables:");
  const allTables = new Set([
    ...Object.keys(localTables),
    ...Object.keys(remoteTables),
  ]);
  allTables.forEach((table) => {
    const status = differences.localOnly.includes(table)
      ? "🔴"
      : differences.remoteOnly.includes(table)
      ? "🔵"
      : differences.different.includes(table)
      ? "🟡"
      : "✅";
    console.log(`   ${status} ${table}`);
  });
}

function generateAIAgentReport(differences) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalLocalTables: Object.keys(
        parseSchema(fs.readFileSync(LOCAL_SCHEMA_FILE, "utf8"))
      ).length,
      totalRemoteTables: Object.keys(
        parseSchema(fs.readFileSync(REMOTE_SCHEMA_FILE, "utf8"))
      ).length,
      localOnlyTables: differences.localOnly,
      remoteOnlyTables: differences.remoteOnly,
      differentTables: differences.different,
    },
    recommendations: [],
  };

  if (differences.localOnly.length > 0) {
    report.recommendations.push({
      type: "warning",
      message: `Found ${differences.localOnly.length} tables only in local database. Consider running migrations to sync.`,
      tables: differences.localOnly,
    });
  }

  if (differences.remoteOnly.length > 0) {
    report.recommendations.push({
      type: "info",
      message: `Found ${differences.remoteOnly.length} tables only in remote database. These may be from manual changes.`,
      tables: differences.remoteOnly,
    });
  }

  if (differences.different.length > 0) {
    report.recommendations.push({
      type: "warning",
      message: `Found ${differences.different.length} tables with structural differences. Review before making changes.`,
      tables: differences.different,
    });
  }

  const reportFile = path.join(SCHEMAS_DIR, "schema-comparison-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 AI Agent report saved to: ${reportFile}`);

  return report;
}

function main() {
  console.log("🔍 Database Schema Checker");
  console.log("==========================\n");

  ensureSchemasDir();

  // Export schemas
  const localSchema = exportSchema("local");
  const remoteSchema = exportSchema("remote");

  if (!localSchema || !remoteSchema) {
    console.error("❌ Failed to export one or both schemas. Cannot compare.");
    process.exit(1);
  }

  // Parse schemas
  const localTables = parseSchema(localSchema);
  const remoteTables = parseSchema(remoteSchema);

  // Compare schemas
  const differences = compareSchemas(localTables, remoteTables);

  // Print report
  printSchemaReport(localTables, remoteTables, differences);

  // Generate AI agent report
  const aiReport = generateAIAgentReport(differences);

  console.log("\n🎯 For AI Agents:");
  console.log("   - Check schemas/ directory before creating new tables");
  console.log(
    "   - Review schema-comparison-report.json for detailed analysis"
  );
  console.log('   - Use "pnpm schema:export:both" to update both schemas');

  // Exit with appropriate code
  const hasIssues =
    differences.localOnly.length > 0 || differences.different.length > 0;
  process.exit(hasIssues ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  exportSchema,
  parseSchema,
  compareSchemas,
  generateAIAgentReport,
};
