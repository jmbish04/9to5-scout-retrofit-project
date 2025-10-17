#!/usr/bin/env node

/**
 * Script to sync YAML agent configurations to D1 database
 * This ensures all agents from .agents/job_agent_configs/ are properly configured in D1
 */

import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Load YAML files
const agentsDir = path.join(projectRoot, ".agents", "job_agent_configs");
const yamlFiles = [
  "agents.yaml",
  "enhanced_agents.yaml",
  "enhanced_tasks.yaml",
  "multi_model_agents.yaml",
  "tasks.yaml",
];

function loadYamlFile(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    return yaml.load(fileContents);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

function extractAgentConfigs(data, sourceFile) {
  const configs = [];

  if (!data || typeof data !== "object") {
    return configs;
  }

  // Handle different YAML structures
  if (data.agents) {
    // Enhanced format with agents object
    Object.entries(data.agents).forEach(([name, config]) => {
      configs.push({
        id: name,
        name: name,
        role: config.role || "",
        goal: config.goal || "",
        backstory: config.backstory || "",
        llm: extractLlmModel(config.llm),
        system_prompt: null,
        max_tokens: 4000,
        temperature: 0.7,
        enabled: true,
        source_file: sourceFile,
      });
    });
  } else {
    // Direct agent definitions
    Object.entries(data).forEach(([name, config]) => {
      if (config && typeof config === "object" && config.role) {
        configs.push({
          id: name,
          name: name,
          role: config.role || "",
          goal: config.goal || "",
          backstory: config.backstory || "",
          llm: extractLlmModel(config.llm),
          system_prompt: null,
          max_tokens: 4000,
          temperature: 0.7,
          enabled: true,
          source_file: sourceFile,
        });
      }
    });
  }

  return configs;
}

function extractLlmModel(llmConfig) {
  if (typeof llmConfig === "string") {
    return llmConfig;
  }

  if (llmConfig && typeof llmConfig === "object") {
    if (llmConfig.config && llmConfig.config.model) {
      return llmConfig.config.model;
    }
    if (llmConfig.model) {
      return llmConfig.model;
    }
  }

  return "openai/gpt-4o-mini"; // default fallback
}

function extractTaskConfigs(data, sourceFile) {
  const tasks = [];

  if (!data || typeof data !== "object") {
    return tasks;
  }

  // Handle different YAML structures for tasks
  if (data.tasks) {
    Object.entries(data.tasks).forEach(([name, config]) => {
      tasks.push({
        id: name,
        name: config.name || name,
        description: config.description || "",
        expected_output: config.expected_output || "",
        agent_id: config.agent_id || name.replace("_task", ""),
        context_tasks: config.context_tasks
          ? JSON.stringify(config.context_tasks)
          : null,
        output_schema: config.output_schema
          ? JSON.stringify(config.output_schema)
          : null,
        enabled: true,
        source_file: sourceFile,
      });
    });
  }

  return tasks;
}

function generateSqlStatements(agentConfigs, taskConfigs) {
  const statements = [];

  // Clear existing data (optional - comment out if you want to preserve existing data)
  statements.push("-- Clear existing agent and task configurations");
  statements.push("DELETE FROM task_configs;");
  statements.push("DELETE FROM agent_configs;");
  statements.push("");

  // Insert agent configurations
  statements.push("-- Insert agent configurations");
  agentConfigs.forEach((config) => {
    const sql = `INSERT OR REPLACE INTO agent_configs (
      id, name, role, goal, backstory, llm, system_prompt, 
      max_tokens, temperature, enabled, created_at, updated_at
    ) VALUES (
      '${config.id}',
      '${config.name}',
      '${config.role.replace(/'/g, "''")}',
      '${config.goal.replace(/'/g, "''")}',
      '${config.backstory.replace(/'/g, "''")}',
      '${config.llm}',
      ${config.system_prompt ? `'${config.system_prompt.replace(/'/g, "''")}'` : "NULL"},
      ${config.max_tokens},
      ${config.temperature},
      ${config.enabled ? 1 : 0},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );`;
    statements.push(sql);
  });

  statements.push("");

  // Insert task configurations
  statements.push("-- Insert task configurations");
  taskConfigs.forEach((config) => {
    const sql = `INSERT OR REPLACE INTO task_configs (
      id, name, description, expected_output, agent_id, 
      context_tasks, output_schema, enabled, created_at, updated_at
    ) VALUES (
      '${config.id}',
      '${config.name}',
      '${config.description.replace(/'/g, "''")}',
      '${config.expected_output.replace(/'/g, "''")}',
      '${config.agent_id}',
      ${config.context_tasks ? `'${config.context_tasks}'` : "NULL"},
      ${config.output_schema ? `'${config.output_schema}'` : "NULL"},
      ${config.enabled ? 1 : 0},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );`;
    statements.push(sql);
  });

  return statements.join("\n");
}

async function main() {
  console.log("🔄 Syncing YAML agent configurations to D1 database...");

  let allAgentConfigs = [];
  let allTaskConfigs = [];

  // Process each YAML file
  for (const yamlFile of yamlFiles) {
    const filePath = path.join(agentsDir, yamlFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${yamlFile}`);
      continue;
    }

    console.log(`📄 Processing ${yamlFile}...`);
    const data = loadYamlFile(filePath);

    if (data) {
      const agentConfigs = extractAgentConfigs(data, yamlFile);
      const taskConfigs = extractTaskConfigs(data, yamlFile);

      allAgentConfigs.push(...agentConfigs);
      allTaskConfigs.push(...taskConfigs);

      console.log(
        `   ✅ Found ${agentConfigs.length} agents, ${taskConfigs.length} tasks`
      );
    }
  }

  // Remove duplicates based on ID
  const uniqueAgents = allAgentConfigs.reduce((acc, config) => {
    if (!acc.find((a) => a.id === config.id)) {
      acc.push(config);
    }
    return acc;
  }, []);

  const uniqueTasks = allTaskConfigs.reduce((acc, config) => {
    if (!acc.find((t) => t.id === config.id)) {
      acc.push(config);
    }
    return acc;
  }, []);

  console.log(`\n📊 Summary:`);
  console.log(`   Agents: ${uniqueAgents.length} unique configurations`);
  console.log(`   Tasks: ${uniqueTasks.length} unique configurations`);

  // Generate SQL statements
  const sqlStatements = generateSqlStatements(uniqueAgents, uniqueTasks);

  // Write SQL file
  const outputPath = path.join(
    projectRoot,
    "migrations",
    "008_sync_agent_configs.sql"
  );
  fs.writeFileSync(outputPath, sqlStatements);

  console.log(`\n✅ Generated SQL migration: ${outputPath}`);
  console.log(`\n🚀 To apply the migration, run:`);
  console.log(`   pnpm migrate:local  # for local development`);
  console.log(`   pnpm migrate:remote # for production`);

  // Display some sample configurations
  console.log(`\n📋 Sample agent configurations:`);
  uniqueAgents.slice(0, 3).forEach((agent) => {
    console.log(`   • ${agent.name}: ${agent.role}`);
  });

  if (uniqueAgents.length > 3) {
    console.log(`   ... and ${uniqueAgents.length - 3} more`);
  }
}

main().catch(console.error);
