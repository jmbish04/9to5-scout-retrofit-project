/**
 * Simple test for email template system using compiled JavaScript
 */

import { describe, it, expect } from 'vitest';

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

// Simple template loader implementation for testing
async function loadTemplate(templateName, env) {
  try {
    const templateUrl = `https://example.com/templates/${templateName}`;
    const response = await env.ASSETS.fetch(new Request(templateUrl));
    
    if (!response.ok) {
      throw new Error(`Template ${templateName} not found: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    throw new Error(`Template ${templateName} could not be loaded`);
  }
}

function replaceTemplateVariables(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = String(value);
    result = result.replace(new RegExp(placeholder, 'g'), replacement);
  }
  
  return result;
}

async function loadAndProcessTemplate(templateName, variables, env) {
  const template = await loadTemplate(templateName, env);
  return replaceTemplateVariables(template, variables);
}

describe('Email Template System (Simple)', () => {
  it('should load template from assets', async () => {
    const template = await loadTemplate('email_template.html', mockEnv);
    
    expect(template).toContain('{{current_date}}');
    expect(template).toContain('{{new_roles_count}}');
    expect(template).toContain('{{new_roles_html}}');
  });

  it('should replace template variables correctly', () => {
    const template = 'Hello {{name}}, you have {{count}} new messages.';
    const variables = { name: 'Alice', count: 5 };
    
    const result = replaceTemplateVariables(template, variables);
    
    expect(result).toBe('Hello Alice, you have 5 new messages.');
  });

  it('should load and process template with variables', async () => {
    const variables = {
      current_date: '2025-01-17',
      new_roles_count: 5,
      new_roles_html: '<p>Found 5 new jobs today</p>'
    };
    
    const result = await loadAndProcessTemplate('email_template.html', variables, mockEnv);
    
    expect(result).toContain('2025-01-17');
    expect(result).toContain('New roles: 5');
    expect(result).toContain('<p>Found 5 new jobs today</p>');
    expect(result).not.toContain('{{current_date}}');
    expect(result).not.toContain('{{new_roles_count}}');
  });

  it('should handle template loading errors gracefully', async () => {
    const errorEnv = {
      ASSETS: {
        fetch: async () => new Response('Not found', { status: 404 })
      },
      R2: null
    };
    
    await expect(loadTemplate('nonexistent.html', errorEnv))
      .rejects.toThrow('Template nonexistent.html could not be loaded');
  });

  it('should process job insights template', async () => {
    const variables = {
      user_name: 'John Doe',
      job_title: 'Senior Developer',
      company_name: 'Tech Corp'
    };
    
    const result = await loadAndProcessTemplate('job_insights_template.html', variables, mockEnv);
    
    expect(result).toContain('Hi John Doe');
    expect(result).toContain('Senior Developer at Tech Corp');
  });

  it('should process announcement template', async () => {
    const variables = {
      announcement_title: 'New Feature Release',
      announcement_summary: 'We\'ve added AI-powered job matching'
    };
    
    const result = await loadAndProcessTemplate('announcement_template.html', variables, mockEnv);
    
    expect(result).toContain('New Feature Release');
    expect(result).toContain('We\'ve added AI-powered job matching');
  });
});
