#!/usr/bin/env node

/**
 * Example usage script for 9to5-scout job scraping platform.
 * Demonstrates how to set up job discovery and generate career documents.
 */

const BASE_URL = 'https://your-worker.workers.dev';
const API_TOKEN = 'your-api-token';

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('🚀 9to5-scout Example Usage\n');

  try {
    // 1. Health check
    console.log('1. Checking API health...');
    const health = await fetch(`${BASE_URL}/api/health`);
    console.log(`   Status: ${health.status === 200 ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    // 2. Create a search configuration
    console.log('2. Creating search configuration...');
    const configResponse = await fetch(`${BASE_URL}/api/configs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Senior Developer Jobs',
        keywords: JSON.stringify(['senior developer', 'software engineer', 'python', 'javascript']),
        locations: 'San Francisco, New York, Remote',
        include_domains: 'google.com,facebook.com,startup.io',
        min_comp_total: 120000,
      }),
    });
    
    const config = await configResponse.json();
    console.log(`   Created config: ${config.id}\n`);

    // 3. Start job discovery
    console.log('3. Starting job discovery...');
    const discoveryResponse = await fetch(`${BASE_URL}/api/runs/discovery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ config_id: config.id }),
    });
    
    const discovery = await discoveryResponse.json();
    console.log(`   Discovery run started: ${discovery.id}\n`);

    // 4. Wait a moment then check jobs
    console.log('4. Waiting for discovery to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const jobsResponse = await fetch(`${BASE_URL}/api/jobs?limit=5`, { headers });
    const jobs = await jobsResponse.json();
    console.log(`   Found ${jobs.length} jobs\n`);

    // 5. Search for specific jobs using AI
    console.log('5. Searching for Python jobs...');
    const searchResponse = await fetch(`${BASE_URL}/api/agent/query?q=python developer remote`, { headers });
    const searchResults = await searchResponse.json();
    console.log(`   Found ${searchResults.jobs.length} matching jobs\n`);

    // 6. Generate a cover letter for the first job
    if (searchResults.jobs.length > 0) {
      const job = searchResults.jobs[0];
      console.log('6. Generating cover letter...');
      
      const coverLetterResponse = await fetch(`${BASE_URL}/api/cover-letter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          job_title: job.title || 'Software Engineer',
          company_name: job.company || 'Tech Company',
          job_description_text: job.description_md || 'Exciting software engineering opportunity',
          candidate_career_summary: 'Experienced full-stack developer with 5+ years in Python, JavaScript, and cloud technologies. Passionate about building scalable systems and mentoring junior developers.',
        }),
      });

      const coverLetter = await coverLetterResponse.json();
      console.log('   Cover letter generated successfully!\n');
      
      // Display the opening paragraph
      if (coverLetter.response && coverLetter.response.opening_paragraph) {
        console.log('   Opening paragraph:');
        console.log(`   "${coverLetter.response.opening_paragraph}"\n`);
      }

      // 7. Generate resume content for the same job
      console.log('7. Generating resume content...');
      
      const resumeResponse = await fetch(`${BASE_URL}/api/resume`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          job_title: job.title || 'Software Engineer',
          company_name: job.company || 'Tech Company',
          job_description_text: job.description_md || 'Exciting software engineering opportunity',
          candidate_career_summary: 'Experienced full-stack developer with 5+ years in Python, JavaScript, and cloud technologies. Passionate about building scalable systems and mentoring junior developers.',
        }),
      });

      const resume = await resumeResponse.json();
      console.log('   Resume content generated successfully!\n');
      
      // Display a key accomplishment if available
      if (resume.response && resume.response.key_accomplishments && resume.response.key_accomplishments.length > 0) {
        console.log('   Key accomplishment:');
        console.log(`   "${resume.response.key_accomplishments[0]}"\n`);
      }
    }

    // 8. Start job monitoring
    console.log('8. Starting job monitoring...');
    const monitorResponse = await fetch(`${BASE_URL}/api/runs/monitor`, {
      method: 'POST',
      headers,
    });
    
    const monitor = await monitorResponse.json();
    console.log(`   Monitoring run started: ${monitor.id}\n`);

    // 9. Test webhook notifications
    console.log('9. Testing webhook notifications...');
    const webhookResponse = await fetch(`${BASE_URL}/api/webhooks/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: '🎉 9to5-scout is working perfectly! Job discovery and monitoring are active.',
      }),
    });

    const webhook = await webhookResponse.json();
    console.log(`   Webhook test: ${webhook.success ? '✅ Sent' : '❌ Failed'}\n`);

    console.log('✨ All operations completed successfully!');
    console.log('\nNext steps:');
    console.log('- Check your Slack channel for notifications');
    console.log('- Monitor the /api/runs endpoint for processing status');
    console.log('- Use /api/agent/query for intelligent job search');
    console.log('- Generate cover letters and resumes for interesting positions');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Configuration helper
function printConfig() {
  console.log('📋 Configuration:');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API Token: ${API_TOKEN.substring(0, 8)}...`);
  console.log('\n   Update these values at the top of this script before running.\n');
}

// Check if this script is run directly
if (require.main === module) {
  if (BASE_URL.includes('your-worker') || API_TOKEN === 'your-api-token') {
    printConfig();
    console.log('⚠️  Please update the BASE_URL and API_TOKEN before running this example.\n');
    process.exit(1);
  }
  
  main().catch(console.error);
}

module.exports = { main, printConfig };