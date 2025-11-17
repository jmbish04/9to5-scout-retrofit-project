#!/usr/bin/env node

/**
 * Test script for company career page scraping functionality
 * Usage: node scripts/test-company-scraping.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';

async function testCompanyAPI() {
  console.log('🧪 Testing Company API endpoints...\n');

  try {
    // Test 1: Create a company
    console.log('1. Creating a test company...');
    const createResponse = await fetch(`${BASE_URL}/api/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
      },
      body: JSON.stringify({
        name: 'Cloudflare',
        normalized_domain: 'cloudflare.com',
        website_url: 'https://www.cloudflare.com',
        careers_url: 'https://www.cloudflare.com/careers/',
        description: 'Leading edge network infrastructure company',
      }),
    });

    if (!createResponse.ok) {
      console.error('❌ Failed to create company:', await createResponse.text());
      return;
    }

    const company = await createResponse.json();
    console.log('✅ Company created:', company);
    console.log('');

    // Test 2: List companies
    console.log('2. Listing companies...');
    const listResponse = await fetch(`${BASE_URL}/api/companies?limit=5`, {
      headers: {
        'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
      },
    });

    if (listResponse.ok) {
      const companies = await listResponse.json();
      console.log('✅ Companies found:', companies.length);
      console.log('');
    }

    // Test 3: Get specific company
    console.log('3. Getting specific company...');
    const getResponse = await fetch(`${BASE_URL}/api/companies/${company.id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
      },
    });

    if (getResponse.ok) {
      const fetchedCompany = await getResponse.json();
      console.log('✅ Company retrieved:', fetchedCompany.name);
      console.log('');
    }

    // Test 4: Scrape company careers (if careers_url exists)
    if (company.careers_url) {
      console.log('4. Scraping company careers...');
      const scrapeResponse = await fetch(`${BASE_URL}/api/companies/${company.id}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
        },
      });

      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        console.log('✅ Scraping completed:', {
          jobs_found: scrapeResult.job_links_found,
          jobs_scraped: scrapeResult.jobs_scraped,
          jobs_queued: scrapeResult.jobs_queued,
          errors: scrapeResult.errors?.length || 0,
        });
        console.log('');
      } else {
        console.log('⚠️  Scraping failed (expected if Browser Rendering API not configured):', scrapeResponse.status);
        console.log('');
      }
    }

    // Test 5: Scrape all companies
    console.log('5. Scraping all companies...');
    const scrapeAllResponse = await fetch(`${BASE_URL}/api/companies/scrape-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
      },
    });

    if (scrapeAllResponse.ok) {
      const scrapeAllResult = await scrapeAllResponse.json();
      console.log('✅ Bulk scraping completed:', {
        total_companies: scrapeAllResult.total_companies,
        scraped_companies: scrapeAllResult.scraped_companies,
        total_jobs_queued: scrapeAllResult.total_jobs_queued,
      });
      console.log('');
    }

    // Test 6: Update company
    console.log('6. Updating company...');
    const updateResponse = await fetch(`${BASE_URL}/api/companies/${company.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
      },
      body: JSON.stringify({
        description: 'Leading edge network infrastructure company - Updated',
      }),
    });

    if (updateResponse.ok) {
      console.log('✅ Company updated successfully');
      console.log('');
    }

    // Test 7: Delete company
    console.log('7. Deleting test company...');
    const deleteResponse = await fetch(`${BASE_URL}/api/companies/${company.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.WORKER_API_KEY || 'test-key'}`,
      },
    });

    if (deleteResponse.ok) {
      console.log('✅ Company deleted successfully');
      console.log('');
    }

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Example curl commands for manual testing
function printCurlExamples() {
  console.log('\n📋 Example curl commands for manual testing:\n');

  console.log('# Create a company');
  console.log(`curl -X POST '${BASE_URL}/api/companies' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -d '{
    "name": "Example Corp",
    "normalized_domain": "example.com",
    "website_url": "https://example.com",
    "careers_url": "https://example.com/careers",
    "description": "Example company description"
  }'`);

  console.log('\n# List companies');
  console.log(`curl '${BASE_URL}/api/companies?limit=10' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`);

  console.log('\n# Scrape company careers');
  console.log(`curl -X POST '${BASE_URL}/api/companies/COMPANY_ID/scrape' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`);

  console.log('\n# Scrape all companies');
  console.log(`curl -X POST '${BASE_URL}/api/companies/scrape-all' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`);
}

// Run tests if called directly
if (require.main === module) {
  testCompanyAPI().then(() => {
    printCurlExamples();
  });
}

module.exports = { testCompanyAPI, printCurlExamples };
