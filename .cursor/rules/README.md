# 9to5 Scout Project Rules

This directory contains organized Project Rules using the new `.mdc` format, replacing the legacy `.cursorrules` file.

## Rule Files Overview

### Core Architecture Rules

- **`cloudflare-docs-verification.mdc`** - Mandatory Cloudflare documentation verification before implementation
- **`architecture.mdc`** - Core Cloudflare Workers architecture and service usage patterns
- **`typescript-ai-typing.mdc`** - TypeScript and AI model typing requirements
- **`package-management.mdc`** - Package management and dependency rules

### Implementation Rules

- **`database-api.mdc`** - Database schema compliance and API conventions
- **`websocket-durable-objects.mdc`** - WebSocket and Durable Objects implementation
- **`configuration-security.mdc`** - Configuration and security best practices

### Quality & Standards

- **`testing-code-standards.mdc`** - Testing, documentation, and code quality standards
- **`email-processing.mdc`** - Email processing and AI extraction specific rules

## Rule Types

### Always Apply (`alwaysApply: true`)

These rules are automatically included in model context:

- `cloudflare-docs-verification.mdc`
- `architecture.mdc`
- `typescript-ai-typing.mdc`
- `package-management.mdc`
- `database-api.mdc`
- `websocket-durable-objects.mdc`
- `configuration-security.mdc`
- `testing-code-standards.mdc`

### Auto Attached (`alwaysApply: false`)

These rules are included when files matching their glob patterns are referenced:

- `email-processing.mdc` - Applied when working with email-related files

## Key Benefits

1. **Organized by Category** - Rules are logically grouped for better maintainability
2. **Focused Scope** - Each rule file has a specific purpose and scope
3. **Automatic Application** - Rules apply based on file patterns and context
4. **Version Controlled** - All rules are tracked in git
5. **Easy Maintenance** - Individual rule files can be updated independently

## Migration from .cursorrules

The legacy `.cursorrules` file has been removed and replaced with this organized structure. All critical rules from AGENT.md have been preserved and enhanced with:

- Better organization and categorization
- Specific code examples and patterns
- Proper MDC metadata for rule application
- Focused scope for each rule type

## Usage

Rules are automatically applied by Cursor based on:

- File patterns (`globs`)
- Always apply settings (`alwaysApply`)
- Manual invocation using `@ruleName`

No manual configuration is required - Cursor will automatically detect and apply these rules based on the files you're working with.
