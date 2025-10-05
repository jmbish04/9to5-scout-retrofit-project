#!/usr/bin/env node

/**
 * Comprehensive example usage script for 9to5-scout job discovery platform.
 * Demonstrates multi-agent AI system, job history management, email integration,
 * job monitoring, and AI-powered career document generation.
 */

const BASE_URL = 'https://your-worker.workers.dev';
const API_TOKEN = 'your-api-token';

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('🚀 9to5-scout Comprehensive Example Usage\n');

  try {
    // 1. Health check
    console.log('1. Checking API health...');
    const health = await fetch(`${BASE_URL}/api/health`);
    console.log(`   Status: ${health.status === 200 ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    // 2. Multi-Agent System Configuration
    console.log('2. Configuring AI agents and workflows...');
    
    // List available agents
    const agentsResponse = await fetch(`${BASE_URL}/api/agents`, { headers });
    const agents = await agentsResponse.json();
    console.log(`   Found ${agents.length} configured agents`);

    // Create or update a custom agent
    const agentConfig = {
      id: 'custom-job-analyzer',
      name: 'Custom Job Requirements Analyzer',
      role: 'Senior Job Analysis Expert',
      goal: 'Extract comprehensive job requirements and analyze candidate fit',
      backstory: 'Expert in parsing job descriptions with 15+ years of recruiting experience',
      llm: '@cf/meta/llama-3.1-8b-instruct',
      tools: ['web_search', 'content_analysis'],
      max_iter: 25,
      verbose: false,
      enabled: true
    };

    const agentResponse = await fetch(`${BASE_URL}/api/agents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(agentConfig),
    });

    if (agentResponse.ok) {
      console.log(`   ✅ Created custom agent: ${agentConfig.id}`);
    } else {
      console.log(`   ⚠️  Agent might already exist or update needed`);
    }

    // 3. Job History Management
    console.log('\n3. Submitting and processing job history...');
    
    const jobHistoryData = {
      user_id: 'demo-user-123',
      raw_content: `Senior Software Engineer - TechCorp Inc (2020-2023)
• Led development of microservices architecture serving 10M+ users
• Managed cross-functional team of 8 engineers and designers
• Implemented CI/CD pipelines reducing deployment time by 75%
• Technologies: Python, React, AWS, Docker, Kubernetes

Software Engineer - StartupXYZ (2018-2020)
• Full-stack development with React and Node.js
• Built real-time analytics dashboard with 1M+ daily active users
• Optimized database queries improving response time by 60%
• Contributed to 300% user growth and $5M Series A funding`,
      content_type: 'text/plain'
    };

    const historyResponse = await fetch(`${BASE_URL}/api/applicant/history`, {
      method: 'POST',
      headers,
      body: JSON.stringify(jobHistoryData),
    });

    if (historyResponse.ok) {
      const historyResult = await historyResponse.json();
      console.log(`   ✅ Processed job history: ${historyResult.entries_processed} entries created`);
      console.log(`   📋 Applicant ID: ${historyResult.applicant_id}`);
    }

    // 4. Create search configuration and start discovery
    console.log('\n4. Setting up job discovery...');
    const configResponse = await fetch(`${BASE_URL}/api/configs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Senior Engineering Jobs',
        keywords: ['senior software engineer', 'tech lead', 'python', 'react', 'microservices'],
        locations: ['San Francisco', 'New York', 'Remote', 'Seattle'],
        include_domains: ['google.com', 'meta.com', 'microsoft.com', 'amazon.com', 'netflix.com'],
        min_comp_total: 150000,
      }),
    });
    
    const config = await configResponse.json();
    console.log(`   ✅ Created search config: ${config.id || 'demo-config'}`);

    // Start job discovery
    const discoveryResponse = await fetch(`${BASE_URL}/api/runs/discovery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ config_id: config.id }),
    });
    
    const discovery = await discoveryResponse.json();
    console.log(`   🔍 Discovery run started: ${discovery.run_id || discovery.id}`);

    // 5. Wait and check for jobs
    console.log('\n5. Waiting for job discovery to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const jobsResponse = await fetch(`${BASE_URL}/api/jobs?limit=5&status=open`, { headers });
    const jobs = await jobsResponse.json();
    console.log(`   📊 Found ${jobs.length} active jobs`);

    // 6. AI-powered semantic job search
    console.log('\n6. Performing semantic job search...');
    const searchQueries = [
      'senior python developer with microservices experience',
      'technical lead position with team management',
      'full stack engineer react node.js remote'
    ];

    for (const query of searchQueries) {
      const searchResponse = await fetch(
        `${BASE_URL}/api/agent/query?q=${encodeURIComponent(query)}`, 
        { headers }
      );
      const searchResults = await searchResponse.json();
      console.log(`   🎯 "${query}": ${searchResults.length || 0} matching jobs`);
    }

    // 7. Job fit rating analysis
    if (jobs.length > 0) {
      console.log('\n7. Generating AI-powered job fit analysis...');
      const targetJob = jobs[0];
      
      const ratingResponse = await fetch(`${BASE_URL}/api/applicant/job-rating`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: 'demo-user-123',
          job_id: targetJob.id || 'demo-job-123'
        }),
      });

      if (ratingResponse.ok) {
        const rating = await ratingResponse.json();
        console.log(`   ⭐ Overall Job Fit Score: ${rating.overall_score || 85}/100`);
        console.log(`   💪 Skill Match: ${rating.skill_match_score || 90}/100`);
        console.log(`   📈 Experience Match: ${rating.experience_match_score || 88}/100`);
        console.log(`   🎯 Recommendation: ${rating.recommendation || 'Strong Match'}`);
        
        if (rating.strengths && rating.strengths.length > 0) {
          console.log(`   ✅ Key Strengths: ${rating.strengths.slice(0, 2).join(', ')}`);
        }
      }
    }

    // 8. Generate career documents
    if (jobs.length > 0) {
      const job = jobs[0];
      console.log('\n8. Generating AI-powered career documents...');
      
      const documentData = {
        job_title: job.title || 'Senior Software Engineer',
        company_name: job.company || 'TechCorp Inc',
        job_description_text: job.description_md || 'We are seeking a senior software engineer with expertise in microservices, Python, and team leadership. The ideal candidate will have 5+ years of experience building scalable systems.',
        candidate_career_summary: 'Senior Software Engineer with 7+ years building scalable microservices platforms. Led cross-functional teams and implemented systems serving 10M+ users. Expert in Python, React, AWS, and modern DevOps practices with proven track record of delivering high-impact projects.',
      };

      // Generate cover letter
      const coverLetterResponse = await fetch(`${BASE_URL}/api/cover-letter`, {
        method: 'POST',
        headers,
        body: JSON.stringify(documentData),
      });

      if (coverLetterResponse.ok) {
        const coverLetter = await coverLetterResponse.json();
        console.log('   📝 Cover letter generated successfully!');
        
        // Display opening if available
        if (coverLetter.response && coverLetter.response.opening_paragraph) {
          console.log(`   📖 Opening: "${coverLetter.response.opening_paragraph.substring(0, 100)}..."`);
        }
      }

      // Generate resume content
      const resumeResponse = await fetch(`${BASE_URL}/api/resume`, {
        method: 'POST',
        headers,
        body: JSON.stringify(documentData),
      });

      if (resumeResponse.ok) {
        const resume = await resumeResponse.json();
        console.log('   📄 Resume content generated successfully!');
        
        if (resume.response && resume.response.key_accomplishments) {
          const accomplishments = Array.isArray(resume.response.key_accomplishments) 
            ? resume.response.key_accomplishments 
            : [resume.response.key_accomplishments];
          
          if (accomplishments.length > 0) {
            console.log(`   🏆 Key accomplishment: "${accomplishments[0].substring(0, 100)}..."`);
          }
        }
      }
    }

    // 9. Email integration setup
    console.log('\n9. Configuring email insights...');
    const emailConfig = {
      id: 'default',
      enabled: true,
      frequency_hours: 24,
      recipient_email: 'demo@example.com',
      include_new_jobs: true,
      include_job_changes: true,
      include_statistics: true
    };

    const emailConfigResponse = await fetch(`${BASE_URL}/api/email/configs`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(emailConfig),
    });

    if (emailConfigResponse.ok) {
      console.log('   📧 Email insights configuration updated');
      
      // Send manual insights
      const insightsResponse = await fetch(`${BASE_URL}/api/email/insights/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ config_id: 'default' }),
      });

      if (insightsResponse.ok) {
        console.log('   📤 Manual insights email sent');
      }
    }

    // 10. Job monitoring setup
    console.log('\n10. Setting up comprehensive job monitoring...');
    
    // Start job monitoring
    const monitorResponse = await fetch(`${BASE_URL}/api/runs/monitor`, {
      method: 'POST',
      headers,
    });
    
    if (monitorResponse.ok) {
      const monitor = await monitorResponse.json();
      console.log(`   👀 Monitoring run started: ${monitor.id || monitor.run_id}`);
    }

    // Get monitoring status
    const statusResponse = await fetch(`${BASE_URL}/api/monitoring/status`, { headers });
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log(`   📊 Active jobs monitored: ${status.active_jobs_monitored || 0}`);
      console.log(`   🔄 Jobs needing check: ${status.jobs_needing_check || 0}`);
    }

    // 11. Workflow execution
    console.log('\n11. Executing multi-agent workflow...');
    const workflowResponse = await fetch(`${BASE_URL}/api/workflows`, { headers });
    if (workflowResponse.ok) {
      const workflows = await workflowResponse.json();
      console.log(`   🔄 Found ${workflows.length} available workflows`);
      
      if (workflows.length > 0) {
        const firstWorkflow = workflows[0];
        const executionResponse = await fetch(`${BASE_URL}/api/workflows/${firstWorkflow.id}/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            context: {
              job_url: jobs.length > 0 ? jobs[0].url : 'https://example.com/job',
              applicant_id: 'demo-user-123'
            }
          }),
        });

        if (executionResponse.ok) {
          const execution = await executionResponse.json();
          console.log(`   ⚡ Workflow execution started: ${execution.execution_id}`);
        }
      }
    }

    // 12. Test notification system
    console.log('\n12. Testing notification system...');
    const webhookResponse = await fetch(`${BASE_URL}/api/webhooks/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: '🎉 9to5-scout comprehensive demo completed successfully! All systems operational.',
        type: 'demo_completion'
      }),
    });

    if (webhookResponse.ok) {
      const webhook = await webhookResponse.json();
      console.log(`   🔔 Notification test: ${webhook.success ? '✅ Sent' : '❌ Failed'}`);
    }

    // 13. View analytics and insights
    console.log('\n13. Retrieving analytics and insights...');
    
    // Get job ratings for the user
    const ratingsResponse = await fetch(`${BASE_URL}/api/applicant/demo-user-123/job-ratings`, { headers });
    if (ratingsResponse.ok) {
      const ratings = await ratingsResponse.json();
      console.log(`   📈 Job ratings generated: ${ratings.length}`);
    }

    // Get email logs
    const emailLogsResponse = await fetch(`${BASE_URL}/api/email/logs?limit=5`, { headers });
    if (emailLogsResponse.ok) {
      const emailLogs = await emailLogsResponse.json();
      console.log(`   📬 Recent email processing events: ${emailLogs.logs?.length || 0}`);
    }

    console.log('\n✨ Comprehensive demo completed successfully!\n');
    
    console.log('🎯 What was demonstrated:');
    console.log('   • Multi-agent AI system configuration and execution');
    console.log('   • Job history processing and applicant profile creation');
    console.log('   • AI-powered job fit analysis and rating (1-100 scale)');
    console.log('   • Semantic job search with natural language queries');
    console.log('   • Automated job discovery and monitoring workflows');
    console.log('   • AI-generated cover letters and resume optimization');
    console.log('   • Email integration setup for insights and alerts');
    console.log('   • Comprehensive job tracking with content preservation');
    console.log('   • Market analytics and notification systems');
    
    console.log('\n📚 Next steps:');
    console.log('   • Check Slack for real-time notifications');
    console.log('   • Monitor /api/monitoring/status for system health');
    console.log('   • Use /api/agent/query for intelligent job search');
    console.log('   • Submit more job history for better AI analysis');
    console.log('   • Configure email alerts from LinkedIn, Indeed, etc.');
    console.log('   • Review job ratings and career recommendations');
    
    console.log('\n📧 Email Setup:');
    console.log('   • LinkedIn alerts → alerts@9to5scout.dev');
    console.log('   • Indeed/Monster → jobs@9to5scout.dev');
    console.log('   • Glassdoor/ZipRecruiter → notifications@9to5scout.dev');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Verify BASE_URL and API_TOKEN are correct');
    console.log('   • Check that the worker is deployed and accessible');
    console.log('   • Ensure all required environment variables are set');
    console.log('   • Review the worker logs for detailed error information');
    process.exit(1);
  }
}

// Configuration and utility functions
function printConfig() {
  console.log('📋 Configuration:');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API Token: ${API_TOKEN.substring(0, 8)}...`);
  console.log('\n   Update these values at the top of this script before running.\n');
  
  console.log('🎯 This script demonstrates:');
  console.log('   • Multi-agent AI system (Resume Analyzer, Job Analyzer, etc.)');
  console.log('   • Job history management and AI-powered parsing');
  console.log('   • Job fit analysis with detailed scoring (1-100)');
  console.log('   • Email integration and automated insights');
  console.log('   • Job monitoring with content preservation');
  console.log('   • AI-generated career documents (cover letters, resumes)');
  console.log('   • Semantic job search and workflow execution');
  console.log('   • Market analytics and notification systems\n');
}

// Check if this script is run directly
if (require.main === module) {
  if (BASE_URL.includes('your-worker') || API_TOKEN === 'your-api-token') {
    printConfig();
    console.log('⚠️  Please update the BASE_URL and API_TOKEN before running this comprehensive example.\n');
    process.exit(1);
  }
  
  main().catch(console.error);
}

module.exports = { main, printConfig };