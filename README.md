# Let’s Unpack

## Run locally
Set GROQ_API_KEY, GROQ_MODEL, SUPABASE_URL, and SUPABASE_PUBLISHABLE_KEY in .env. Run `node server.mjs` and open http://127.0.0.1:4173. The default Groq model is openai/gpt-oss-120b. This integration has not been pushed or deployed.

## Supabase flow
Anonymous Supabase Auth sessions identify learners without a login form. The six tables are learners, concepts, case_questions, attempts, gaps, and retries. The latest seven concepts and 35 golden pairs are seeded. Schema and seed SQL are in supabase/.

Groq marks an exact sentence and writes one follow-up. The learner reply is stored as a retry, a new case is selected, and database code grades the answer. Answer keys and grading rules are never sent to the frontend. All six tables have RLS. Learners can read only their own attempts. Direct answer-key reads and direct result writes are denied. Completed attempts cannot be overwritten through the API. Retries of a submitted request return the original result.

Enable Allow anonymous sign-ins in the exact configured Supabase project, separately from general user sign-ups. This setting must be active before authenticated end-to-end testing can pass.

History belongs to its anonymous browser session; clearing browser data loses that session. Previous browser-only history is preserved in its old localStorage key and is not automatically imported as verified database results.

.env is excluded from Git, Vercel uploads, and the source archive. No Supabase service-role key is used. Do not publish local auth-session test files.
