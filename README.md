# Let’s Unpack UI

A responsive, buildless chat UI based on the supplied high-level design, UI sketch, reference screenshots, and selected golden pairs.

Add your Groq key to `.env` as `GROQ_API_KEY=...`, then run `node server.mjs` from this directory. Open http://127.0.0.1:4173. The server reads configuration on each request, so saving the key does not require a restart. Do not use a static file URL for the LLM flow.

## Included
- Seven concept choices
- Explanation, highlighted phrase, Groq-generated follow-up, one case, and Pass / Not yet flow
- Deterministic keyword checks for the included sample cases
- Append-only attempt records in this browser's localStorage
- Attempt history and repeat practice
- Responsive desktop and mobile layout

## Scope
The local Node server calls Groq to identify an exact sentence where the explanation becomes a phrase and generate one targeted follow-up. The key stays in `.env` outside the served `dist` directory, is ignored by Git, and is excluded from the downloadable archive. The backend validates the quoted text and question format. Provider failures offer a retry rather than a scripted fallback. An explanation that already explains the mechanism gets a transfer question without a fabricated highlight.

This remains a prototype: pass/fail and sample answer keys still live in browser JavaScript; localStorage holds attempts. Move grading and keys to the server before using this for assessment. Real Groq calls need a valid configured key.

## Backend handoff
Use server endpoints to create attempts, submit explanations, and submit case answers. The server should select cases and grade only answer_core with explicitly accepted wordings. Show answer_reason only after grading. An LLM may identify a recited sentence and write a follow-up, but must not decide pass/fail. Keep credentials and answer keys on the server. Persist learners, concepts, case_questions, attempts, gaps, and retries in separate tables with foreign keys on the many side, preserving every attempt. Replace browser-local records with learner-scoped server reads and writes.
