/**
 * @module src/api/routes/companies.ts
 * @description
 * API routes for managing companies and their career page scraping.
 */
import { Hono } from "hono";
import { CompanyScrapingService } from "../../domains/scraping/services/company-scraping.service";
import { CompanyService } from "../../domains/scraping/services/company.service";

const companies = new Hono();

// Company CRUD operations
companies.get("/", async (c) => {
  try {
    const service = new CompanyService(c.env);
    const { limit, offset, query } = c.req.query();
    const result = await service.getCompanies({
      limit: limit ? parseInt(limit) : 25,
      offset: offset ? parseInt(offset) : 0,
      query: query || undefined,
    });
    return c.json(result);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return c.json({ error: "Failed to fetch companies" }, 500);
  }
});

companies.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const service = new CompanyService(c.env as any);
    const result = await service.createCompany(body);
    return c.json(result, 201);
  } catch (error) {
    console.error("Error creating company:", error);
    return c.json({ error: "Failed to create company" }, 500);
  }
});

companies.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const service = new CompanyService(c.env as any);
    const result = await service.getCompany(id);
    if (!result) {
      return c.json({ error: "Company not found" }, 404);
    }
    return c.json(result);
  } catch (error) {
    console.error("Error fetching company:", error);
    return c.json({ error: "Failed to fetch company" }, 500);
  }
});

companies.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const service = new CompanyService(c.env as any);
    const result = await service.updateCompany(id, body);
    if (!result) {
      return c.json({ error: "Company not found" }, 404);
    }
    return c.json(result);
  } catch (error) {
    console.error("Error updating company:", error);
    return c.json({ error: "Failed to update company" }, 500);
  }
});

companies.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const service = new CompanyService(c.env as any);
    const result = await service.deleteCompany(id);
    if (!result) {
      return c.json({ error: "Company not found" }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return c.json({ error: "Failed to delete company" }, 500);
  }
});

// Company scraping operations
companies.post("/:id/scrape", async (c) => {
  try {
    const { id } = c.req.param();
    const service = new CompanyScrapingService(c.env as any);
    const result = await service.scrapeCompanyCareers(id);
    return c.json(result);
  } catch (error) {
    console.error("Error scraping company careers:", error);
    return c.json({ error: "Failed to scrape company careers" }, 500);
  }
});

// Scrape all companies' career pages
companies.post("/scrape-all", async (c) => {
  try {
    const service = new CompanyScrapingService(c.env as any);
    const result = await service.scrapeAllCompanies();
    return c.json(result);
  } catch (error) {
    console.error("Error scraping all companies:", error);
    return c.json({ error: "Failed to scrape all companies" }, 500);
  }
});

// Get scraping status for a company
companies.get("/:id/scraping-status", async (c) => {
  try {
    const { id } = c.req.param();
    const service = new CompanyScrapingService(c.env as any);
    const result = await service.getScrapingStatus(id);
    return c.json(result);
  } catch (error) {
    console.error("Error fetching scraping status:", error);
    return c.json({ error: "Failed to fetch scraping status" }, 500);
  }
});

export default companies;
