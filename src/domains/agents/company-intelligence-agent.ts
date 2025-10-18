/**
 * CompanyIntelligenceAgent - Continuous company research and intelligence gathering
 *
 * Capabilities:
 * - Company profile building
 * - Culture analysis
 * - News monitoring
 * - Financial data gathering
 * - Leadership research
 * - Benefits analysis
 * - Interview insights generation
 */

import { Agent } from "agents";
import type { Env } from "../../config/env/env.config";

export interface CompanyIntelligenceState {
  status: "idle" | "processing" | "error" | "completed";
  lastActivity: string;
  metadata: Record<string, any>;
  errorCount: number;
  successCount: number;
  monitoredCompanies: string[];
  researchQueue: any[];
  activeResearch: string[];
}

export class CompanyIntelligenceAgent extends Agent<
  Env,
  CompanyIntelligenceState
> {
  constructor(state: any, env: Env) {
    super(state, env);
  }

  /**
   * Initialize agent with default state
   */
  async initialize(): Promise<void> {
    if (!this.state.monitoredCompanies) {
      await this.setState({
        ...this.state,
        monitoredCompanies: [],
        researchQueue: [],
        activeResearch: [],
      });
    }

    console.log("CompanyIntelligenceAgent initialized", {
      monitoredCompanies: this.state.monitoredCompanies.length,
      researchQueue: this.state.researchQueue.length,
    });
  }

  /**
   * Handle HTTP requests to the agent
   */
  async onRequest(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      switch (path) {
        case "/research-company":
          return await this.handleResearchCompany(request);
        case "/get-company-profile":
          return await this.handleGetCompanyProfile(request);
        case "/add-to-monitoring":
          return await this.handleAddToMonitoring(request);
        case "/remove-from-monitoring":
          return await this.handleRemoveFromMonitoring(request);
        case "/get-interview-insights":
          return await this.handleGetInterviewInsights(request);
        case "/status":
          return await this.handleStatus(request);
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error("Request handling failed:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  /**
   * Research a company
   */
  private async handleResearchCompany(request: Request): Promise<Response> {
    try {
      const { companyName, domain, industry } = (await request.json()) as {
        companyName: string;
        domain?: string;
        industry?: string;
      };

      if (!companyName) {
        return new Response("Missing companyName", { status: 400 });
      }

      const researchId = `research_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Add to research queue
      const updatedQueue = [
        ...this.state.researchQueue,
        {
          id: researchId,
          companyName,
          domain,
          industry,
          status: "queued",
          createdAt: new Date().toISOString(),
        },
      ];

      await this.setState({
        ...this.state,
        researchQueue: updatedQueue,
        lastActivity: new Date().toISOString(),
      });

      // Store in database
      await this.sql`
        INSERT INTO company_research (
          id, company_name, domain, industry, status, created_at, updated_at
        ) VALUES (
          ${researchId},
          ${companyName},
          ${domain || null},
          ${industry || null},
          'queued',
          ${new Date().toISOString()},
          ${new Date().toISOString()}
        )
      `;

      // Start research workflow
      await this.schedule(1000, "startResearch", { researchId });

      console.log("Company research initiated", { researchId, companyName });
      return new Response(JSON.stringify({ success: true, researchId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to initiate company research:", error);
      return new Response("Failed to initiate research", { status: 500 });
    }
  }

  /**
   * Get company profile
   */
  private async handleGetCompanyProfile(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const companyId = url.searchParams.get("companyId");

      if (!companyId) {
        return new Response("Missing companyId", { status: 400 });
      }

      const result = await this.sql`
        SELECT * FROM company_profiles WHERE id = ${companyId}
      `;

      if (result.length === 0) {
        return new Response("Company profile not found", { status: 404 });
      }

      return new Response(JSON.stringify(result[0]), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to get company profile:", error);
      return new Response("Failed to get company profile", { status: 500 });
    }
  }

  /**
   * Add company to monitoring
   */
  private async handleAddToMonitoring(request: Request): Promise<Response> {
    try {
      const { companyId } = (await request.json()) as { companyId: string };

      if (!companyId) {
        return new Response("Missing companyId", { status: 400 });
      }

      const updatedCompanies = [...this.state.monitoredCompanies, companyId];
      await this.setState({
        ...this.state,
        monitoredCompanies: updatedCompanies,
        lastActivity: new Date().toISOString(),
      });

      console.log("Company added to monitoring", { companyId });
      return new Response(JSON.stringify({ success: true, companyId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to add company to monitoring:", error);
      return new Response("Failed to add company to monitoring", {
        status: 500,
      });
    }
  }

  /**
   * Remove company from monitoring
   */
  private async handleRemoveFromMonitoring(
    request: Request
  ): Promise<Response> {
    try {
      const { companyId } = (await request.json()) as { companyId: string };

      if (!companyId) {
        return new Response("Missing companyId", { status: 400 });
      }

      const updatedCompanies = this.state.monitoredCompanies.filter(
        (id) => id !== companyId
      );
      await this.setState({
        ...this.state,
        monitoredCompanies: updatedCompanies,
        lastActivity: new Date().toISOString(),
      });

      console.log("Company removed from monitoring", { companyId });
      return new Response(JSON.stringify({ success: true, companyId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to remove company from monitoring:", error);
      return new Response("Failed to remove company from monitoring", {
        status: 500,
      });
    }
  }

  /**
   * Get interview insights
   */
  private async handleGetInterviewInsights(
    request: Request
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      const companyId = url.searchParams.get("companyId");

      if (!companyId) {
        return new Response("Missing companyId", { status: 400 });
      }

      const result = await this.sql`
        SELECT * FROM interview_insights WHERE company_id = ${companyId}
      `;

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to get interview insights:", error);
      return new Response("Failed to get interview insights", { status: 500 });
    }
  }

  /**
   * Get agent status
   */
  private async handleStatus(request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({
        status: this.state.status,
        monitoredCompanies: this.state.monitoredCompanies.length,
        researchQueue: this.state.researchQueue.length,
        activeResearch: this.state.activeResearch.length,
        lastActivity: this.state.lastActivity,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * Start research workflow (scheduled task)
   */
  async startResearch(data: any): Promise<void> {
    const { researchId } = data;

    try {
      await this.setState({
        ...this.state,
        activeResearch: [...this.state.activeResearch, researchId],
        lastActivity: new Date().toISOString(),
      });

      // Update status to processing
      await this.sql`
        UPDATE company_research 
        SET status = 'processing', updated_at = ${new Date().toISOString()}
        WHERE id = ${researchId}
      `;

      // Schedule research steps
      await this.schedule(1000, "gatherBasicInfo", { researchId });
      await this.schedule(2000, "analyzeCulture", { researchId });
      await this.schedule(3000, "gatherNews", { researchId });
      await this.schedule(4000, "researchLeadership", { researchId });
      await this.schedule(5000, "analyzeBenefits", { researchId });
      await this.schedule(6000, "generateInsights", { researchId });

      console.log(`Research workflow started for ${researchId}`);
    } catch (error) {
      console.error(`Failed to start research for ${researchId}:`, error);
    }
  }

  /**
   * Gather basic company information (scheduled task)
   */
  async gatherBasicInfo(data: any): Promise<void> {
    const { researchId } = data;
    console.log(`Gathering basic info for research ${researchId}`);

    // Here you would implement actual company data gathering
    await this.sql`
      UPDATE company_research 
      SET status = 'gathering_info', updated_at = ${new Date().toISOString()}
      WHERE id = ${researchId}
    `;
  }

  /**
   * Analyze company culture (scheduled task)
   */
  async analyzeCulture(data: any): Promise<void> {
    const { researchId } = data;
    console.log(`Analyzing culture for research ${researchId}`);

    // Here you would implement actual culture analysis
    await this.sql`
      UPDATE company_research 
      SET status = 'analyzing_culture', updated_at = ${new Date().toISOString()}
      WHERE id = ${researchId}
    `;
  }

  /**
   * Gather news and updates (scheduled task)
   */
  async gatherNews(data: any): Promise<void> {
    const { researchId } = data;
    console.log(`Gathering news for research ${researchId}`);

    // Here you would implement actual news gathering
    await this.sql`
      UPDATE company_research 
      SET status = 'gathering_news', updated_at = ${new Date().toISOString()}
      WHERE id = ${researchId}
    `;
  }

  /**
   * Research leadership team (scheduled task)
   */
  async researchLeadership(data: any): Promise<void> {
    const { researchId } = data;
    console.log(`Researching leadership for research ${researchId}`);

    // Here you would implement actual leadership research
    await this.sql`
      UPDATE company_research 
      SET status = 'researching_leadership', updated_at = ${new Date().toISOString()}
      WHERE id = ${researchId}
    `;
  }

  /**
   * Analyze benefits and perks (scheduled task)
   */
  async analyzeBenefits(data: any): Promise<void> {
    const { researchId } = data;
    console.log(`Analyzing benefits for research ${researchId}`);

    // Here you would implement actual benefits analysis
    await this.sql`
      UPDATE company_research 
      SET status = 'analyzing_benefits', updated_at = ${new Date().toISOString()}
      WHERE id = ${researchId}
    `;
  }

  /**
   * Generate interview insights (scheduled task)
   */
  async generateInsights(data: any): Promise<void> {
    const { researchId } = data;
    console.log(`Generating insights for research ${researchId}`);

    // Here you would implement actual insights generation
    await this.sql`
      UPDATE company_research 
      SET status = 'completed', updated_at = ${new Date().toISOString()}
      WHERE id = ${researchId}
    `;

    // Remove from active research
    const updatedActive = this.state.activeResearch.filter(
      (id) => id !== researchId
    );
    await this.setState({
      ...this.state,
      activeResearch: updatedActive,
      lastActivity: new Date().toISOString(),
    });
  }
}
