# Jeeva AI chat

The authenticated `POST /api/v1/chat/messages` endpoint forwards a bounded conversation to NVIDIA's hosted chat-completions API. `NVIDIA_API_KEY` stays on the backend. The originally supplied `NVIDEA_API_KEY` variable was corrected to `NVIDIA_API_KEY` in the ignored local `.env`; configure the canonical name in production as well.

`NVIDIA_MODEL` defaults to `nvidia/nemotron-3.5-lightning-30b-a3b`, verified with a synthetic live greeting on 31 October 2026. The endpoint is fixed to `https://integrate.api.nvidia.com/v1/chat/completions`. No new SDK dependency is required. The model can be overridden server-side; verify its availability and compatibility before changing it. The provider's older Llama 3.3 endpoint returned HTTP 410 despite remaining in documentation; model documentation alone is not proof of live availability.

Request shape:

```json
{"useSavedHealth":true,"messages":[{"role":"user","content":"What do my saved activity records show?"}]}
```

The response contains `message: { role: "assistant", content: "..." }`, `createdAt` and `savedHealthIncluded`. Access requires the normal account JWT. Conversations must alternate user/assistant and end with a user question. Client-supplied system instructions, model choices and extra fields are rejected. Limits: 21 messages, 2,000 characters per user question, 4,000 per historical assistant reply, 20,000 total characters, and 600 generated tokens. The backend allows one in-flight request per account per process and uses the existing throttler with a route limit of ten requests/minute/IP. Multi-server aggregate account budgets require shared rate-limit storage before a larger rollout. Backend timeout is 35 seconds; the app allows 45 seconds. No automatic retry spends extra provider requests.

Jeeva helps with general wellness education, app navigation and questions about the authenticated user?s saved health summaries when `useSavedHealth: true`. The API defaults to false when the flag is absent. The client defaults its visible record-access switch to on and discloses the categories before sending. Switching access starts a new chat to remove earlier record-based replies from subsequent context. Jeeva cannot operate trackers. Its instructions prohibit claiming access/actions it does not have, prescribing or changing medication, and offering diagnoses. These instructions are safeguards, not clinical validation; evaluate real use cases before a public rollout. No personal health data was used in the connection test.

Saved context is fetched fresh on every enabled request using the JWT account ID, never a client-supplied owner. It contains age in years (not birth date), height/weight, activity level/goals, seven days of logged activity/water, up to twenty saved medicine schedules, three recent periods and seven days of cycle check-ins. Names, email, phone, location, account IDs, free-text medicine/cycle notes and device-only sensor/Health Connect readings are excluded. All record strings are presented as untrusted data under server instructions; schedules do not establish adherence, missing values are unknown, and recorded targets are not medical recommendations. The summary is not cached between accounts or questions. Database errors stop the request rather than silently substituting someone else?s or stale records.

The app shows NVIDIA processing disclosure before the first send. It keeps chat only in memory for the mounted account session, sends recent complete turns for follow-up context, and offers New chat, retry and edit-question controls. Chat is not written to the database or device storage by Arogio. NVIDIA receives the submitted messages; this does not assert a provider retention policy. Request-body messages are redacted from application logging, provider errors are replaced with safe errors, replies use `Cache-Control: private, no-store`, and public monitoring stores only request metadata.

Validation: backend input/provider tests, isolated PostgreSQL-compatible HTTP journeys for JWT enforcement, private replies, monitoring privacy, throttling, fresh records, cross-account isolation and explicit context opt-out; frontend conversation-context tests and lint/typecheck; synthetic 390px welcome and 320px retry-state visual previews. The preview uses the actual chat content, controls and theme with a simplified header. Native keyboard and screen-reader acceptance still require device testing. The frontend has no NVIDIA key or direct provider call.

No deployment, store release or new APK is included in this change. Deploy the backend with the canonical key and rebuild/update the app before testing through a production installation. Previously generated APK build 30 predates Jeeva chat.

Provider reference: https://docs.api.nvidia.com/nim/reference/llm-apis and https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b.
