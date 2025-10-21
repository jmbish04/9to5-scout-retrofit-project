# Extract Shared File Type Constants

## Priority: MEDIUM

## Estimated Time: 1 hour

## Files Affected: `src/api/openapi-routes.ts`

## Problem

The file type enum array is duplicated in multiple locations within `openapi-routes.ts` (lines 67-80 and 133-146), violating the DRY principle and making maintenance difficult. Changes to file types require updates in multiple places.

## Current Implementation Issues

```typescript
// Duplicated enum - NEEDS EXTRACTION
schema: {
  type: "string",
  enum: [
    "resume",
    "cover-letter",
    "job-posting",
    "scraped-content",
    "email-template",
    "report",
    "backup",
    "temp",
    "misc",
  ],
},
// ... later in the same file ...
enum: [
  "resume",
  "cover-letter",
  "job-posting",
  "scraped-content",
  "email-template",
  "report",
  "backup",
  "temp",
  "misc",
],
```

## Required Solution

Extract the file type enum into a shared constant that can be referenced throughout the codebase, ensuring consistency and easier maintenance.

## Implementation Requirements

### 1. Create Shared Constants File

```typescript
// src/shared/constants/file-types.ts
export const FILE_TYPES = [
  "resume",
  "cover-letter",
  "job-posting",
  "scraped-content",
  "email-template",
  "report",
  "backup",
  "temp",
  "misc",
] as const;

export type FileType = (typeof FILE_TYPES)[number];

// Validation helper
export function isValidFileType(type: string): type is FileType {
  return FILE_TYPES.includes(type as FileType);
}
```

### 2. Update OpenAPI Routes

```typescript
// src/api/openapi-routes.ts
import { FILE_TYPES } from '../shared/constants/file-types';

// Replace duplicated enums with reference
schema: {
  type: "string",
  enum: FILE_TYPES,
},
```

### 3. Add Type Safety

```typescript
// Use the FileType type for better type safety
function processFile(type: FileType) {
  // Type-safe file processing
}
```

## Additional Improvements

### 1. Categorize File Types

```typescript
// src/shared/constants/file-types.ts
export const FILE_TYPE_CATEGORIES = {
  DOCUMENTS: ["resume", "cover-letter", "job-posting"] as const,
  CONTENT: ["scraped-content", "email-template"] as const,
  SYSTEM: ["report", "backup", "temp", "misc"] as const,
} as const;

export const FILE_TYPES = [
  ...FILE_TYPE_CATEGORIES.DOCUMENTS,
  ...FILE_TYPE_CATEGORIES.CONTENT,
  ...FILE_TYPE_CATEGORIES.SYSTEM,
] as const;
```

### 2. Add Metadata

```typescript
// src/shared/constants/file-types.ts
export const FILE_TYPE_METADATA = {
  resume: {
    description: "Resume documents",
    maxSize: "5MB",
    allowedExtensions: [".pdf", ".doc", ".docx"],
  },
  "cover-letter": {
    description: "Cover letter documents",
    maxSize: "2MB",
    allowedExtensions: [".pdf", ".doc", ".docx"],
  },
  // ... etc
} as const;
```

### 3. Validation Functions

```typescript
// src/shared/constants/file-types.ts
export function getFileTypeMetadata(type: FileType) {
  return FILE_TYPE_METADATA[type] || null;
}

export function validateFileType(
  type: string,
  fileSize?: number
): {
  valid: boolean;
  error?: string;
} {
  if (!isValidFileType(type)) {
    return { valid: false, error: `Invalid file type: ${type}` };
  }

  const metadata = getFileTypeMetadata(type);
  if (metadata && fileSize && fileSize > parseFileSize(metadata.maxSize)) {
    return { valid: false, error: `File too large for type ${type}` };
  }

  return { valid: true };
}
```

## Testing Requirements

- Test all file type validations
- Test type safety with TypeScript
- Test metadata retrieval
- Test validation functions
- Test edge cases (invalid types, missing metadata)

## Success Criteria

- [ ] File type enum is defined in one place
- [ ] All references use the shared constant
- [ ] Type safety is improved
- [ ] No duplication of file type definitions
- [ ] Easy to add new file types
- [ ] Comprehensive test coverage

## Files to Modify

- `src/api/openapi-routes.ts` (remove duplications)
- `src/shared/constants/file-types.ts` (new file)
- Any other files that reference file types

## Dependencies

- No external dependencies required
- Should maintain existing OpenAPI schema generation

## Migration Strategy

1. Create shared constants file
2. Update all references to use shared constant
3. Add type safety improvements
4. Add comprehensive tests
5. Verify OpenAPI generation still works correctly
