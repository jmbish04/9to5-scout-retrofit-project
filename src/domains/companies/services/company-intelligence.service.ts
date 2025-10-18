/**
 * Company Intelligence Service
 *
 * Service for company research, intelligence gathering, and analysis.
 * Handles company profiling, culture analysis, and interview insights.
 */

import type { Env } from "../../../config/env";
import type { CompanyResearch } from "../types/company.types";

export class CompanyIntelligenceService {
  constructor(private env: Env) {}

  /**
   * Research a company comprehensively
   */
  async researchCompany(
    companyName: string,
    domain?: string,
    industry?: string
  ): Promise<CompanyResearch> {
    const researchId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create research record
    const research: CompanyResearch = {
      id: researchId,
      company_name: companyName,
      domain,
      industry,
      status: "queued",
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(
      `
      INSERT INTO company_research (
        id, company_name, domain, industry, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        research.id,
        research.company_name,
        research.domain,
        research.industry,
        research.status,
        research.created_at,
        research.updated_at
      )
      .run();

    // Start research workflow
    await this.startResearchWorkflow(researchId);

    return research;
  }

  /**
   * Start research workflow
   */
  private async startResearchWorkflow(researchId: string): Promise<void> {
    try {
      // Update status to processing
      await this.env.DB.prepare(
        `
        UPDATE company_research 
        SET status = 'processing', updated_at = ?
        WHERE id = ?
      `
      )
        .bind(new Date().toISOString(), researchId)
        .run();

      // Schedule research steps
      await this.scheduleResearchStep(researchId, "gatherBasicInfo", 1000);
      await this.scheduleResearchStep(researchId, "analyzeCulture", 2000);
      await this.scheduleResearchStep(researchId, "gatherNews", 3000);
      await this.scheduleResearchStep(researchId, "researchLeadership", 4000);
      await this.scheduleResearchStep(researchId, "analyzeBenefits", 5000);
      await this.scheduleResearchStep(researchId, "generateInsights", 6000);

      console.log(`Research workflow started for ${researchId}`);
    } catch (error) {
      console.error(`Failed to start research for ${researchId}:`, error);
      await this.updateResearchStatus(researchId, "failed");
    }
  }

  /**
   * Schedule a research step
   */
  private async scheduleResearchStep(
    researchId: string,
    step: string,
    delay: number
  ): Promise<void> {
    // In a real implementation, this would use a proper task scheduler
    // For now, we'll simulate the scheduling
    setTimeout(async () => {
      await this.executeResearchStep(researchId, step);
    }, delay);
  }

  /**
   * Execute a research step
   */
  private async executeResearchStep(
    researchId: string,
    step: string
  ): Promise<void> {
    try {
      console.log(`Executing research step: ${step} for ${researchId}`);

      switch (step) {
        case "gatherBasicInfo":
          await this.gatherBasicInfo(researchId);
          break;
        case "analyzeCulture":
          await this.analyzeCulture(researchId);
          break;
        case "gatherNews":
          await this.gatherNews(researchId);
          break;
        case "researchLeadership":
          await this.researchLeadership(researchId);
          break;
        case "analyzeBenefits":
          await this.analyzeBenefits(researchId);
          break;
        case "generateInsights":
          await this.generateInsights(researchId);
          break;
        default:
          console.warn(`Unknown research step: ${step}`);
      }
    } catch (error) {
      console.error(`Error executing research step ${step}:`, error);
      await this.updateResearchStatus(researchId, "failed");
    }
  }

  /**
   * Gather basic company information
   */
  private async gatherBasicInfo(researchId: string): Promise<void> {
    await this.updateResearchStatus(researchId, "gathering_info");

    // Get research data
    const research = await this.getResearchById(researchId);
    if (!research) return;

    // Use AI to gather basic company information
    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "You are a company research assistant. Gather comprehensive information about companies including their industry, size, location, mission, and key facts.",
            },
            {
              role: "user",
              content: `Research the company: ${research.company_name}${
                research.domain ? ` (${research.domain})` : ""
              }${
                research.industry ? ` in the ${research.industry} industry` : ""
              }. Provide detailed information about the company.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const companyInfo = JSON.parse(response.response as string);

      // Update company profile if it exists, or create new one
      await this.updateOrCreateCompanyProfile(
        research.company_name,
        companyInfo
      );
    } catch (error) {
      console.error("Error gathering basic info:", error);
    }
  }

  /**
   * Analyze company culture
   */
  private async analyzeCulture(researchId: string): Promise<void> {
    await this.updateResearchStatus(researchId, "analyzing_culture");

    const research = await this.getResearchById(researchId);
    if (!research) return;

    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "You are a company culture analyst. Analyze company culture, values, work environment, and employee benefits based on available information.",
            },
            {
              role: "user",
              content: `Analyze the company culture for: ${research.company_name}. Focus on work environment, company values, employee perks, remote work policies, and diversity initiatives.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const cultureData = JSON.parse(response.response as string);

      // Update company with culture information
      await this.updateCompanyCulture(research.company_name, cultureData);
    } catch (error) {
      console.error("Error analyzing culture:", error);
    }
  }

  /**
   * Gather company news and updates
   */
  private async gatherNews(researchId: string): Promise<void> {
    await this.updateResearchStatus(researchId, "gathering_news");

    const research = await this.getResearchById(researchId);
    if (!research) return;

    try {
      // In a real implementation, this would fetch actual news
      // For now, we'll use AI to generate relevant news insights
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "You are a news analyst. Provide recent news and updates about companies, including product launches, funding rounds, leadership changes, and industry developments.",
            },
            {
              role: "user",
              content: `Find recent news and updates about: ${research.company_name}. Include any significant developments, product launches, funding news, or leadership changes.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const newsData = JSON.parse(response.response as string);

      // Update company with news information
      await this.updateCompanyNews(research.company_name, newsData);
    } catch (error) {
      console.error("Error gathering news:", error);
    }
  }

  /**
   * Research company leadership
   */
  private async researchLeadership(researchId: string): Promise<void> {
    await this.updateResearchStatus(researchId, "researching_leadership");

    const research = await this.getResearchById(researchId);
    if (!research) return;

    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "You are a leadership research assistant. Research company leadership teams, including key executives, their backgrounds, and leadership styles.",
            },
            {
              role: "user",
              content: `Research the leadership team for: ${research.company_name}. Include key executives, their titles, backgrounds, and any notable achievements.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const leadershipData = JSON.parse(response.response as string);

      // Update company with leadership information
      await this.updateCompanyLeadership(research.company_name, leadershipData);
    } catch (error) {
      console.error("Error researching leadership:", error);
    }
  }

  /**
   * Analyze company benefits
   */
  private async analyzeBenefits(researchId: string): Promise<void> {
    await this.updateResearchStatus(researchId, "analyzing_benefits");

    const research = await this.getResearchById(researchId);
    if (!research) return;

    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "You are a benefits analyst. Analyze company benefits packages, including health insurance, retirement plans, vacation policies, and other perks.",
            },
            {
              role: "user",
              content: `Analyze the benefits package for: ${research.company_name}. Include health insurance, retirement plans, vacation policies, and other employee perks.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const benefitsData = JSON.parse(response.response as string);

      // Update company with benefits information
      await this.updateCompanyBenefits(research.company_name, benefitsData);
    } catch (error) {
      console.error("Error analyzing benefits:", error);
    }
  }

  /**
   * Generate interview insights
   */
  private async generateInsights(researchId: string): Promise<void> {
    await this.updateResearchStatus(researchId, "completed");

    const research = await this.getResearchById(researchId);
    if (!research) return;

    try {
      const response = await this.env.AI.run(
        this.env.DEFAULT_MODEL_REASONING as keyof AiModels,
        {
          messages: [
            {
              role: "system",
              content:
                "You are an interview preparation expert. Generate comprehensive interview insights including common questions, interview process, difficulty level, and preparation tips.",
            },
            {
              role: "user",
              content: `Generate interview insights for: ${research.company_name}. Include common interview questions, interview process, difficulty level, and preparation tips.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
        }
      );

      const insightsData = JSON.parse(response.response as string);

      // Update company with interview insights
      await this.updateCompanyInterviewInsights(
        research.company_name,
        insightsData
      );
    } catch (error) {
      console.error("Error generating insights:", error);
    }
  }

  /**
   * Update research status
   */
  private async updateResearchStatus(
    researchId: string,
    status: CompanyResearch["status"]
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE company_research 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `
    )
      .bind(status, new Date().toISOString(), researchId)
      .run();
  }

  /**
   * Get research by ID
   */
  private async getResearchById(
    researchId: string
  ): Promise<CompanyResearch | null> {
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM company_research WHERE id = ?
    `
    )
      .bind(researchId)
      .first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      company_name: result.company_name as string,
      domain: result.domain as string | undefined,
      industry: result.industry as string | undefined,
      status: result.status as CompanyResearch["status"],
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    };
  }

  /**
   * Update or create company profile
   */
  private async updateOrCreateCompanyProfile(
    companyName: string,
    companyInfo: any
  ): Promise<void> {
    // Check if company exists
    const existing = await this.env.DB.prepare(
      `
      SELECT id FROM companies WHERE name = ?
    `
    )
      .bind(companyName)
      .first();

    if (existing) {
      // Update existing company
      await this.env.DB.prepare(
        `
        UPDATE companies 
        SET description = ?, industry = ?, size = ?, location = ?, 
            mission = ?, company_values = ?, updated_at = ?
        WHERE name = ?
      `
      )
        .bind(
          companyInfo.description,
          companyInfo.industry,
          companyInfo.size,
          companyInfo.location,
          companyInfo.mission,
          companyInfo.company_values
            ? JSON.stringify(companyInfo.company_values)
            : null,
          new Date().toISOString(),
          companyName
        )
        .run();
    } else {
      // Create new company
      const companyId = crypto.randomUUID();
      const now = new Date().toISOString();

      await this.env.DB.prepare(
        `
        INSERT INTO companies (
          id, name, description, industry, size, location, mission, 
          company_values, last_updated, research_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          companyId,
          companyName,
          companyInfo.description,
          companyInfo.industry,
          companyInfo.size,
          companyInfo.location,
          companyInfo.mission,
          companyInfo.company_values
            ? JSON.stringify(companyInfo.company_values)
            : null,
          now,
          1,
          now,
          now
        )
        .run();
    }
  }

  /**
   * Update company culture
   */
  private async updateCompanyCulture(
    companyName: string,
    cultureData: any
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE companies 
      SET culture = ?, updated_at = ?
      WHERE name = ?
    `
    )
      .bind(JSON.stringify(cultureData), new Date().toISOString(), companyName)
      .run();
  }

  /**
   * Update company news
   */
  private async updateCompanyNews(
    companyName: string,
    newsData: any
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE companies 
      SET recent_news = ?, updated_at = ?
      WHERE name = ?
    `
    )
      .bind(
        JSON.stringify(newsData.news || []),
        new Date().toISOString(),
        companyName
      )
      .run();
  }

  /**
   * Update company leadership
   */
  private async updateCompanyLeadership(
    companyName: string,
    leadershipData: any
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE companies 
      SET leadership = ?, updated_at = ?
      WHERE name = ?
    `
    )
      .bind(
        JSON.stringify(leadershipData.leadership || []),
        new Date().toISOString(),
        companyName
      )
      .run();
  }

  /**
   * Update company benefits
   */
  private async updateCompanyBenefits(
    companyName: string,
    benefitsData: any
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE companies 
      SET benefits = ?, updated_at = ?
      WHERE name = ?
    `
    )
      .bind(
        JSON.stringify(benefitsData.benefits || []),
        new Date().toISOString(),
        companyName
      )
      .run();
  }

  /**
   * Update company interview insights
   */
  private async updateCompanyInterviewInsights(
    companyName: string,
    insightsData: any
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      UPDATE companies 
      SET interview_insights = ?, updated_at = ?
      WHERE name = ?
    `
    )
      .bind(JSON.stringify(insightsData), new Date().toISOString(), companyName)
      .run();
  }
}

/**
 * Factory function to create a CompanyIntelligenceService instance
 */
export function createCompanyIntelligenceService(
  env: Env
): CompanyIntelligenceService {
  return new CompanyIntelligenceService(env);
}
