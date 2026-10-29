# Let’s Unpack

## Run locally
Set GROQ_API_KEY, GROQ_MODEL, SUPABASE_URL, and SUPABASE_PUBLISHABLE_KEY in .env. Run `node server.mjs` and open http://127.0.0.1:4173. The default Groq model is openai/gpt-oss-120b. 

## Supabase flow
Anonymous Supabase Auth sessions identify learners without a login form. The six tables are learners, concepts, case_questions, attempts, gaps, and retries. The latest seven concepts and 35 golden pairs are seeded. Schema and seed SQL are in supabase/.

After the learner explains the concept, a golden-pair question is assigned and its first answer is graded and saved. Only then does Groq mark an exact sentence and write one follow-up. The follow-up reply is stored as a retry, a different golden-pair question is selected, and database code grades the final answer. Both question prompts, answers, and results are retained in the attempt record; the summary identifies Not yet → Pass improvements. Past-attempt cards show only the concept, time, result, and practice button. Answer keys and grading rules are never sent to the frontend. All six tables have RLS. Learners can read only their own attempts. Direct answer-key reads and direct result writes are denied. Completed attempts cannot be overwritten through the API. Retries of a submitted request return the original result.

Enable Allow anonymous sign-ins in the exact configured Supabase project, separately from general user sign-ups. This setting must be active before authenticated end-to-end testing can pass.

History belongs to its anonymous browser session; clearing browser data loses that session. Previous browser-only history is preserved in its old localStorage key and is not automatically imported as verified database results.

.env is excluded from Git, Vercel uploads, and the source archive. No Supabase service-role key is used. Do not publish local auth-session test files.

## Before and after questions
For an existing database, apply `supabase/upgrades/before-follow-up.sql` once before deploying the updated API. Fresh databases use `supabase/schema.sql` (which includes the upgrade) and then `supabase/seed.sql`. Run `node tests/before-after.mjs` against the local app, or set `TEST_BASE_URL` for a deployed app. The test creates synthetic learner attempts and writes `outputs/before-after-verification.md`. It checks stage order, different questions, idempotence, grading, private history, and learner isolation.

## Explain an unfamiliar idea
The opening message offers an explanation. Learners can select “I don’t understand — explain it” or type requests such as “I don’t understand”, “I don’t know”, or “please explain”. The `/api/explain` endpoint returns a concept explanation based on the golden-pairs document and a short everyday example. It does not create or grade an attempt. The learner then explains in their own words before starting Case 1. Explanations are stored in `lib/concept-lessons.json`; case prompts and answer keys are not returned by this endpoint.

## Final explanations
After Case 2, the chat reviews Case 1, the follow-up reply, and Case 2. Case explanations use the golden-pair reasons and saved code-based grades. Groq provides descriptive follow-up feedback without scoring understanding or altering case grades; it is saved once in `gaps.feedback`. If feedback generation fails, both case results remain visible and a retry fetches just the missing feedback. Past-attempt cards remain summaries without answers. Existing databases apply `supabase/upgrades/final-review.sql` once.

## End after a first-case pass
A Case 1 pass ends the session immediately with results first and the Case 1 explanation. Only a failed Case 1 proceeds to the recited phrase, follow-up, and different Case 2. Apply `supabase/upgrades/end-after-first-pass.sql` for existing databases. `completed_after_first` distinguishes these sessions; legacy completion columns mirror Case 1 for existing history compatibility, while the review returns only one case. Existing completed sessions are unchanged. Run `node tests/first-case-pass.mjs` and `node tests/before-after.mjs` locally.

## Gap closure in history
Apply `supabase/upgrades/gap-closure.sql`. The stored generated `attempts.gap_closed` value is true only for a failed Case 1 followed by a pass on a different Case 2. A failed Case 2 leaves the gap open; a Case 1 pass shows No gap identified. Legacy attempts without a baseline show Gap status unavailable. History returns only summary fields and gap status, never learner answers or answer keys.
