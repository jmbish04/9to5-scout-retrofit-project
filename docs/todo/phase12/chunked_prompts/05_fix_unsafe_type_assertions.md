# Fix Unsafe Type Assertions in Applicant Storage

## Priority: MEDIUM

## Estimated Time: 2-3 hours

## Files Affected: `src/domains/applicants/services/applicant-storage.service.ts`

## Problem

The `getJobHistorySubmissions` function uses unsafe type assertion `as unknown as JobHistorySubmission[]` which bypasses TypeScript's type safety and can hide potential bugs if the database structure changes.

## Current Implementation Issues

```typescript
// Unsafe type assertion - NEEDS FIXING
return (results.results || []) as unknown as JobHistorySubmission[];
```

## Required Solution

Replace unsafe type assertions with proper type validation and mapping that ensures data conforms to the expected interface structure.

## Implementation Requirements

### 1. Create Type Guard Function

```typescript
// src/shared/validation/type-guards.ts
export function isJobHistorySubmission(data: any): data is JobHistorySubmission {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.applicantId === 'string' &&
    typeof data.jobId === 'string' &&
    typeof data.submittedAt === 'string' &&
    // Add all required field validations
  );
}

export function isJobHistorySubmissionArray(data: any): data is JobHistorySubmission[] {
  return Array.isArray(data) && data.every(isJobHistorySubmission);
}
```

### 2. Create Data Mapping Function

```typescript
// src/domains/applicants/services/applicant-storage.service.ts
function mapToJobHistorySubmissions(rawData: any[]): JobHistorySubmission[] {
  return rawData.filter(isJobHistorySubmission).map((item) => ({
    id: item.id,
    applicantId: item.applicantId,
    jobId: item.jobId,
    submittedAt: new Date(item.submittedAt),
    // Map all required fields
  }));
}
```

### 3. Update getJobHistorySubmissions Function

```typescript
async getJobHistorySubmissions(applicantId: string): Promise<JobHistorySubmission[]> {
  const results = await this.db
    .prepare(`
      SELECT * FROM job_history_submissions
      WHERE applicant_id = ?
      ORDER BY submitted_at DESC
    `)
    .bind(applicantId)
    .all();

  // Safe type validation and mapping
  const rawData = results.results || [];
  return mapToJobHistorySubmissions(rawData);
}
```

## Advanced Type Safety Improvements

### 1. Database Result Type Definition

```typescript
// src/shared/types/database.ts
interface DatabaseJobHistorySubmission {
  id: string;
  applicant_id: string;
  job_id: string;
  submitted_at: string;
  // Add all database field types
}

// Type-safe database query
async getJobHistorySubmissions(applicantId: string): Promise<JobHistorySubmission[]> {
  const results = await this.db
    .prepare(`
      SELECT * FROM job_history_submissions
      WHERE applicant_id = ?
      ORDER BY submitted_at DESC
    `)
    .bind(applicantId)
    .all() as { results: DatabaseJobHistorySubmission[] };

  return results.results.map(this.mapDatabaseToJobHistorySubmission);
}
```

### 2. Mapping Function with Validation

```typescript
private mapDatabaseToJobHistorySubmission(
  dbItem: DatabaseJobHistorySubmission
): JobHistorySubmission {
  // Validate required fields
  if (!dbItem.id || !dbItem.applicant_id || !dbItem.job_id) {
    throw new Error('Invalid job history submission data: missing required fields');
  }

  return {
    id: dbItem.id,
    applicantId: dbItem.applicant_id,
    jobId: dbItem.job_id,
    submittedAt: new Date(dbItem.submitted_at),
    // Map all fields with validation
  };
}
```

### 3. Error Handling

```typescript
async getJobHistorySubmissions(applicantId: string): Promise<JobHistorySubmission[]> {
  try {
    const results = await this.db
      .prepare(`
        SELECT * FROM job_history_submissions
        WHERE applicant_id = ?
        ORDER BY submitted_at DESC
      `)
      .bind(applicantId)
      .all();

    const rawData = results.results || [];

    // Validate and map data
    const mappedData = rawData.map(item => {
      try {
        return this.mapDatabaseToJobHistorySubmission(item);
      } catch (error) {
        console.warn(`Skipping invalid job history submission: ${error.message}`);
        return null;
      }
    }).filter(Boolean) as JobHistorySubmission[];

    return mappedData;
  } catch (error) {
    console.error('Error fetching job history submissions:', error);
    throw new Error('Failed to fetch job history submissions');
  }
}
```

## Testing Requirements

- Test with valid database results
- Test with invalid/malformed data
- Test type guard functions
- Test mapping functions
- Test error handling scenarios
- Test edge cases (empty results, null values)

## Success Criteria

- [ ] No unsafe type assertions remain
- [ ] All data is properly validated before use
- [ ] Type safety is maintained throughout
- [ ] Error handling is robust
- [ ] Performance is not significantly impacted
- [ ] Comprehensive test coverage

## Files to Modify

- `src/domains/applicants/services/applicant-storage.service.ts`
- `src/shared/validation/type-guards.ts` (new file)
- `src/shared/types/database.ts` (new file)

## Dependencies

- No external dependencies required
- Should maintain existing functionality
- May need to update related tests

## Migration Strategy

1. Create type guard and mapping functions
2. Update the problematic function
3. Add comprehensive error handling
4. Add tests for all scenarios
5. Verify existing functionality still works
6. Remove any remaining unsafe type assertions
