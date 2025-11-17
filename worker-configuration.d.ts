declare namespace Cloudflare {
	interface GlobalProps {
		mainModule: typeof import("./src/index");
		durableNamespaces: "SiteCrawler" | "JobMonitor" | "ScrapeSocket" | "HealthCheckSocket" | "GenericAgent" | "JobMonitorAgent" | "ResumeOptimizationAgent" | "CompanyIntelligenceAgent" | "InterviewPreparationAgent" | "CareerCoachAgent" | "EmailClassificationAgent" | "RoomDO";
	}
	interface Env {
		KV: KVNamespace;
		USAGE_TRACKER: KVNamespace;
		DEFAULT_MODEL_WEB_BROWSER: "@cf/meta/llama-3.1-8b-instruct";
		DEFAULT_MODEL_REASONING: "@cf/openai/gpt-oss-120b";
		EMBEDDING_MODEL: "@cf/baai/bge-large-en-v1.5";
		WORKER_API_KEY: string;
		WORKER_URL: string;
		STEEL_API_KEY: string;
		LINKEDIN_USERNAME: string;
		LINKEDIN_PASSWORD: string;
		BROWSER_RENDERING_TOKEN: string;
		CLOUDFLARE_ACCOUNT_ID: string;
		LOCAL_SCRAPER_URL: string;
		LOCAL_SCRAPER_API_KEY: string;
		EMAIL_ROUTING_DOMAIN: string;
		NOTIFICATION_EMAIL_ADDRESS: string;
		GITHUB_REPO: string;
		BUCKET_BASE_URL: string;
		SERPAPI_API_KEY: string;
		SITE_CRAWLER: DurableObjectNamespace<import("./src/index").SiteCrawler>;
		JOB_MONITOR: DurableObjectNamespace<import("./src/index").JobMonitor>;
		SCRAPE_SOCKET: DurableObjectNamespace<import("./src/index").ScrapeSocket>;
		HEALTH_CHECK_SOCKET: DurableObjectNamespace<import("./src/index").HealthCheckSocket>;
		GENERIC_AGENT: DurableObjectNamespace<import("./src/index").GenericAgent>;
		EMAIL_CLASSIFICATION_AGENT: DurableObjectNamespace<import("./src/index").EmailClassificationAgent>;
		JOB_MONITOR_AGENT: DurableObjectNamespace<import("./src/index").JobMonitorAgent>;
		RESUME_OPTIMIZATION_AGENT: DurableObjectNamespace<import("./src/index").ResumeOptimizationAgent>;
		COMPANY_INTELLIGENCE_AGENT: DurableObjectNamespace<import("./src/index").CompanyIntelligenceAgent>;
		INTERVIEW_PREPARATION_AGENT: DurableObjectNamespace<import("./src/index").InterviewPreparationAgent>;
		CAREER_COACH_AGENT: DurableObjectNamespace<import("./src/index").CareerCoachAgent>;
		ROOM_DO: DurableObjectNamespace<import("./src/index").RoomDO>;
		R2: R2Bucket;
		DB: D1Database;
		TASK_QUEUE: Queue;
		EMAIL_SENDER: SendEmail;
		VECTORIZE_INDEX: VectorizeIndex;
		MYBROWSER: Fetcher;
		AI: Ai;
		ASSETS: Fetcher;
		DISCOVERY_WORKFLOW: Workflow<Parameters<import("./src/index").DiscoveryWorkflow['run']>[0]['payload']>;
		JOB_MONITOR_WORKFLOW: Workflow<Parameters<import("./src/index").JobMonitorWorkflow['run']>[0]['payload']>;
		CHANGE_ANALYSIS_WORKFLOW: Workflow<Parameters<import("./src/index").ChangeAnalysisWorkflow['run']>[0]['payload']>;
		COMPANY_CAREERS_SCRAPING_WORKFLOW: Workflow<Parameters<import("./src/index").CompanyCareersScrapingWorkflow['run']>[0]['payload']>;
	}
}
interface Env extends Cloudflare.Env {}