# Add Comprehensive Error Handling to Document Processing

## Priority: MEDIUM

## Estimated Time: 2-3 hours

## Files Affected: `src/domains/documents/services/document-processing.service.ts`

## Problem

The document processing service lacks comprehensive error handling, which can lead to silent failures and difficult debugging. The service needs robust error handling for all major operations.

## Current Implementation Issues

- Missing error handling for AI model calls
- No validation of input parameters
- Silent failures in patch application
- Inadequate error logging and reporting
- No retry logic for transient failures

## Required Solution

Implement comprehensive error handling that covers all major operations with proper logging, validation, and recovery strategies.

## Implementation Requirements

### 1. Create Error Types and Classes

```typescript
// src/shared/errors/document-processing-errors.ts
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

export class AIModelError extends DocumentProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, "AI_MODEL_ERROR", context);
  }
}

export class ValidationError extends DocumentProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", context);
  }
}

export class PatchApplicationError extends DocumentProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, "PATCH_APPLICATION_ERROR", context);
  }
}
```

### 2. Input Validation

```typescript
// src/domains/documents/services/document-processing.service.ts
function validateDocumentId(documentId: string): void {
  if (!documentId || typeof documentId !== "string") {
    throw new ValidationError("Document ID is required and must be a string", {
      documentId,
      type: typeof documentId,
    });
  }

  if (documentId.length < 1 || documentId.length > 100) {
    throw new ValidationError(
      "Document ID must be between 1 and 100 characters",
      {
        documentId,
        length: documentId.length,
      }
    );
  }
}

function validatePatches(patches: DocumentPatch[]): void {
  if (!Array.isArray(patches)) {
    throw new ValidationError("Patches must be an array", {
      patches,
      type: typeof patches,
    });
  }

  if (patches.length === 0) {
    throw new ValidationError("At least one patch is required", {
      patches,
    });
  }

  patches.forEach((patch, index) => {
    if (!patch || typeof patch !== "object") {
      throw new ValidationError(`Patch at index ${index} is invalid`, {
        patch,
        index,
      });
    }

    if (!patch.type || !patch.content) {
      throw new ValidationError(
        `Patch at index ${index} missing required fields`,
        {
          patch,
          index,
        }
      );
    }
  });
}
```

### 3. AI Model Error Handling

```typescript
async function callAIModelWithRetry(
  model: string,
  input: any,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await env.AI.run(model, input);
      return response;
    } catch (error) {
      lastError = error as Error;

      // Log the attempt
      console.warn(`AI model call attempt ${attempt} failed:`, {
        model,
        attempt,
        error: error.message,
        context: input,
      });

      // Don't retry on validation errors
      if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        throw new AIModelError(`AI model validation failed: ${error.message}`, {
          model,
          input,
          attempt,
        });
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw new AIModelError(`AI model call failed after ${maxRetries} attempts`, {
    model,
    input,
    lastError: lastError.message,
  });
}
```

### 4. Patch Application Error Handling

```typescript
async function applyPatches(
  documentId: string,
  patches: DocumentPatch[],
  env: Env
): Promise<{ success: boolean; reindexed: boolean; errors?: string[] }> {
  const errors: string[] = [];
  let success = true;
  let reindexed = false;

  try {
    // Validate inputs
    validateDocumentId(documentId);
    validatePatches(patches);

    // Apply patches with error handling
    for (const [index, patch] of patches.entries()) {
      try {
        await applySinglePatch(documentId, patch, env);
      } catch (error) {
        const errorMessage = `Failed to apply patch ${index}: ${error.message}`;
        errors.push(errorMessage);
        console.error(errorMessage, {
          documentId,
          patch,
          index,
          error,
        });
        success = false;
      }
    }

    // Determine if reindexing is needed
    if (success) {
      reindexed = await determineReindexingNeeded(patches, documentId, env);
    }

    return {
      success,
      reindexed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Patch application failed:", {
      documentId,
      patches,
      error: error.message,
    });

    throw new PatchApplicationError(
      `Failed to apply patches: ${error.message}`,
      {
        documentId,
        patches,
        error,
      }
    );
  }
}
```

### 5. Comprehensive Logging

```typescript
// src/shared/logging/document-processing-logger.ts
export class DocumentProcessingLogger {
  static logOperationStart(operation: string, context: Record<string, any>) {
    console.log(`[DocumentProcessing] Starting ${operation}`, {
      timestamp: new Date().toISOString(),
      operation,
      context,
    });
  }

  static logOperationSuccess(operation: string, context: Record<string, any>) {
    console.log(`[DocumentProcessing] Completed ${operation}`, {
      timestamp: new Date().toISOString(),
      operation,
      context,
    });
  }

  static logOperationError(
    operation: string,
    error: Error,
    context: Record<string, any>
  ) {
    console.error(`[DocumentProcessing] Failed ${operation}`, {
      timestamp: new Date().toISOString(),
      operation,
      error: error.message,
      stack: error.stack,
      context,
    });
  }
}
```

### 6. Retry Logic for Transient Failures

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on validation errors
      if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        console.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
          {
            error: error.message,
            attempt,
            maxRetries,
          }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

## Testing Requirements

- Test all error scenarios
- Test retry logic
- Test validation functions
- Test error logging
- Test recovery strategies
- Test edge cases

## Success Criteria

- [ ] All operations have proper error handling
- [ ] Input validation prevents invalid data
- [ ] Retry logic handles transient failures
- [ ] Comprehensive logging for debugging
- [ ] Error messages are informative
- [ ] No silent failures
- [ ] Comprehensive test coverage

## Files to Modify

- `src/domains/documents/services/document-processing.service.ts`
- `src/shared/errors/document-processing-errors.ts` (new file)
- `src/shared/logging/document-processing-logger.ts` (new file)

## Dependencies

- No external dependencies required
- Should maintain existing functionality
- May need to update related tests

## Migration Strategy

1. Create error types and classes
2. Add input validation functions
3. Implement retry logic
4. Add comprehensive logging
5. Update all service methods
6. Add comprehensive tests
7. Verify existing functionality still works
