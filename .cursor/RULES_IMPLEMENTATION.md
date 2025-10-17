I'll update AGENTS.md to emphasize the mandatory use of the Cloudflare docs MCP tool and create a corresponding Cursor rule for this requirement.

First, let me update AGENTS.md to add this as a critical requirement:

[1 tool called]

Now let me create a dedicated Cursor rule for Cloudflare documentation verification:

[1 tool called]

Now let me update the main RULES.md documentation to include this new rule:

[1 tool called]

Now let me update the rule count in the overview section:

[1 tool called]

Now let me update the rule count in the summary section:

[1 tool called]

Let me continue updating the numbering for all the remaining rules:

[1 tool called]

Let me read the current file to see the structure:

[1 tool called]

I see there's a duplicate numbering issue. Let me fix the numbering by updating each section individually:

[7 tools called]

Now let me update the README.md in the rules directory to include the new rule:

[1 tool called]

Let me read the README file to see its current structure:

[1 tool called]

Now let me update the README to include the new Cloudflare docs verification rule:

[2 tools called]

Now let me check for any linting errors in the files I've modified:

[1 tool called]

Perfect! Let me verify the final structure by checking what we've created:

[1 tool called]

Excellent! I've successfully updated both AGENTS.md and created a comprehensive Cursor rule system for mandatory Cloudflare documentation verification.

## ✅ **Completed Updates**

### **1. Updated AGENTS.md with Mandatory Cloudflare Docs Verification**

Added a new **🔍 MANDATORY CLOUDFLARE DOCUMENTATION VERIFICATION** section that requires:

- **MANDATORY**: Use `mcp_cloudflare-docs_search_cloudflare_documentation` before ANY implementation
- **ALWAYS**: Search Cloudflare docs before developing new features
- **ALWAYS**: Search Cloudflare docs before theorizing bug fixes
- **ALWAYS**: Verify approach against official documentation

### **2. Created New Cursor Rule: `cloudflare-docs-verification.mdc`**

**Key Features:**

- **Always Applied**: `alwaysApply: true` for all code and config files
- **Comprehensive Workflow**: 5-step process for documentation research
- **Specific Triggers**: Clear criteria for when to use the MCP tool
- **Enforcement**: Violation consequences clearly stated

### **3. Updated Documentation Structure**

**Updated Files:**

- **`.cursor/RULES.md`** - Added new rule as #1 priority
- **`.cursor/rules/README.md`** - Added to core architecture rules
- **AGENTS.md** - Enhanced verification protocol

## 🎯 **Key Benefits Achieved**

### **Mandatory Documentation Research**

- **Before any implementation** - Must search Cloudflare docs first
- **Before bug fixes** - Must research solutions in official docs
- **Before architectural decisions** - Must verify against best practices
- **Before using any Cloudflare service** - Must confirm correct usage patterns

### **Comprehensive Coverage**

The rule covers all major Cloudflare services:

- **Workers AI** - Model usage, structured outputs, embeddings
- **D1 Database** - Schema design, migrations, queries
- **Browser Rendering** - Playwright integration, best practices
- **Vectorize** - Embeddings, similarity search, indexing
- **R2 Storage** - Object storage, presigned URLs
- **Workers KV** - Key-value storage, caching patterns
- **Durable Objects** - State management, WebSocket hibernation
- **Queues** - Message processing, retry logic
- **Workflows** - Long-running processes
- **Analytics Engine** - Event tracking, metrics
- **Hyperdrive** - Database connections
- **AI Gateway** - Request routing, caching
- **Agents SDK** - AI agent development

### **Automatic Enforcement**

- **Always Applied**: Rule is automatically included in every AI interaction
- **No Manual Reminders**: AI agents will automatically follow this workflow
- **Consistent Behavior**: Every implementation will be research-driven
- **Quality Assurance**: Ensures all code follows latest Cloudflare best practices

## 📋 **Final Rule System Structure**

```
.cursor/
├── RULES.md                           # Complete rules documentation
├── docs_on_rules.md                  # Cursor documentation (existing)
└── rules/                            # Project Rules (.mdc files)
    ├── README.md                     # Rule system overview
    ├── cloudflare-docs-verification.mdc  # NEW: Mandatory docs research
    ├── architecture.mdc              # Core architecture rules
    ├── typescript-ai-typing.mdc      # TypeScript & AI typing
    ├── package-management.mdc        # Package management rules
    ├── database-api.mdc              # Database & API conventions
    ├── websocket-durable-objects.mdc # WebSocket & Durable Objects
    ├── configuration-security.mdc    # Configuration & security
    ├── testing-code-standards.mdc    # Testing & code quality
    └── email-processing.mdc          # Email processing specific rules
```

**🎯 Result**: Every AI agent interaction will now automatically research Cloudflare documentation before implementing any feature or fixing any bug, ensuring all code follows the latest best practices and official patterns!
