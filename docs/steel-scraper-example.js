/**
 * Example usage of the Steel-based job scraper
 * This demonstrates how to use the multi-platform job scraper with different sites
 */

// Example: Search and scrape jobs from LinkedIn
async function scrapeLinkedInJobs() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/scrape/linkedin', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      searchParams: {
        keywords: 'software engineer',
        location: 'San Francisco',
        experienceLevel: 'mid',
        jobType: 'full-time',
        remote: true,
        limit: 10
      },
      // Credentials will be automatically used from environment variables
      // if not provided here
      credentials: {
        site: 'linkedin'
      },
      batchSize: 3
    })
  });

  const result = await response.json();
  console.log('LinkedIn scraping result:', result);
}

// Example: Search and scrape jobs from Indeed (no auth required)
async function scrapeIndeedJobs() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/scrape/indeed', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      searchParams: {
        keywords: 'developer',
        location: 'New York',
        limit: 15
      },
      batchSize: 5
    })
  });

  const result = await response.json();
  console.log('Indeed scraping result:', result);
}

// Example: Scrape jobs from Cloudflare careers
async function scrapeCloudflareJobs() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/scrape/cloudflare', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      searchParams: {
        keywords: 'engineer',
        limit: 20
      },
      batchSize: 5
    })
  });

  const result = await response.json();
  console.log('Cloudflare scraping result:', result);
}

// Example: Bulk scraping from multiple sites
async function bulkScrapeJobs() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/bulk-scrape', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sites: [
        {
          site: 'linkedin',
          credentials: {
            site: 'linkedin'
            // Email/password will be used from environment variables
          }
        },
        {
          site: 'indeed'
        },
        {
          site: 'cloudflare'
        }
      ],
      searchParams: {
        keywords: 'software engineer',
        location: 'Remote',
        limit: 10
      },
      batchSize: 3
    })
  });

  const result = await response.json();
  console.log('Bulk scraping result:', result);
}

// Example: Scrape a single job by URL
async function scrapeSingleJob() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/scrape-job/linkedin', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobUrl: 'https://www.linkedin.com/jobs/view/1234567890',
      credentials: {
        site: 'linkedin'
        // Email/password will be used from environment variables
      }
    })
  });

  const result = await response.json();
  console.log('Single job scraping result:', result);
}

// Example: Get available job sites
async function getAvailableSites() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/sites', {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  });

  const result = await response.json();
  console.log('Available sites:', result);
}

// Example: Get scraper status
async function getScraperStatus() {
  const response = await fetch('https://your-worker-domain.workers.dev/api/steel-scraper/status', {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  });

  const result = await response.json();
  console.log('Scraper status:', result);
}

// Run examples
async function runExamples() {
  try {
    console.log('Getting available sites...');
    await getAvailableSites();

    console.log('\nGetting scraper status...');
    await getScraperStatus();

    console.log('\nScraping Indeed jobs (no auth required)...');
    await scrapeIndeedJobs();

    console.log('\nScraping Cloudflare jobs...');
    await scrapeCloudflareJobs();

    // Uncomment these if you have LinkedIn credentials
    // console.log('\nScraping LinkedIn jobs...');
    // await scrapeLinkedInJobs();

    // console.log('\nBulk scraping from multiple sites...');
    // await bulkScrapeJobs();

    // console.log('\nScraping single job...');
    // await scrapeSingleJob();

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export functions for use in other modules
export {
  bulkScrapeJobs, getAvailableSites,
  getScraperStatus,
  runExamples, scrapeCloudflareJobs, scrapeIndeedJobs, scrapeLinkedInJobs, scrapeSingleJob
};

// Run examples if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runExamples();
}
