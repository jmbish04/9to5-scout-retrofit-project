# Steel Job Scraper Integration

This integration provides a comprehensive multi-platform job scraping solution using Steel SDK for browser automation. It supports LinkedIn, Indeed, Monster.com, and direct career pages like Cloudflare with authentication persistence and full data capture.

## Features

- **Multi-Platform Support**: LinkedIn, Indeed, Monster.com, Cloudflare Careers, and generic sites
- **Authentication Persistence**: Maintains login sessions across Steel sessions
- **Full Data Capture**: HTML, screenshots, PDFs, and markdown content
- **Batch Processing**: Efficient scraping of multiple jobs with rate limiting
- **Flexible Configuration**: Easy to add new job sites and customize selectors
- **R2 Storage Integration**: All captured data stored in Cloudflare R2
- **D1 Database Integration**: Job data and metadata stored in D1

## Setup

### 1. Environment Variables

Add your Steel API key and LinkedIn credentials to your `.dev.vars` file:

```bash
STEEL_API_KEY=your_steel_api_key_here
LINKEDIN_USERNAME=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password
```

Then run:
```bash
wrangler secret bulk .dev.vars
```

**Note**: LinkedIn credentials are automatically used from environment variables when not provided in API requests.

### 2. Dependencies

The Steel SDK and Playwright will be available at runtime through Steel's infrastructure. No additional dependencies needed in your `package.json`.

## API Endpoints

### Get Available Sites
```http
GET /api/steel-scraper/sites
Authorization: Bearer YOUR_API_TOKEN
```

### Search Jobs
```http
POST /api/steel-scraper/search/{site}
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "keywords": "software engineer",
  "location": "San Francisco",
  "experienceLevel": "mid",
  "jobType": "full-time",
  "remote": true,
  "limit": 25,
  "credentials": {
    "site": "linkedin",
    "email": "your-email@example.com",
    "password": "your-password"
  }
}
```

### Scrape Jobs
```http
POST /api/steel-scraper/scrape/{site}
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "searchParams": {
    "keywords": "developer",
    "location": "Remote",
    "limit": 10
  },
  "batchSize": 5,
  "credentials": {
    "site": "linkedin",
    "email": "your-email@example.com",
    "password": "your-password"
  }
}
```

### Scrape Single Job
```http
POST /api/steel-scraper/scrape-job/{site}
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "jobUrl": "https://www.linkedin.com/jobs/view/1234567890",
  "credentials": {
    "site": "linkedin",
    "email": "your-email@example.com",
    "password": "your-password"
  }
}
```

### Bulk Scraping
```http
POST /api/steel-scraper/bulk-scrape
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "sites": [
    {
      "site": "linkedin",
      "credentials": {
        "site": "linkedin",
        "email": "your-email@example.com",
        "password": "your-password"
      }
    },
    {
      "site": "indeed"
    },
    {
      "site": "cloudflare"
    }
  ],
  "searchParams": {
    "keywords": "software engineer",
    "location": "Remote",
    "limit": 10
  },
  "batchSize": 3
}
```

### Get Status
```http
GET /api/steel-scraper/status
Authorization: Bearer YOUR_API_TOKEN
```

## Supported Job Sites

### LinkedIn
- **Authentication**: Required (email/password)
- **Features**: Experience level filtering, job type filtering, remote work filtering
- **Selectors**: Optimized for LinkedIn's current structure

### Indeed
- **Authentication**: Not required
- **Features**: Basic search with location filtering
- **Selectors**: Standard Indeed job listing selectors

### Monster
- **Authentication**: Not required
- **Features**: Basic search functionality
- **Selectors**: Monster.com job listing selectors

### Cloudflare Careers
- **Authentication**: Not required
- **Features**: Company-specific job search
- **Selectors**: Custom selectors for Cloudflare's career page

### Generic Sites
- **Authentication**: Not required
- **Features**: Fallback selectors for unknown job sites
- **Selectors**: Generic selectors that work across many sites

## Data Captured

For each job, the scraper captures:

1. **Job Metadata**:
   - Title, company, location
   - Employment type, salary information
   - Posted date, job description
   - Requirements and qualifications

2. **Full Page Content**:
   - Complete HTML source
   - Full-page screenshot (PNG)
   - PDF version of the page
   - Markdown-formatted content

3. **Storage**:
   - Job data stored in D1 database
   - HTML, screenshots, PDFs stored in R2
   - Vector embeddings for semantic search

## Usage Examples

### Basic LinkedIn Scraping
```javascript
const response = await fetch('https://your-worker.workers.dev/api/steel-scraper/scrape/linkedin', {
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
    credentials: {
      site: 'linkedin'
      // Email/password will be automatically used from environment variables
    },
    batchSize: 3
  })
});

const result = await response.json();
console.log(`Scraped ${result.totalScraped} jobs from ${result.totalFound} found`);
```

### Indeed Scraping (No Auth)
```javascript
const response = await fetch('https://your-worker.workers.dev/api/steel-scraper/scrape/indeed', {
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
console.log(`Scraped ${result.totalScraped} jobs from Indeed`);
```

## Configuration

### Adding New Job Sites

To add a new job site, create a new `JobSiteConfig`:

```typescript
const newSiteConfig: JobSiteConfig = {
  site: JobSite.NEW_SITE,
  name: 'New Job Site',
  baseUrl: 'https://newjobsite.com',
  searchUrl: 'https://newjobsite.com/jobs',
  jobUrlPattern: /newjobsite\.com\/jobs\/\d+/,
  requiresAuth: false,
  selectors: {
    searchKeywords: 'input[name="q"]',
    searchLocation: 'input[name="location"]',
    searchButton: 'button[type="submit"]',
    jobLinks: 'a[href*="/jobs/"]',
    jobTitle: 'h1.job-title',
    jobCompany: '.company-name',
    jobLocation: '.job-location',
    jobDescription: '.job-description'
  }
};

scraper.addSiteConfig(newSiteConfig);
```

### Customizing Selectors

Each site configuration includes CSS selectors for different elements:

- `searchKeywords`: Input field for job search keywords
- `searchLocation`: Input field for location (optional)
- `searchButton`: Button to submit search
- `jobLinks`: Links to individual job postings
- `jobTitle`: Job title element
- `jobCompany`: Company name element
- `jobLocation`: Job location element
- `jobDescription`: Job description content
- `jobSalary`: Salary information (optional)
- `jobPostedDate`: Posted date (optional)
- `jobType`: Employment type (optional)

## Error Handling

The scraper includes comprehensive error handling:

- **Authentication Failures**: Clear error messages for login issues
- **Rate Limiting**: Automatic delays between requests
- **Network Issues**: Retry logic for failed requests
- **Selector Failures**: Fallback selectors for missing elements
- **Session Management**: Automatic cleanup of Steel sessions

## Rate Limiting

The scraper implements several rate limiting strategies:

- **Batch Delays**: 2-second delays between batches
- **Request Throttling**: Built-in Steel SDK rate limiting
- **Session Management**: Efficient session reuse
- **Error Recovery**: Graceful handling of rate limit errors

## Monitoring and Logging

All scraping operations are logged with:

- **Session URLs**: Direct links to Steel session viewers
- **Progress Tracking**: Batch processing progress
- **Error Details**: Comprehensive error logging
- **Performance Metrics**: Timing and success rates

## Security Considerations

- **Credential Storage**: Credentials are not stored, only used for authentication
- **Session Isolation**: Each scraping session is isolated
- **Data Privacy**: All data is stored in your own R2 and D1 instances
- **API Security**: All endpoints require authentication

## Troubleshooting

### Common Issues

1. **Authentication Failures**: Verify credentials and check for 2FA requirements
2. **Selector Errors**: Sites may have changed their structure
3. **Rate Limiting**: Reduce batch sizes or add delays
4. **Session Timeouts**: Increase timeout values for large batches

### Debug Mode

Enable debug logging by checking the Steel session viewer URLs provided in the logs.

## Performance Optimization

- **Batch Sizing**: Adjust batch sizes based on site performance
- **Concurrent Sessions**: Use multiple Steel sessions for parallel processing
- **Caching**: Leverage Steel's session persistence for repeated operations
- **Resource Management**: Proper cleanup of browser sessions

## Future Enhancements

- **Additional Sites**: Easy to add new job sites
- **Advanced Filtering**: More sophisticated search filters
- **Real-time Monitoring**: WebSocket-based progress updates
- **AI Integration**: Enhanced content analysis and job matching
- **Custom Selectors**: User-configurable selectors for new sites
