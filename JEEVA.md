# Jeeva AI chat

Updated 1 November 2026. Authenticated `POST /api/v1/chat/messages` supports general medical/health education and Arogio app help. It does not diagnose, prescribe/select drugs, recommend/validate medication or supplement doses, frequency or duration, change treatment, or operate app controls. General medicine risks/side effects and help recording an existing clinician-provided schedule are allowed without repeating or validating doses. Possible threats to life suppress the normal answer and return curated Safety notice text.

## Configuration and deployment

`NVIDIA_API_KEY` stays on the backend. Use that canonical spelling, not the historical `NVIDEA_API_KEY`. `NVIDIA_MODEL` defaults to `nvidia/nemotron-3.5-lightning-30b-a3b`; the fixed endpoint is `https://integrate.api.nvidia.com/v1/chat/completions`. The configured model must support JSON response mode for triage/review. No new SDK, environment variable or database migration is required. Compiled `dist` is included for shared hosting. Deploy backend and app together, backend first. No deployment or APK distribution is established by this work.

The default model was exercised with synthetic live prompts. Availability is not guaranteed: a live education request timed out at the 35-second boundary and failed closed; a later retry passed. Check availability/JSON compatibility before changing models. Official provider reference: [NVIDIA Nemotron 3.5 Lightning](https://docs.nvidia.com/nim/large-language-models/2.0.10/get-started/advanced/get-started-nemotron-3.5-lightning.html).

## API and safety pipeline

```json
{"useSavedHealth":false,"messages":[{"role":"user","content":"What does blood pressure mean?"}]}
```

Responses contain `message: { role: "assistant", content: "..." }`, `kind: "answer" | "medication" | "urgent" | "harmful" | "off_topic"`, `createdAt` and `savedHealthIncluded`. The app renders urgent/harmful responses as Safety notice and medication as Medicine safety. It rejects unknown kinds or malformed content; missing kind is accepted as a legacy answer. Local reply-kind metadata is stripped from submitted history.

1. Server validation enforces alternating user/assistant turns ending in a user question. System instructions, model choices and extra fields are rejected.
2. High-confidence local urgent and medication detectors return authored guidance before checking the provider key or loading saved records. These routes work without provider configuration; they are not an exhaustive detector.
3. Remaining requests use structured JSON model triage. Only the current question and conversation are attached, with history used to resolve references. A blocked prior request must not block a new unrelated safe question.
4. Allowed clear app-help requests use maintained authored screen instructions. Other allowed requests are generated with general education and app capability constraints.
5. Generated candidates pass a numeric-dose guard and structured model review before any content is released. Candidate review can also check opted-in saved records. Blocked candidates are replaced by curated guidance; provider errors, malformed decisions and failed reviews fail closed with a retryable error.

The same NVIDIA model performs triage, generation and review. This is an engineering safeguard, not independent clinical review, clinical certification or a guarantee against all medical harms. No response streams before review. Saved medicine amounts may exist in opted-in source data but must never be repeated or validated in replies.

Limits: 21 messages; 2,000 characters per user question; 4,000 per historical assistant reply; 20,000 total characters; 600 generated answer tokens. The endpoint uses account JWT authentication, private/no-store responses, the existing ten-requests/minute/IP throttler and one in-flight provider request per account per process. Shared account budgets across multiple servers require shared storage. Provider stages share a 35-second abort budget; the app allows 45 seconds. Neither layer automatically retries.

## Records and privacy

Both API and app default saved health access to **off**. The expandable disclosure explains sharing before opt-in; changing access starts a new chat so earlier record-based replies leave follow-up context. Ordinary conversations go to NVIDIA unless a local safety route resolves the request. Authored app help still requires provider triage. Opted-in summaries are fetched fresh before triage but are not attached to input triage; generation and candidate review may receive them.

Record ownership comes solely from the JWT account ID. Context contains age in years, height/weight, activity level/goals, seven days of logged activity/water, up to twenty medicine schedules, three recent periods and seven days of cycle check-ins. Names, email, phone, location, account IDs, free-text medicine/cycle notes and device-only sensor/Health Connect readings are excluded. Strings are untrusted data, schedules do not establish adherence, missing values remain unknown and saved targets are not recommendations. Summaries are not cached between accounts/questions; database errors stop the request.

Chat remains in memory for the mounted account session and is not written by Arogio to database/device storage. NVIDIA receives submitted data; this does not assert a provider retention policy. Request-body messages are redacted from application logging, provider bodies/credentials are not surfaced, and public monitoring stores request metadata only. The frontend contains no NVIDIA key or direct provider call.

## Verification and limits

Backend lint/build and 106 tests in 15 suites pass, including 32 focused chat tests (`.tmp/jeeva-tests.log`). Coverage includes validation, provider/review failures, safety boundaries, fresh records, context opt-out, isolation, JWT enforcement, throttling and privacy. Frontend lint/typecheck/119 tests and an Android emulator release build pass. Synthetic live checks exercised education, authored app help, urgent/medication/harmful routing and safe continuation after a blocked request. The initial live smoke exposed invented controls/app promotion; authored app guidance and unsupported-feature instructions corrected common paths. The timeout above remains an availability limit.

Only synthetic prompts and a disposable local account were used; no personal/saved health records were sent to the provider. QA used an in-memory database on port 3001 and did not touch the production database. The independent reviewer returned SHIP with no material remaining findings within Android UI/engineering scope. iOS, physical hardware, screen readers, motion performance and comprehensive clinical validation remain unverified. See the frontend `docs/jeeva-chat.md` for qualified native evidence and screenshot paths. No native detector was applicable to this native-code surface.
