/**
 * Test email template system
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Mock environment for testing
const mockEnv = {
  ASSETS: {
    fetch: async (request) => {
      const url = new URL(request.url);
      const templateName = url.pathname.split('/').pop();
      
      // Mock template responses
      const templates = {
        'email_template.html': `<!DOCTYPE html>
<html>
<head><title>Test Email Template</title></head>
<body>
  <h1>{{current_date}}</h1>
  <p>New roles: {{new_roles_count}}</p>
  <div>{{new_roles_html}}</div>
</body>
</html>`,
        'job_insights_template.html': `<!DOCTYPE html>
<html>
<head><title>Job Insights</title></head>
<body>
  <h1>Hi {{user_name}}</h1>
  <p>Job: {{job_title}} at {{company_name}}</p>
</body>
</html>`,
        'announcement_template.html': `<!DOCTYPE html>
<html>
<head><title>Announcement</title></head>
<body>
  <h1>{{announcement_title}}</h1>
  <p>{{announcement_summary}}</p>
</body>
</html>`
      };
      
      const template = templates[templateName];
      if (!template) {
        return new Response('Template not found', { status: 404 });
      }
      
      return new Response(template, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  },
  R2: null
};

describe('Email Template System', () => {
  it('should load and process email template', async () => {
    const { generateJobInsightsHTML } = await import('../src/lib/email/templates.ts');
    
    const data = {
      date: '2025-01-17',
      new_jobs_count: 5,
      total_jobs_count: 100,
      new_jobs_7d: 15,
      email_jobs: 2,
      scraped_jobs: 3,
      top_companies: 'Google, Microsoft',
      top_locations: 'San Francisco, New York'
    };
    
    const html = await generateJobInsightsHTML(data, mockEnv);
    
    expect(html).toContain('2025-01-17');
    expect(html).toContain('New roles: 5');
    expect(html).toContain('Found 5 new jobs today');
  });

  it('should load and process job insights template', async () => {
    const { generateJobInsightsTemplate } = await import('../src/lib/email/templates.ts');
    
    const data = {
      R2_LOGO_URL: 'https://example.com/logo.png',
      user_name: 'John Doe',
      cream_of_crop_job_exists: true,
      job_title: 'Senior Developer',
      company_name: 'Tech Corp',
      location: 'San Francisco',
      salary_range: '$120k - $150k',
      fit_score: 95,
      job_link: 'https://example.com/job/123',
      monitored_job_alerts_exists: false,
      new_job_trends_exists: true,
      compensation_trends_exists: false,
      interview_reminders_exists: false,
      market_trends_link: 'https://example.com/trends',
      compensation_trends_link: 'https://example.com/compensation',
      interview_prep_link: 'https://example.com/interview'
    };
    
    const html = await generateJobInsightsTemplate(data, mockEnv);
    
    expect(html).toContain('Hi John Doe');
    expect(html).toContain('Senior Developer at Tech Corp');
  });

  it('should load and process announcement template', async () => {
    const { generateAnnouncementTemplate } = await import('../src/lib/email/templates.ts');
    
    const data = {
      R2_LOGO_URL: 'https://example.com/logo.png',
      user_name: 'Jane Smith',
      announcement_title: 'New Feature Release',
      announcement_summary: 'We\'ve added AI-powered job matching',
      announcement_body_1: 'This new feature will help you find better job matches.',
      announcement_body_2: 'The AI analyzes your skills and preferences.',
      call_to_action_text: 'Try it now',
      call_to_action_link: 'https://example.com/try'
    };
    
    const html = await generateAnnouncementTemplate(data, mockEnv);
    
    expect(html).toContain('New Feature Release');
    expect(html).toContain('We\'ve added AI-powered job matching');
    expect(html).toContain('Try it now');
  });

  it('should handle template loading errors gracefully', async () => {
    const { loadTemplate } = await import('../src/lib/email/template-loader.ts');
    
    const errorEnv = {
      ASSETS: {
        fetch: async () => new Response('Not found', { status: 404 })
      },
      R2: null
    };
    
    await expect(loadTemplate('nonexistent.html', errorEnv))
      .rejects.toThrow('Template nonexistent.html could not be loaded');
  });

  it('should replace template variables correctly', async () => {
    const { replaceTemplateVariables } = await import('../src/lib/email/template-loader.ts');
    
    const template = 'Hello {{name}}, you have {{count}} new messages.';
    const variables = { name: 'Alice', count: 5 };
    
    const result = replaceTemplateVariables(template, variables);
    
    expect(result).toBe('Hello Alice, you have 5 new messages.');
  });
});
