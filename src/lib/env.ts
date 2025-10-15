export interface Env {
  AI: any;
  DB: any;
  KV: any;
  R2: any;
  VECTORIZE_INDEX: any;
  MYBROWSER?: any;
  BROWSER?: any;
  ASSETS: any;
  API_AUTH_TOKEN: string;
  BROWSER_RENDERING_TOKEN: string;
  FORWARD_EMAIL_ADDRESS?: string;
  NOTIFICATION_EMAIL_ADDRESS?: string;
  BUCKET_BASE_URL?: string;
  SLACK_WEBHOOK_URL: string;
  SMTP_ENDPOINT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  ADMIN_TOKEN?: string;
  ENABLE_LLM?: string;
  SITE_CRAWLER: any;
  JOB_MONITOR: any;
  DISCOVERY_WORKFLOW: any;
  JOB_MONITOR_WORKFLOW: any;
  CHANGE_ANALYSIS_WORKFLOW: any;
  SCRAPE_SOCKET: any;
}
