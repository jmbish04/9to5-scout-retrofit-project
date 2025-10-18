/**
 * @fileoverview AI Constants
 *
 * Common constants used across AI operations and models
 * in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * AI Model Names
 */
export const AI_MODELS = {
  // Text generation models
  LLAMA_3_1_8B_INSTRUCT: "@cf/meta/llama-3.1-8b-instruct",
  LLAMA_3_1_70B_INSTRUCT: "@cf/meta/llama-3.1-70b-instruct",
  LLAMA_3_2_3B_INSTRUCT: "@cf/meta/llama-3.2-3b-instruct",
  LLAMA_3_2_11B_INSTRUCT: "@cf/meta/llama-3.2-11b-instruct",
  LLAMA_3_2_90B_INSTRUCT: "@cf/meta/llama-3.2-90b-instruct",

  // Embedding models
  BGE_LARGE_EN_V1_5: "@cf/baai/bge-large-en-v1.5",
  BGE_BASE_EN_V1_5: "@cf/baai/bge-base-en-v1.5",
  BGE_SMALL_EN_V1_5: "@cf/baai/bge-small-en-v1.5",

  // Code generation models
  CODE_LLAMA_7B_INSTRUCT: "@cf/meta/codellama-7b-instruct",
  CODE_LLAMA_13B_INSTRUCT: "@cf/meta/codellama-13b-instruct",
  CODE_LLAMA_34B_INSTRUCT: "@cf/meta/codellama-34b-instruct",

  // Translation models
  NLLB_200_600M: "@cf/meta/nllb-200-600m",
  NLLB_200_1_3B: "@cf/meta/nllb-200-1.3b",

  // Image generation models
  STABLE_DIFFUSION_XL: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  STABLE_DIFFUSION_FLUX: "@cf/stabilityai/stable-diffusion-flux-1.1",

  // Text classification models
  BERT_BASE_UNCASED: "@cf/huggingface/distilbert-sst-2-int8",
  ROBERTA_BASE_SENTIMENT: "@cf/huggingface/distilbert-sst-2-int8",

  // Named entity recognition models
  BERT_NER: "@cf/huggingface/dslim/bert-base-NER",

  // Question answering models
  BERT_QA: "@cf/huggingface/distilbert-sst-2-int8",

  // Text summarization models
  BART_LARGE_CNN: "@cf/huggingface/facebook/bart-large-cnn",

  // Text-to-speech models
  TACOTRON2: "@cf/huggingface/espnet/kan-bayashi_ljspeech_vits",

  // Speech-to-text models
  WHISPER_BASE: "@cf/openai/whisper-base",
  WHISPER_LARGE: "@cf/openai/whisper-large-v3",
} as const;

/**
 * AI Model Categories
 */
export const AI_MODEL_CATEGORIES = {
  TEXT_GENERATION: "text_generation",
  EMBEDDING: "embedding",
  CODE_GENERATION: "code_generation",
  TRANSLATION: "translation",
  IMAGE_GENERATION: "image_generation",
  TEXT_CLASSIFICATION: "text_classification",
  NAMED_ENTITY_RECOGNITION: "named_entity_recognition",
  QUESTION_ANSWERING: "question_answering",
  TEXT_SUMMARIZATION: "text_summarization",
  TEXT_TO_SPEECH: "text_to_speech",
  SPEECH_TO_TEXT: "speech_to_text",
} as const;

/**
 * AI Model Capabilities
 */
export const AI_CAPABILITIES = {
  // Text generation capabilities
  TEXT_COMPLETION: "text_completion",
  CHAT_COMPLETION: "chat_completion",
  CODE_COMPLETION: "code_completion",
  CREATIVE_WRITING: "creative_writing",
  TECHNICAL_WRITING: "technical_writing",

  // Analysis capabilities
  SENTIMENT_ANALYSIS: "sentiment_analysis",
  TOPIC_CLASSIFICATION: "topic_classification",
  INTENT_RECOGNITION: "intent_recognition",
  ENTITY_EXTRACTION: "entity_extraction",
  KEYWORD_EXTRACTION: "keyword_extraction",

  // Processing capabilities
  TEXT_SUMMARIZATION: "text_summarization",
  TEXT_TRANSLATION: "text_translation",
  TEXT_NORMALIZATION: "text_normalization",
  TEXT_CLEANING: "text_cleaning",

  // Generation capabilities
  IMAGE_GENERATION: "image_generation",
  AUDIO_GENERATION: "audio_generation",
  CODE_GENERATION: "code_generation",

  // Understanding capabilities
  DOCUMENT_UNDERSTANDING: "document_understanding",
  CONTEXT_UNDERSTANDING: "context_understanding",
  SEMANTIC_UNDERSTANDING: "semantic_understanding",
} as const;

/**
 * AI Model Parameters
 */
export const AI_PARAMETERS = {
  // Temperature ranges
  TEMPERATURE_MIN: 0.0,
  TEMPERATURE_MAX: 2.0,
  TEMPERATURE_DEFAULT: 0.7,

  // Token limits
  MAX_TOKENS_MIN: 1,
  MAX_TOKENS_MAX: 8192,
  MAX_TOKENS_DEFAULT: 4000,

  // Top-p ranges
  TOP_P_MIN: 0.0,
  TOP_P_MAX: 1.0,
  TOP_P_DEFAULT: 0.9,

  // Top-k ranges
  TOP_K_MIN: 1,
  TOP_K_MAX: 100,
  TOP_K_DEFAULT: 50,

  // Frequency penalty ranges
  FREQUENCY_PENALTY_MIN: -2.0,
  FREQUENCY_PENALTY_MAX: 2.0,
  FREQUENCY_PENALTY_DEFAULT: 0.0,

  // Presence penalty ranges
  PRESENCE_PENALTY_MIN: -2.0,
  PRESENCE_PENALTY_MAX: 2.0,
  PRESENCE_PENALTY_DEFAULT: 0.0,

  // Repetition penalty ranges
  REPETITION_PENALTY_MIN: 0.0,
  REPETITION_PENALTY_MAX: 2.0,
  REPETITION_PENALTY_DEFAULT: 1.0,
} as const;

/**
 * AI Model Roles
 */
export const AI_ROLES = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
  FUNCTION: "function",
} as const;

/**
 * AI Model Status
 */
export const AI_STATUS = {
  IDLE: "idle",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  TIMEOUT: "timeout",
} as const;

/**
 * AI Model Error Codes
 */
export const AI_ERROR_CODES = {
  INVALID_MODEL: "INVALID_MODEL",
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * AI Model Response Types
 */
export const AI_RESPONSE_TYPES = {
  TEXT: "text",
  JSON: "json",
  STREAM: "stream",
  EMBEDDING: "embedding",
  IMAGE: "image",
  AUDIO: "audio",
  CODE: "code",
} as const;

/**
 * AI Model Content Types
 */
export const AI_CONTENT_TYPES = {
  TEXT_PLAIN: "text/plain",
  TEXT_HTML: "text/html",
  TEXT_MARKDOWN: "text/markdown",
  APPLICATION_JSON: "application/json",
  APPLICATION_XML: "application/xml",
  IMAGE_PNG: "image/png",
  IMAGE_JPEG: "image/jpeg",
  IMAGE_WEBP: "image/webp",
  AUDIO_MP3: "audio/mpeg",
  AUDIO_WAV: "audio/wav",
  AUDIO_OGG: "audio/ogg",
} as const;

/**
 * AI Model Prompt Templates
 */
export const AI_PROMPT_TEMPLATES = {
  // Job extraction
  JOB_EXTRACTION: `Extract job information from the following text. Return a JSON object with the following structure:
{
  "title": "Job title",
  "company": "Company name",
  "location": "Job location",
  "salary_min": "Minimum salary (number or null)",
  "salary_max": "Maximum salary (number or null)",
  "description": "Job description",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill3", "skill4"],
  "experience_required": "Years of experience required (number or null)",
  "remote_work": "Whether remote work is allowed (boolean)",
  "employment_type": "Full-time, Part-time, Contract, etc.",
  "benefits": ["benefit1", "benefit2"],
  "application_deadline": "Application deadline (ISO date or null)"
}`,

  // Email classification
  EMAIL_CLASSIFICATION: `Classify the following email into one of these categories:
- job_alert: Job posting or job alert
- application_response: Response to job application
- interview_invitation: Interview invitation or scheduling
- rejection: Job application rejection
- offer: Job offer or contract
- follow_up: Follow-up or reminder
- other: Any other type of email

Return a JSON object with:
{
  "category": "category_name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification",
  "job_links": ["url1", "url2"],
  "otp_codes": ["123456", "789012"]
}`,

  // Resume analysis
  RESUME_ANALYSIS: `Analyze the following resume and extract key information. Return a JSON object with:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "location": "Location",
  "skills": ["skill1", "skill2"],
  "experience_years": "Total years of experience",
  "education": ["degree1", "degree2"],
  "certifications": ["cert1", "cert2"],
  "languages": ["language1", "language2"],
  "summary": "Professional summary",
  "strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1", "area2"]
}`,

  // Cover letter generation
  COVER_LETTER_GENERATION: `Generate a professional cover letter based on the following job description and applicant information. Return a JSON object with:
{
  "subject": "Email subject line",
  "body": "Cover letter body",
  "html": "HTML formatted cover letter",
  "tone": "Professional tone used",
  "key_points": ["point1", "point2"],
  "customization_notes": "Notes about how the letter was customized"
}`,

  // Interview preparation
  INTERVIEW_PREPARATION: `Prepare interview questions and answers based on the job description and applicant profile. Return a JSON object with:
{
  "technical_questions": ["question1", "question2"],
  "behavioral_questions": ["question1", "question2"],
  "situational_questions": ["question1", "question2"],
  "answers": {
    "question1": "suggested_answer1",
    "question2": "suggested_answer2"
  },
  "company_research": "Research notes about the company",
  "questions_to_ask": ["question1", "question2"],
  "preparation_tips": ["tip1", "tip2"]
}`,

  // Company analysis
  COMPANY_ANALYSIS: `Analyze the following company information and provide insights. Return a JSON object with:
{
  "company_name": "Company name",
  "industry": "Industry sector",
  "size": "Company size category",
  "culture": "Company culture description",
  "values": ["value1", "value2"],
  "benefits": ["benefit1", "benefit2"],
  "growth_stage": "Startup, Growth, Mature, etc.",
  "reputation": "Company reputation score (1-10)",
  "work_life_balance": "Work-life balance rating (1-10)",
  "career_growth": "Career growth opportunities rating (1-10)",
  "diversity_inclusion": "Diversity and inclusion rating (1-10)",
  "salary_range": "Typical salary range for the role",
  "remote_friendly": "Whether the company is remote-friendly",
  "notable_achievements": ["achievement1", "achievement2"],
  "recent_news": ["news1", "news2"],
  "red_flags": ["flag1", "flag2"],
  "green_flags": ["flag1", "flag2"]
}`,
} as const;

/**
 * AI Model Performance Metrics
 */
export const AI_METRICS = {
  // Response time thresholds (in milliseconds)
  RESPONSE_TIME_EXCELLENT: 1000,
  RESPONSE_TIME_GOOD: 3000,
  RESPONSE_TIME_ACCEPTABLE: 5000,
  RESPONSE_TIME_SLOW: 10000,

  // Accuracy thresholds
  ACCURACY_EXCELLENT: 0.95,
  ACCURACY_GOOD: 0.85,
  ACCURACY_ACCEPTABLE: 0.75,
  ACCURACY_POOR: 0.6,

  // Confidence thresholds
  CONFIDENCE_HIGH: 0.9,
  CONFIDENCE_MEDIUM: 0.7,
  CONFIDENCE_LOW: 0.5,
  CONFIDENCE_VERY_LOW: 0.3,
} as const;

/**
 * AI Model Rate Limits
 */
export const AI_RATE_LIMITS = {
  // Requests per minute
  REQUESTS_PER_MINUTE: 60,
  REQUESTS_PER_HOUR: 1000,
  REQUESTS_PER_DAY: 10000,

  // Tokens per minute
  TOKENS_PER_MINUTE: 100000,
  TOKENS_PER_HOUR: 1000000,
  TOKENS_PER_DAY: 10000000,

  // Concurrent requests
  MAX_CONCURRENT_REQUESTS: 10,

  // Burst limits
  BURST_LIMIT: 20,
  BURST_WINDOW: 60000, // 1 minute
} as const;
