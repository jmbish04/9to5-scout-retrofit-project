/**
 * Email search and filtering functionality
 */

import type { Env } from "../../config/env";

/**
 * Build WHERE clause and parameters for email filtering
 */
export function buildEmailFilterWhereClause(filters: {
  status?: string;
  fromEmail?: string;
  toEmail?: string;
  otpDetected?: string;
  otpOnly?: boolean;
  classification?: string;
  dateFrom?: string;
  dateTo?: string;
  subject?: string;
  search?: string;
  searchType?: string;
}): {
  whereClause: string;
  params: any[];
} {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  // Apply filters
  if (filters.status) {
    whereClause += ` AND e.status = ?`;
    params.push(filters.status);
  }

  if (filters.fromEmail) {
    whereClause += ` AND e.from_email LIKE ?`;
    params.push(`%${filters.fromEmail}%`);
  }

  if (filters.toEmail) {
    whereClause += ` AND e.to_email LIKE ?`;
    params.push(`%${filters.toEmail}%`);
  }

  if (filters.otpDetected !== null && filters.otpDetected !== undefined) {
    whereClause += ` AND e.otp_detected = ?`;
    params.push(filters.otpDetected === "true" ? 1 : 0);
  }

  if (filters.otpOnly) {
    whereClause += ` AND e.otp_detected = 1`;
  }

  if (filters.classification) {
    whereClause += ` AND e.ai_classification = ?`;
    params.push(filters.classification);
  }

  if (filters.dateFrom) {
    whereClause += ` AND e.received_at >= ?`;
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    whereClause += ` AND e.received_at <= ?`;
    params.push(filters.dateTo);
  }

  // Apply search
  if (filters.search) {
    if (filters.searchType === "fulltext") {
      whereClause += ` AND (
        e.subject LIKE ? OR 
        e.content_text LIKE ? OR 
        e.content_html LIKE ? OR
        e.from_email LIKE ? OR
        e.to_email LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    // Note: Semantic and AI search are handled separately
  }

  return { whereClause, params };
}

/**
 * Build search WHERE clause for fallback keyword search
 */
export function buildSearchWhereClause(searchTerm: string): {
  whereClause: string;
  params: any[];
} {
  const whereClause = `WHERE (
    e.subject LIKE ? OR 
    e.content_text LIKE ? OR 
    e.content_html LIKE ? OR
    e.from_email LIKE ? OR
    e.to_email LIKE ?
  )`;

  const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

  return { whereClause, params };
}

/**
 * Generate AI search terms from natural language query
 */
export async function generateAISearchTerms(
  env: Env,
  query: string
): Promise<string[]> {
  try {
    const prompt = `Analyze this search query and extract relevant search terms for finding emails. 
    Return only the most important keywords and phrases that would help find relevant emails.
    
    Query: "${query}"
    
    Return the terms as a comma-separated list, maximum 5 terms:`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const terms =
      (response as any).response
        ?.trim()
        .split(",")
        .map((term: string) => term.trim()) || [];
    return terms.filter((term: string) => term.length > 0).slice(0, 5);
  } catch (error) {
    console.error("Failed to generate AI search terms:", error);
    return [query]; // Fallback to original query
  }
}
