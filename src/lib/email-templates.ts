/**
 * Email templates using React Email components for better HTML emails
 */

export interface JobInsightsData {
  date: string;
  new_jobs_count: number;
  total_jobs_count: number;
  new_jobs_7d: number;
  email_jobs: number;
  scraped_jobs: number;
  top_companies: string;
  top_locations: string;
}

export interface OTPAlertData {
  service_name: string;
  otp_code: string;
  timestamp: string;
  original_subject: string;
}

/**
 * Generate job insights HTML email template
 */
export function generateJobInsightsHTML(data: JobInsightsData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Job Insights - ${data.date}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
            margin: 0;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
            margin: 5px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #333;
            font-size: 20px;
            margin: 0 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        .list {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
        }
        .list-item {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .list-item:last-child {
            border-bottom: none;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .highlight {
            background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .highlight h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        @media (max-width: 600px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Job Insights</h1>
            <p>Your personalized job market report for ${data.date}</p>
        </div>
        
        <div class="content">
            <div class="highlight">
                <h3>🎯 Today's Highlights</h3>
                <p>We found <strong>${
                  data.new_jobs_count
                }</strong> new job opportunities in the last 24 hours, bringing our total database to <strong>${
    data.total_jobs_count
  }</strong> jobs!</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${data.new_jobs_count}</div>
                    <div class="stat-label">New Jobs (24h)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${data.new_jobs_7d}</div>
                    <div class="stat-label">New Jobs (7d)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${data.total_jobs_count}</div>
                    <div class="stat-label">Total Jobs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${data.email_jobs}</div>
                    <div class="stat-label">From Email</div>
                </div>
            </div>

            <div class="section">
                <h2>🏢 Top Companies This Week</h2>
                <div class="list">
                    ${data.top_companies
                      .split(", ")
                      .map(
                        (company) => `<div class="list-item">${company}</div>`
                      )
                      .join("")}
                </div>
            </div>

            <div class="section">
                <h2>📍 Top Locations This Week</h2>
                <div class="list">
                    ${data.top_locations
                      .split(", ")
                      .map(
                        (location) => `<div class="list-item">${location}</div>`
                      )
                      .join("")}
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://9to5-scout.hacolby.workers.dev" class="cta-button">
                    View All Jobs →
                </a>
            </div>
        </div>

        <div class="footer">
            <p>Powered by 9to5 Scout • <a href="mailto:justin@126colby.com">Contact Support</a></p>
            <p>This email was generated automatically. You can unsubscribe at any time.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate OTP alert HTML email template
 */
export function generateOTPAlertHTML(data: OTPAlertData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Code Alert - ${data.service_name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .otp-code {
            background: #f8f9fa;
            border: 2px dashed #667eea;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 20px 0;
        }
        .otp-code .code {
            font-size: 36px;
            font-weight: 700;
            color: #667eea;
            letter-spacing: 4px;
            margin: 0;
            font-family: 'Courier New', monospace;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
        }
        .info-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 5px 0;
        }
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 OTP Code Alert</h1>
        </div>
        
        <div class="content">
            <div class="otp-code">
                <p style="margin: 0 0 10px 0; color: #666;">Your verification code for</p>
                <h2 style="margin: 0 0 20px 0; color: #333;">${data.service_name}</h2>
                <div class="code">${data.otp_code}</div>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Service</div>
                    <div class="info-value">${data.service_name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Time</div>
                    <div class="info-value">${data.timestamp}</div>
                </div>
            </div>

            <div class="warning">
                <strong>⚠️ Important:</strong> This code was automatically detected from an email sent to job-alerts@hacolby.app. 
                Use it to complete your registration or verification process.
            </div>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>📧 Original Email Subject:</strong><br>
                <code style="background: white; padding: 5px; border-radius: 3px; display: inline-block; margin-top: 5px;">
                    ${data.original_subject}
                </code>
            </div>
        </div>

        <div class="footer">
            <p>This alert was automatically generated by 9to5 Scout</p>
            <p>If you didn't expect this code, please check your email security.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate welcome email template
 */
export function generateWelcomeHTML(userName: string = "User"): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to 9to5 Scout</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .feature {
            display: flex;
            align-items: center;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .feature-icon {
            font-size: 24px;
            margin-right: 15px;
        }
        .feature-content h3 {
            margin: 0 0 5px 0;
            color: #333;
        }
        .feature-content p {
            margin: 0;
            color: #666;
        }
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to 9to5 Scout!</h1>
            <p>Your intelligent job hunting companion</p>
        </div>
        
        <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>Welcome to 9to5 Scout, your personal job hunting assistant that helps you discover, track, and apply to the best job opportunities.</p>

            <div class="feature">
                <div class="feature-icon">🔍</div>
                <div class="feature-content">
                    <h3>Smart Job Discovery</h3>
                    <p>We automatically find and scrape job postings from multiple sources, including email alerts you forward to us.</p>
                </div>
            </div>

            <div class="feature">
                <div class="feature-icon">📧</div>
                <div class="feature-content">
                    <h3>Email Integration</h3>
                    <p>Forward job alert emails to job-alerts@hacolby.app and we'll extract and process all job links automatically.</p>
                </div>
            </div>

            <div class="feature">
                <div class="feature-icon">🤖</div>
                <div class="feature-content">
                    <h3>AI-Powered Insights</h3>
                    <p>Get personalized job recommendations and market insights powered by advanced AI and machine learning.</p>
                </div>
            </div>

            <div class="feature">
                <div class="feature-icon">🔐</div>
                <div class="feature-content">
                    <h3>OTP Detection</h3>
                    <p>We automatically detect and forward OTP codes from verification emails to help you complete registrations.</p>
                </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <a href="https://9to5-scout.hacolby.workers.dev" class="cta-button">
                    Get Started →
                </a>
            </div>
        </div>

        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:justin@126colby.com">justin@126colby.com</a></p>
            <p>Happy job hunting! 🚀</p>
        </div>
    </div>
</body>
</html>`;
}
