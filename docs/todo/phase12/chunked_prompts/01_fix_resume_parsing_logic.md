# Fix Resume Parsing Logic - Brittle Section Detection

## Priority: HIGH

## Estimated Time: 2-3 hours

## Files Affected: `src/domains/documents/services/document-processing.service.ts`

## Problem

The current resume parsing logic in `document-processing.service.ts` is brittle and relies on:

- Double newlines to separate sections
- Exact section order expectations
- Position-based parsing instead of content-based parsing

This approach breaks when AI models vary their output format, leading to parsing failures.

## Current Implementation Issues

```typescript
// Current brittle approach - DON'T USE
const sections = generatedMarkdown.split("\n\n");
const summary = sections[0];
const experience = sections[1];
// ... etc
```

## Required Solution

Implement robust header-based section detection that:

1. **Identifies sections by headers** (e.g., 'Summary', 'Experience', 'Education', 'Skills')
2. **Handles variations in AI output format** (different spacing, order, etc.)
3. **Provides fallback parsing** for edge cases
4. **Maintains backward compatibility** with existing data

## Implementation Requirements

### 1. Create Header Detection Function

```typescript
function detectSections(markdown: string): Record<string, string> {
  // Parse sections based on common headers
  // Handle variations in header formatting
  // Return structured object with section content
}
```

### 2. Common Headers to Detect

- Summary / Professional Summary / Overview
- Experience / Work Experience / Professional Experience
- Education / Academic Background
- Skills / Technical Skills / Core Competencies
- Projects / Key Projects
- Certifications / Licenses
- Languages

### 3. Handle Header Variations

- Case insensitive matching
- Handle extra whitespace
- Support different header formats (##, ###, **Header**, etc.)
- Handle missing headers gracefully

### 4. Fallback Strategy

- If header-based parsing fails, fall back to position-based
- Log warnings for manual review
- Provide meaningful error messages

## Testing Requirements

- Test with various AI model outputs
- Test with missing sections
- Test with different header formats
- Test with extra whitespace and formatting variations

## Success Criteria

- [ ] Resume parsing works with different AI model outputs
- [ ] Handles missing or reordered sections gracefully
- [ ] Maintains existing functionality
- [ ] Includes comprehensive test coverage
- [ ] Logs parsing issues for monitoring

## Files to Modify

- `src/domains/documents/services/document-processing.service.ts`
- Add tests in `tests/domains/documents/`

## Dependencies

- No external dependencies required
- Should work with existing AI model integration
