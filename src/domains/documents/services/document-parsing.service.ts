/**
 * @module src/new/domains/documents/services/document-parsing.service.ts
 * @description
 * This service provides robust functions for parsing and structuring text-based
 * documents, particularly AI-generated Markdown resumes.
 */

// ============================================================================ 
// Types
// ============================================================================ 

export interface ResumeSections {
  summary: string | null;
  experience: string | null;
  skills: string | null;
  [key: string]: string | null; // Allow for other potential sections
}

// ============================================================================ 
// Service Class
// ============================================================================ 

export class DocumentParsingService {
  /**
   * A map of keywords to identify resume sections.
   * Keys are the canonical section names.
   * Values are arrays of possible header texts (case-insensitive).
   */
  private static readonly SECTION_KEYWORDS: Record<keyof Omit<ResumeSections, 'other'>, string[]> = {
    summary: ['summary', 'objective', 'profile'],
    experience: ['experience', 'work history', 'employment history'],
    skills: ['skills', 'technical skills', 'proficiencies'],
  };

  /**
   * Parses a Markdown string into structured resume sections based on headers.
   * This is a robust alternative to brittle splitting methods.
   *
   * @param markdownContent The AI-generated Markdown resume content.
   * @returns A structured ResumeSections object.
   */
  public parseResumeSections(markdownContent: string): ResumeSections {
    const lines = markdownContent.split('\n');
    const sections: ResumeSections = {
      summary: null,
      experience: null,
      skills: null,
    };

    let currentSection: keyof ResumeSections | 'other' = 'summary'; // Default to summary for content before first header
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if the line is a header (e.g., "## Summary" or "Experience\n---")
      const headerMatch = trimmedLine.match(/^(#+\s*)?(.+)/);
      if (!headerMatch) continue;

      const potentialHeaderText = headerMatch[2].trim().toLowerCase();
      let matchedSection: keyof ResumeSections | null = null;

      // Find which section this header corresponds to
      for (const [section, keywords] of Object.entries(DocumentParsingService.SECTION_KEYWORDS)) {
        if (keywords.some(keyword => potentialHeaderText.includes(keyword))) {
          matchedSection = section as keyof ResumeSections;
          break;
        }
      }

      if (matchedSection) {
        // Save the content of the previous section
        if (currentContent.length > 0) {
          sections[currentSection] = (sections[currentSection] || '') + currentContent.join('\n').trim();
        }
        // Start a new section
        currentSection = matchedSection;
        currentContent = [];
      } else {
        // This line is not a section header, so add it to the current section's content
        currentContent.push(line);
      }
    }

    // Add the last section's content
    if (currentContent.length > 0) {
      sections[currentSection] = (sections[currentSection] || '') + currentContent.join('\n').trim();
    }
    
    // Clean up nullish or empty string values
    for(const key in sections){
        if(sections[key] === '' || sections[key] === null){
            sections[key] = null;
        }
    }

    return sections;
  }
}
