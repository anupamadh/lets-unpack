# Let’s Unpack golden pairs

Questions, expected answers, explanations, and grading notes used by the app.

## Why does a backend exist at all?

### 1 Rules can be bypassed

A quiz app checks answers in the browser, then sends {"score": 4} to the server, which saves it. Using DevTools, a learner changes the request to {"score": 10} before it’s sent. What score gets saved, and why?

**Expected answer:** 10

**Explanation:** The server trusted a result calculated on the user’s machine. The answers should be checked on the server.

### 2 Secrets leak

A weather app calls a paid weather API straight from the browser, with the API key in the JavaScript. The developer’s monthly bill goes from $5 to $400, but the app’s traffic hasn’t changed. What’s the most likely cause?

**Expected answer:** someone copied the key

**Explanation:** They are using it outside the app. The key should live on a backend that calls the API for the app.

⚠ Grading note: Open answer. Grade by keywords: “key” AND (“copied” OR “stolen” OR “leaked” OR “someone else using it”). Failure mode: a correct answer worded another way, e.g. “it got scraped from the JS”, may fail.

### 3 Nothing is shared

A team poll app stores votes in each user’s localStorage. Five teammates vote “Pizza.” Then a sixth teammate opens the app on their own laptop. How many votes for “Pizza” do they see, and why?

**Expected answer:** 0 (zero)

**Explanation:** Each vote is stored only in that voter’s browser. A backend and database are needed to collect votes in one shared place.

### 4 No safe route to other services

A shop app puts its database password inside the webpage code. The database holds the orders of 500 customers. A curious visitor copies the password and connects to the database. How many customers’ orders can they read?

**Expected answer:** 500 (all of them)

**Explanation:** The password works for whoever has it, so the visitor sees everything the app can see. Only the backend should hold the database password and hand each user only their own data.

⚠ Grading note: Accept: “500”, “all”, “all 500”, “everyone’s”.

### 5 Combined

A course app hides the “Download certificate” button in the browser unless user.paid === true. The certificate file is served from a public URL. A learner who hasn’t paid opens DevTools. They change one value in DevTools and the button appears. Which value do they change?

**Expected answer:** user.paid (set to true)

**Explanation:** Changing user.paid makes the button appear, because the check runs in the browser. The payment check and the file should both sit behind the backend.

⚠ Grading note: Accept: “user.paid”, “paid”, “the paid flag”.

## What does one API call carry?

### 6 The receiver remembers nothing

Priya tells a chatbot her name. For her next question, the app sends only “What is my name?” and leaves out her earlier message. Can the chatbot know her name from this new request alone?

**Expected answer:** No

**Explanation:** The new request does not include Priya’s name. The app must send the earlier message again for the chatbot to use it.

Grading note: Accept “no”, “it cannot know”, “it does not know”, “it cannot remember”, or an explanation that the name or earlier message was not included. “Yes” or “Priya” alone does not pass.

### 7 Who’s asking

A developer’s server calls the LLM API but forgets the Authorization header. The body is correct. What status code comes back, and why?

**Expected answer:** 401

**Explanation:** The key has to travel with every call, because the API doesn’t remember that this server called before.

### 8 Wrong action

A FastAPI server defines @app.post("/diagnose"). A learner opens http://localhost:8000/diagnose in the browser address bar. What happens, and why?

**Expected answer:** 405 Method Not Allowed — the browser sends GET, but the endpoint only accepts POST.

**Explanation:** Typing a URL in the browser address bar sends GET, but /diagnose only accepts POST, so FastAPI responds with 405 Method Not Allowed.

Grading note: Accept “405”, “Method Not Allowed”, or a complete explanation that the browser sends GET instead of POST (for example, “it’s sending a GET request instead of POST”). “GET” alone and “POST” alone must fail. A reversed explanation such as “POST instead of GET” must fail. Do not require the numeric status code when the complete method mismatch is explained.

### 9 Missing data

A server expects a problem report in a field named "description". The app sends it in a field named "desc" instead. Which field name should the app use so the server can read the report?

**Expected answer:** description

**Explanation:** The field name must match what the server expects. Sending "desc" does not provide the required "description" field.

Grading note: Accept “description”, “the description field”, or “rename desc to description”. “desc” alone and a status code alone do not pass. The learner does not need to know an HTTP status code.

### 10 One package

An app wants an AI to translate “Hello” into Hindi. What should it send in one request: just “Hello”, or “Hello” together with the instruction “Translate into Hindi”?

**Expected answer:** Both the sentence and the translation instruction together.

**Explanation:** The AI needs both what to do and the text to do it to in the same request.

Grading note: Accept “both”, “together”, “the sentence and the instruction”, “the instruction and the sentence”, or “Hello and Translate into Hindi”. “Just Hello”, “only the sentence”, or “the instruction alone” does not pass.

## Why can’t the key live in the browser?

### 11 Hiding tricks don’t work

A developer minifies and obfuscates their React bundle so the key looks like random characters spread across the file. A visitor opens the Network tab and sends one chat message. In which part of the request can they read the key in plain text?

**Expected answer:** the Authorization header

**Explanation:** The key has to be sent in usable form in the request’s Authorization header, so it shows up in plain text in the Network tab whatever the bundle looks like.

⚠ Grading note: Accept: “Authorization”, “header”, “request headers”.

### 12 Whoever holds the key, you pay

A developer puts the OpenAI key inside their webpage’s JavaScript. A stranger copies it and uses it in their own script to make 1,000 AI calls. Whose account is billed for those 1,000 calls?

**Expected answer:** the developer’s

**Explanation:** The key isn’t tied to the app. The AI provider bills the key’s owner for every call made with it, from anywhere. That’s why the key must stay on the server.

⚠ Grading note: Accept: “developer”, “the developer’s account”, “the app owner”, “mine”.

### 13 HTTPS doesn’t hide it from the user

The site runs on HTTPS, and the developer says “the key is encrypted in transit, so it’s safe in the frontend.” A visitor opens DevTools on their own laptop. In which DevTools tab do they find the key in plain text?

**Expected answer:** the Network tab

**Explanation:** HTTPS protects data between the browser and the server from other people on the network. The visitor’s own browser decrypts everything, so they can see it.

⚠ Grading note: Accept: “Network”. Also accept “Sources” if the key is in the bundle.

### 14 Deleting it isn’t enough

A key was in the frontend for a week. The developer removes it from the code and redeploys. Two days later, the provider dashboard still shows usage the app didn’t make. Why, and what should they have done?

**Expected answer:** revoke the key and issue a new one

**Explanation:** Someone copied the key while it was exposed, and it’s still valid. The new key should live only on the backend.

⚠ Grading note: Accept: “revoke”, “rotate”, “regenerate”, “new key”. “Remove it from the code” alone fails.

### 15 Backend proxy

A developer moves the key to their backend. The browser now sends POST /chat with {"message": "..."}, and the backend calls the LLM. A visitor opens the Network tab. On which machine is the key added to the LLM request?

**Expected answer:** the server

**Explanation:** They see the request to /chat with their own message and the reply. The key is added on the server and never goes to the browser.

⚠ Grading note: Accept: “server”, “backend”.

## Why does the app forget without storage?

### 16 Browser state resets

A React app keeps a counter in useState. A user clicks "+1" seven times, then refreshes the page. What does the counter show, and why?

**Expected answer:** 0

**Explanation:** Component state lives only in the page’s memory, and a refresh wipes it. It would need to be saved to storage and loaded on startup.

### 17 Server RAM resets

An app saves 10 attempts in temporary memory. The server restarts. How many attempts remain?

**Expected answer:** 0

**Explanation:** Temporary memory is cleared when the server restarts. Save attempts in a database to keep them.

Grading note: Accept “0”, “zero”, “none”. Grade the answer to this revised question; do not require technical terminology.

### 18 Separate instances

An app runs on two server instances behind a load balancer and stores each learner’s progress in RAM. A learner completes 3 steps, and all those requests go to instance A. Their next request goes to instance B. How many completed steps does instance B find for them?

**Expected answer:** 0

**Explanation:** Each instance has its own RAM, so B never saw the 3 steps. Shared progress has to go in a database that both instances read from.

### 19 Stored but not sent

An app sends only the latest chat message to the AI. Can the AI see the earlier messages?

**Expected answer:** No

**Explanation:** The AI can only use the messages included in this request. Saving older messages does not automatically send them to the AI.

Grading note: Accept “no”, “cannot see”, “can't see”, “does not see”, “doesn't see”, “not sent”, “not included”. Grade the answer to this revised question; do not require technical terminology.

### 20 Browser storage is per-browser

You save three notes in your browser. Will they appear in a new Incognito window?

**Expected answer:** No

**Explanation:** A new Incognito session has separate browser storage, so it cannot read the notes saved in the normal browser.

Grading note: Accept “no”, “will not”, “won't”, “zero”, “0”, “none”. Grade the answer to this revised question; do not require technical terminology.

## Why does the pointer sit on the many side?

### 21 Basic placement

Your app has a learners table and an attempts table. One learner makes many attempts, and each attempt belongs to one learner. Which table gets the pointer column?

**Expected answer:** attempts

**Explanation:** Each attempt has exactly one learner, so the attempts table holds one value: learner_id.

⚠ Grading note: Accept: “attempts”, “attempts table”, “attempts.learner_id”.

### 22 A list in a cell

Two requests each add an ID to the same old list. The second save overwrites the first. How many new IDs survive?

**Expected answer:** 1

**Explanation:** Only the ID added by the second request survives. Its save overwrites the first request’s version of the list.

Grading note: Accept “1”, “one”, “only the second”, “only the last”. Grade the answer to this revised question; do not require technical terminology.

### 23 Duplicated parent rows

Priya’s email appears in six records. Only one is updated with her new email. How many different emails are now stored?

**Expected answer:** 2

**Explanation:** Five records still contain the old email, and one contains the new email: two different addresses.

Grading note: Accept “2”, “two”. Grade the answer to this revised question; do not require technical terminology.

### 24 Your proof link

In Concept Check, the LLM names one gap per session, and a learner may submit up to 2 retries that answer that gap. Which table holds the pointer?

**Expected answer:** retries

**Explanation:** Each retry answers exactly one gap, so the retries table holds gap_id, while a gap can have many retries.

⚠ Grading note: Accept: “retries”, “retries table”, “retries.gap_id”.

### 25 When neither side works

Students can join many courses. Courses can have many students. Should a separate table record who joined which course?

**Expected answer:** Yes

**Explanation:** A separate table stores one student and one course per row. This supports many students joining many courses.

Grading note: Accept “yes”, “separate table”, “join table”, “junction table”, “enrollments”, “student_courses”. Grade the answer to this revised question; do not require technical terminology.

## Why is history a row, not a cell?

### 26 Losing the before (your proof)

Concept Check stores learners.last_case_result, updated after each new case. A learner fails the first case, gets the follow-up, then passes the second case. A reviewer asks for proof of “failed before, passed after.” What can the database show, and why?

**Expected answer:** only “passed” (1 result)

**Explanation:** The fail was overwritten. With one row per attempt in attempts, both results are kept with their times.

⚠ Grading note: Tightened: to grade by code, change the case question to “How many case results can the database show?” → core: 1.

### 27 Losing the when

An app keeps only the latest delivery status. After “placed”, “shipped”, and “delivered”, which status remains?

**Expected answer:** delivered

**Explanation:** Each new status replaces the previous one. Only delivered remains because no status history was saved.

Grading note: Accept “delivered”. Grade the answer to this revised question; do not require technical terminology.

### 28 Losing the why

A wallet app stores only accounts.balance and updates it on every payment. A user’s balance dropped from $200 to $140, and they want to know which charge caused it. How many individual charges can the app list for them?

**Expected answer:** 0

**Explanation:** Only the current balance is stored, so the individual charges are lost. A transactions table with one row per charge would show them, and the balance can be calculated from those rows.

### 29 History changes the meaning of old records

A shirt cost $20 when bought and costs $25 now. An invoice uses today’s price. What price does it show?

**Expected answer:** $25

**Explanation:** The invoice reads today’s price of $25. The app would need to save the purchase price to show the original $20.

Grading note: Accept “25”, “twenty five”. Grade the answer to this revised question; do not require technical terminology.

### 30 Questions across many records

An app keeps one latest sentence per learner. With 30 learners, how many sentences are saved?

**Expected answer:** 30

**Explanation:** There is one saved sentence for each of the 30 learners, so there are 30 sentences in total.

Grading note: Accept “30”, “thirty”. Grade the answer to this revised question; do not require technical terminology.

## How do you decide where a piece lives?

### 31 Trust → server

In Concept Check, each new case has a known answer. A developer sends the case and its answer to the browser, so the browser can show “Correct!” instantly. Where should the answer live, and why?

**Expected answer:** on the server, never sent to the browser

**Explanation:** The learner could read it in DevTools before answering. The browser sends the learner’s answer, and the server checks it.

### 32 Fixed rule → code, not AI

A developer asks the LLM, “Based on this retry, has the learner understood now? Reply PASS or FAIL,” and saves the result. Where should the pass/fail decision live, and why?

**Expected answer:** in code on the server, not the LLM

**Explanation:** Code checks the new case against the pre-written answer key. Pass/fail is a fixed rule, and letting the AI decide understanding is the no-go.

⚠ Grading note: Pass only if the answer says “code” (or rules out the LLM). “On the server” alone is not enough, because the LLM call also starts from the server.

### 33 Harmless and temporary → browser memory

A learner is halfway through typing their explanation and hasn’t submitted it. A developer wants to save every keystroke to the database “just in case.” Where should the in-progress text live, and why?

**Expected answer:** in the browser (component state or localStorage)

**Explanation:** It’s harmless and not needed by anyone else yet. It goes to the server only when submitted.

### 34 Which table → one fact, one place

Should a learner’s email be saved once in their learner record or repeated in every attempt?

**Expected answer:** Once in the learner record

**Explanation:** The email describes the learner. Store it once in the learner record and link attempts using the learner ID.

Grading note: Accept “once”, “learner record”, “learners record”, “learners table”, “learner table”. Grade the answer to this revised question; do not require technical terminology.

### 35 Same kind of data, different answer

The list of 7 ideas and the answer key are both fixed lists shipped in code. The developer sends both to the browser. Which one should not be sent?

**Expected answer:** the answer key

**Explanation:** Learners need to see the ideas list to pick one. Seeing the answer key lets them pass without reasoning. The same kind of data goes in different places because of one question: can the user be trusted to see it?
