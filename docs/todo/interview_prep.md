Goal: Build an advanced `InterviewCoachAgent` that provides a hyper-personalized, real-time mock interview experience.

System: You are a senior AI engineer specializing in Cloudflare Agents. Your task is to design and implement a new `InterviewCoachAgent`.

User:
Please build the `InterviewCoachAgent`.

**1. Agent Definition (`wrangler.toml` & Agent Class):**

- **Name:** `InterviewCoachAgent`
- **Goal:** To act as a personal interview coach by synthesizing all available information to generate highly relevant questions and provide real-time, voice-based practice and feedback.

**2. Agent Tools (Powered by Durable Objects & Bindings):**
The agent MUST have the following tools available:

- `get_job_details(job_id: str)`: Fetches full job data from a `JobDO`.
- `get_applicant_profile(user_id: str)`: Fetches the user's master profile from an `ApplicantDO`.
- `get_submitted_documents(job_id: str, user_id: str)`: Fetches the specific resume and cover letter PDFs/text submitted for this job from an `AssetsDO`.
- `search_web(query: str)`: A tool to perform web searches, primarily for researching interviewers' professional backgrounds (e.g., on LinkedIn).
- `initiate_realtime_session(job_id: str)`: A critical tool that initializes a mock interview. This will:
  - Trigger a `RealtimeAgent` via a binding.
  - The `RealtimeAgent` is responsible for the entire audio pipeline: using a service like Deepgram for STT and ElevenLabs for TTS, as shown in the Cloudflare Realtime Agents docs.
  - The `InterviewCoachAgent` orchestrates this; it doesn't handle the audio stream directly.

**3. Core Logic & Workflow:**
The agent's main task, `run_mock_interview(job_id, user_id)`, will follow these steps:

1.  **Context Gathering:** Use its tools to fetch the job description, applicant profile, and the specific resume/cover letter for the application.
2.  **Question Generation:** Send all gathered context to an LLM with a prompt like: "You are an expert interviewer for [Company] hiring a [Job Title]. Based on the job description AND the candidate's resume, generate 10 highly specific questions that probe the candidate's experience related to the role's key requirements."
3.  **Initiate Session:** Call `initiate_realtime_session`.
4.  **Interactive Loop (within the Realtime session):**
    a. For each generated question, send the text to the TTS service via the Realtime pipeline.
    b. Receive the user's spoken answer, transcribed to text by the STT service.
    c. Send the question and the transcribed answer to an LLM with a structured prompt: "Evaluate the user's answer to the question '[Question]' based on the STAR method, clarity, and relevance to the original job description. Provide a score (1-10) for each category and a concise suggestion for improvement. Return as JSON."
    d. Receive the JSON feedback and speak the suggestions back to the user via TTS.
