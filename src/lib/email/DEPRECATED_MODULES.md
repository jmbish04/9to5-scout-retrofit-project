# Deprecated Email Modules

## ⚠️ **DEPRECATION NOTICE**

The following modules have been **DEPRECATED** in favor of the new `EmailProcessorAgent` using the Cloudflare Agents SDK:

### **Deprecated Modules:**

1. **`src/lib/email/parsing.ts`** - Email parsing functions
2. **`src/lib/email/otp-handling.ts`** - OTP detection and forwarding functions

### **Replacement:**

All functionality has been consolidated into the **`EmailProcessorAgent`** located at:

- **`src/lib/agents/email-processor-agent.ts`**

## 🔄 **Migration Guide**

### **Old Parsing Functions → EmailProcessorAgent**

| Old Function                      | New Location                          | Status      |
| --------------------------------- | ------------------------------------- | ----------- |
| `parseEmailFromRequest()`         | `EmailProcessorAgent.parseEmail()`    | ✅ Replaced |
| `parseEnhancedEmailFromRequest()` | `EmailProcessorAgent.parseEmail()`    | ✅ Replaced |
| `processEmailFromRouting()`       | `EmailProcessorAgent.email()`         | ✅ Replaced |
| `processEmailWithAI()`            | `EmailProcessorAgent.classifyEmail()` | ✅ Replaced |
| `classifyEmailContent()`          | `EmailProcessorAgent.classifyEmail()` | ✅ Replaced |

### **Old OTP Functions → EmailProcessorAgent**

| Old Function         | New Location                            | Status      |
| -------------------- | --------------------------------------- | ----------- |
| `detectOTPCode()`    | `EmailProcessorAgent.extractOTPCode()`  | ✅ Replaced |
| `sendOTPAlert()`     | `EmailProcessorAgent.forwardOTP()`      | ✅ Replaced |
| `logOTPForwarding()` | `EmailProcessorAgent.updateLogStatus()` | ✅ Replaced |

## 🎯 **Benefits of EmailProcessorAgent**

### **Consolidated Processing:**

- ✅ **Single entry point** for all email processing
- ✅ **AI-powered classification** using Workers AI
- ✅ **Automatic job link extraction** and processing
- ✅ **OTP detection and forwarding** built-in
- ✅ **Centralized logging** to `email_logs` table

### **Enhanced Features:**

- ✅ **Structured AI responses** with JSON schema validation
- ✅ **Better error handling** and fallback mechanisms
- ✅ **Comprehensive logging** with metadata tracking
- ✅ **Automatic job processing** integration
- ✅ **OTP forwarding** with email notifications

### **Agent SDK Benefits:**

- ✅ **Stateful processing** with Durable Objects
- ✅ **Better resource management** and scaling
- ✅ **Enhanced debugging** and monitoring
- ✅ **Future extensibility** for complex workflows

## 🚨 **Breaking Changes**

### **Function Signatures:**

- Old functions used separate parameters
- New agent uses `ForwardableEmailMessage` directly
- All processing happens within the agent instance

### **Database Schema:**

- Now uses centralized `email_logs` table
- All AI classification data stored in single table
- Enhanced metadata tracking

### **Error Handling:**

- Agent provides better error isolation
- Automatic fallback to original processing
- Enhanced logging and debugging

## 📝 **Usage Examples**

### **Old Way (Deprecated):**

```typescript
// ❌ DEPRECATED - Don't use these functions
import { parseEmailFromRequest, processEmailWithAI } from "./parsing";
import { detectOTPCode, sendOTPAlert } from "./otp-handling";

const parsed = await parseEmailFromRequest(request);
const classification = await processEmailWithAI(env, parsed);
const otpCode = detectOTPCode(parsed.content);
if (otpCode) {
  await sendOTPAlert(env, otpCode);
}
```

### **New Way (EmailProcessorAgent):**

```typescript
// ✅ NEW - Use the EmailProcessorAgent
import { EmailProcessorAgent } from "./agents/email-processor-agent";

const agentId = env.EMAIL_PROCESSOR_AGENT.newUniqueId();
const agent = env.EMAIL_PROCESSOR_AGENT.get(agentId);
await agent.email(message, env);
// All processing (parsing, AI classification, OTP detection, job processing) happens automatically
```

## 🔧 **Configuration**

### **Required Environment Variables:**

```bash
# AI Model for email classification
DEFAULT_MODEL_REASONING="@cf/meta/llama-3.3-70b-instruct-fp8-fast"

# OTP forwarding (optional)
OTP_FORWARD_EMAIL="your-email@example.com"

# Email sender for OTP notifications
EMAIL_SENDER="noreply@yourdomain.com"
```

### **Wrangler Configuration:**

```toml
# Durable Object binding
[durable_objects]
bindings = [
  { name = "EMAIL_PROCESSOR_AGENT", class_name = "EmailProcessorAgent" }
]

# Migration for agent storage
[[migrations]]
tag = "v4"
new_sqlite_classes = ["EmailProcessorAgent"]
```

## 🗑️ **Removal Timeline**

### **Phase 1: Deprecation (Current)**

- ✅ Mark modules as deprecated
- ✅ Create EmailProcessorAgent
- ✅ Update main email handler
- ✅ Maintain backward compatibility

### **Phase 2: Migration (Next)**

- 🔄 Update all references to use agent
- 🔄 Remove old function calls
- 🔄 Update documentation

### **Phase 3: Cleanup (Future)**

- 🗑️ Remove deprecated modules
- 🗑️ Clean up unused imports
- 🗑️ Update tests

## 📚 **Additional Resources**

- **EmailProcessorAgent Documentation**: `src/lib/agents/email-processor-agent.ts`
- **Email System Guide**: `src/lib/email/AGENTS.md`
- **Cloudflare Agents SDK**: [Official Documentation](https://developers.cloudflare.com/agents/)

---

**⚠️ IMPORTANT**: Do not use the deprecated functions in new code. Always use the `EmailProcessorAgent` for email processing.
