/**
 * Test script for Steel job scraper
 * Run this to test the scraper functionality
 */

const API_BASE_URL = 'https://your-worker-domain.workers.dev';
const API_TOKEN = 'YOUR_API_TOKEN'; // Replace with your actual API token

async function testSteelScraper() {
  console.log('🧪 Testing Steel Job Scraper...\n');

  try {
    // Test 1: Get available sites
    console.log('1. Testing available sites...');
    const sitesResponse = await fetch(`${API_BASE_URL}/api/steel-scraper/sites`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });

    if (sitesResponse.ok) {
      const sites = await sitesResponse.json();
      console.log('✅ Available sites:', sites.sites.map(s => `${s.name} (${s.id})`).join(', '));
    } else {
      console.log('❌ Failed to get sites:', await sitesResponse.text());
    }

    // Test 2: Get scraper status
    console.log('\n2. Testing scraper status...');
    const statusResponse = await fetch(`${API_BASE_URL}/api/steel-scraper/status`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Scraper status:', status.status);
      console.log('   Features:', status.features.join(', '));
    } else {
      console.log('❌ Failed to get status:', await statusResponse.text());
    }

    // Test 3: Test Indeed scraping (no auth required)
    console.log('\n3. Testing Indeed job search...');
    const indeedResponse = await fetch(`${API_BASE_URL}/api/steel-scraper/search/indeed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchParams: {
          keywords: 'developer',
          location: 'Remote',
          limit: 5
        }
      })
    });

    if (indeedResponse.ok) {
      const indeedResult = await indeedResponse.json();
      console.log(`✅ Indeed search found ${indeedResult.count} jobs`);
      if (indeedResult.jobUrls.length > 0) {
        console.log('   Sample job URLs:', indeedResult.jobUrls.slice(0, 2));
      }
    } else {
      console.log('❌ Indeed search failed:', await indeedResponse.text());
    }

    // Test 4: Test Cloudflare careers search
    console.log('\n4. Testing Cloudflare careers search...');
    const cloudflareResponse = await fetch(`${API_BASE_URL}/api/steel-scraper/search/cloudflare`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchParams: {
          keywords: 'engineer',
          limit: 5
        }
      })
    });

    if (cloudflareResponse.ok) {
      const cloudflareResult = await cloudflareResponse.json();
      console.log(`✅ Cloudflare search found ${cloudflareResult.count} jobs`);
      if (cloudflareResult.jobUrls.length > 0) {
        console.log('   Sample job URLs:', cloudflareResult.jobUrls.slice(0, 2));
      }
    } else {
      console.log('❌ Cloudflare search failed:', await cloudflareResponse.text());
    }

    // Test 5: Test LinkedIn search (with auth from env vars)
    console.log('\n5. Testing LinkedIn job search...');
    const linkedinResponse = await fetch(`${API_BASE_URL}/api/steel-scraper/search/linkedin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchParams: {
          keywords: 'software engineer',
          location: 'San Francisco',
          limit: 3
        },
        credentials: {
          site: 'linkedin'
          // Will use LINKEDIN_USERNAME and LINKEDIN_PASSWORD from env vars
        }
      })
    });

    if (linkedinResponse.ok) {
      const linkedinResult = await linkedinResponse.json();
      console.log(`✅ LinkedIn search found ${linkedinResult.count} jobs`);
      if (linkedinResult.jobUrls.length > 0) {
        console.log('   Sample job URLs:', linkedinResult.jobUrls.slice(0, 2));
      }
    } else {
      console.log('❌ LinkedIn search failed:', await linkedinResponse.text());
    }

    console.log('\n🎉 Steel scraper test completed!');
    console.log('\nNext steps:');
    console.log('1. Update API_BASE_URL and API_TOKEN in this file');
    console.log('2. Run: node test-steel-scraper.js');
    console.log('3. Check the Steel session viewer URLs in the logs');
    console.log('4. Try the full scraping endpoints with /scrape/ instead of /search/');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testSteelScraper();
