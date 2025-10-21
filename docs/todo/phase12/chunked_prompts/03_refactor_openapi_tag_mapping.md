# Refactor OpenAPI Tag Mapping for Better Maintainability

## Priority: MEDIUM

## Estimated Time: 1-2 hours

## Files Affected: `src/api/openapi-generator.ts`

## Problem

The `getDefaultTags()` method in `openapi-generator.ts` uses a long chain of `if` statements that makes it hard to maintain and extend. This approach increases cyclomatic complexity and makes it difficult to add new path-to-tag mappings.

## Current Implementation Issues

```typescript
// Current brittle approach - NEEDS REFACTORING
private getDefaultTags(path: string): string[] {
  if (path.startsWith("/api/jobs")) return ["Jobs"];
  if (path.startsWith("/api/sites")) return ["Sites"];
  if (path.startsWith("/api/files")) return ["Files"];
  // ... 10+ more if statements
  return ["General"];
}
```

## Required Solution

Refactor the tag mapping logic to use a more maintainable data structure that:

1. **Reduces cyclomatic complexity**
2. **Makes it easy to add new mappings**
3. **Improves readability and maintainability**
4. **Maintains existing functionality**

## Implementation Requirements

### 1. Create Tag Mapping Configuration

```typescript
interface TagMapping {
  prefix: string;
  tag: string;
  priority?: number; // For overlapping prefixes
}

const TAG_MAPPINGS: TagMapping[] = [
  { prefix: "/api/jobs", tag: "Jobs" },
  { prefix: "/api/sites", tag: "Sites" },
  { prefix: "/api/files", tag: "Files" },
  { prefix: "/api/email", tag: "Email" },
  { prefix: "/api/agents", tag: "Agents" },
  { prefix: "/api/tasks", tag: "Tasks" },
  { prefix: "/api/workflows", tag: "Workflows" },
  { prefix: "/api/monitoring", tag: "Monitoring" },
  { prefix: "/api/scrape", tag: "Scraping" },
  { prefix: "/api/runs", tag: "Runs" },
  { prefix: "/api/configs", tag: "Configuration" },
  { prefix: "/api/applicant", tag: "Applicant" },
];
```

### 2. Implement Efficient Lookup

```typescript
private getDefaultTags(path: string): string[] {
  // Sort by priority (if specified) or by prefix length (longest first)
  const sortedMappings = TAG_MAPPINGS.sort((a, b) => {
    if (a.priority !== undefined && b.priority !== undefined) {
      return b.priority - a.priority;
    }
    return b.prefix.length - a.prefix.length;
  });

  for (const mapping of sortedMappings) {
    if (path.startsWith(mapping.prefix)) {
      return [mapping.tag];
    }
  }

  return ["General"];
}
```

### 3. Add Configuration Validation

```typescript
function validateTagMappings(mappings: TagMapping[]): void {
  // Check for duplicate prefixes
  // Validate prefix formats
  // Ensure all mappings have required fields
}
```

## Advanced Features (Optional)

### 1. Support for Multiple Tags

```typescript
interface TagMapping {
  prefix: string;
  tags: string[]; // Support multiple tags per path
  priority?: number;
}
```

### 2. Regex Support

```typescript
interface TagMapping {
  pattern: string | RegExp;
  tag: string;
  priority?: number;
}
```

### 3. Dynamic Tag Loading

```typescript
// Load tag mappings from configuration file
const TAG_MAPPINGS = await loadTagMappingsFromConfig();
```

## Testing Requirements

- Test all existing path mappings
- Test edge cases (empty paths, invalid paths)
- Test priority ordering
- Test new mapping additions
- Test performance with large mapping sets

## Success Criteria

- [ ] All existing path mappings work correctly
- [ ] New mappings can be added easily
- [ ] Code is more readable and maintainable
- [ ] Cyclomatic complexity is reduced
- [ ] Performance is maintained or improved
- [ ] Comprehensive test coverage

## Files to Modify

- `src/api/openapi-generator.ts`
- Add tests in `tests/api/`

## Dependencies

- No external dependencies required
- Should maintain existing OpenAPI generation functionality

## Migration Strategy

1. Create new tag mapping configuration
2. Implement new lookup logic
3. Add comprehensive tests
4. Replace old implementation
5. Verify all existing functionality works
