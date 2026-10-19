const concepts=[
  {
    "title": "Why does a backend exist at all?",
    "follow": "What can a user change on their own computer, and what should stay outside their control?",
    "cases": [
      [
        "A quiz app checks answers in the browser, then sends {\"score\": 4} to the server, which saves it. Using DevTools, a learner changes the request to {\"score\": 10} before it’s sent. What score gets saved, and why?",
        [
          "10",
          "ten"
        ],
        "The server trusted a result calculated on the user’s machine. The answers should be checked on the server.",
        null
      ],
      [
        "A weather app calls a paid weather API straight from the browser, with the API key in the JavaScript. The developer’s monthly bill goes from $5 to $400, but the app’s traffic hasn’t changed. What’s the most likely cause?",
        [
          "someone copied the key"
        ],
        "They are using it outside the app. The key should live on a backend that calls the API for the app.",
        [
          [
            "key"
          ],
          [
            "copied",
            "stolen",
            "leaked",
            "someone else using",
            "scraped"
          ]
        ]
      ],
      [
        "A team poll app stores votes in each user’s localStorage. Five teammates vote “Pizza.” Then a sixth teammate opens the app on their own laptop. How many votes for “Pizza” do they see, and why?",
        [
          "0",
          "zero",
          "none"
        ],
        "Each vote is stored only in that voter’s browser. A backend and database are needed to collect votes in one shared place.",
        null
      ],
      [
        "A shop app puts its database password inside the webpage code. The database holds the orders of 500 customers. A curious visitor copies the password and connects to the database. How many customers’ orders can they read?",
        [
          "500",
          "five hundred",
          "all",
          "all 500",
          "everyone's",
          "everyone",
          "all of them"
        ],
        "The password works for whoever has it, so the visitor sees everything the app can see. Only the backend should hold the database password and hand each user only their own data.",
        null
      ],
      [
        "A course app hides the “Download certificate” button in the browser unless user.paid === true. The certificate file is served from a public URL. A learner who hasn’t paid opens DevTools. They change one value in DevTools and the button appears. Which value do they change?",
        [
          "user.paid",
          "paid",
          "paid flag"
        ],
        "Changing user.paid makes the button appear, because the check runs in the browser. The payment check and the file should both sit behind the backend.",
        null
      ]
    ]
  },
  {
    "title": "What does one API call carry?",
    "follow": "Imagine the receiver has never heard from your app before. What must this request include?",
    "cases": [
      [
        "Priya tells a chatbot her name. For her next question, the app sends only “What is my name?” and leaves out her earlier message. Can the chatbot know her name from this new request alone?",
        [
          "no",
          "can't know",
          "cannot know",
          "doesn't know",
          "does not know",
          "won't know",
          "will not know",
          "can't remember",
          "cannot remember",
          "not included",
          "not sent",
          "left out",
          "leaves out"
        ],
        "The new request does not include Priya’s name. The app must send the earlier message again for the chatbot to use it.",
        null
      ],
      [
        "A developer’s server calls the LLM API but forgets the Authorization header. The body is correct. What status code comes back, and why?",
        [
          "401"
        ],
        "The key has to travel with every call, because the API doesn’t remember that this server called before.",
        null
      ],
      [
        "A FastAPI server defines @app.post(\"/diagnose\"). A learner opens http://localhost:8000/diagnose in the browser address bar. What happens, and why?",
        [
          "405",
          "method not allowed"
        ],
        "Typing a URL in the browser address bar sends GET, but /diagnose only accepts POST, so FastAPI responds with 405 Method Not Allowed.",
        null,
        [
          "\\bget\\b.{0,35}\\b(?:instead of|rather than|not)\\b.{0,20}\\bpost\\b",
          "\\b(?:sends?|sending|makes?|making|uses?|using)\\b.{0,20}\\bget\\b.{0,90}\\b(?:expects?|accepts?|requires?|only supports?)\\b.{0,20}\\bpost\\b"
        ]
      ],
      [
        "A server expects a problem report in a field named \"description\". The app sends it in a field named \"desc\" instead. Which field name should the app use so the server can read the report?",
        [
          "description"
        ],
        "The field name must match what the server expects. Sending \"desc\" does not provide the required \"description\" field.",
        null
      ],
      [
        "An app wants an AI to translate “Hello” into Hindi. What should it send in one request: just “Hello”, or “Hello” together with the instruction “Translate into Hindi”?",
        [
          "both",
          "together",
          "sentence and the instruction",
          "instruction and the sentence",
          "hello and translate into hindi"
        ],
        "The AI needs both what to do and the text to do it to in the same request.",
        null
      ]
    ]
  },
  {
    "title": "Why can’t the key live in the browser?",
    "follow": "If a visitor can inspect their browser, what stops them from using the key outside your app?",
    "cases": [
      [
        "A developer minifies and obfuscates their React bundle so the key looks like random characters spread across the file. A visitor opens the Network tab and sends one chat message. In which part of the request can they read the key in plain text?",
        [
          "authorization",
          "header",
          "headers"
        ],
        "The key has to be sent in usable form in the request’s Authorization header, so it shows up in plain text in the Network tab whatever the bundle looks like.",
        null
      ],
      [
        "A developer puts the OpenAI key inside their webpage’s JavaScript. A stranger copies it and uses it in their own script to make 1,000 AI calls. Whose account is billed for those 1,000 calls?",
        [
          "developer",
          "developers",
          "app owner",
          "mine"
        ],
        "The key isn’t tied to the app. The AI provider bills the key’s owner for every call made with it, from anywhere. That’s why the key must stay on the server.",
        null
      ],
      [
        "The site runs on HTTPS, and the developer says “the key is encrypted in transit, so it’s safe in the frontend.” A visitor opens DevTools on their own laptop. In which DevTools tab do they find the key in plain text?",
        [
          "network",
          "sources"
        ],
        "HTTPS protects data between the browser and the server from other people on the network. The visitor’s own browser decrypts everything, so they can see it.",
        null
      ],
      [
        "A key was in the frontend for a week. The developer removes it from the code and redeploys. Two days later, the provider dashboard still shows usage the app didn’t make. Why, and what should they have done?",
        [
          "revoke",
          "rotate",
          "regenerate",
          "new key"
        ],
        "Someone copied the key while it was exposed, and it’s still valid. The new key should live only on the backend.",
        null
      ],
      [
        "A developer moves the key to their backend. The browser now sends POST /chat with {\"message\": \"...\"}, and the backend calls the LLM. A visitor opens the Network tab. On which machine is the key added to the LLM request?",
        [
          "server",
          "backend"
        ],
        "They see the request to /chat with their own message and the reply. The key is added on the server and never goes to the browser.",
        null
      ]
    ]
  },
  {
    "title": "Why does the app forget without storage?",
    "follow": "What survives a refresh or a server restart? Where do you write data and read it back?",
    "cases": [
      [
        "A React app keeps a counter in useState. A user clicks \"+1\" seven times, then refreshes the page. What does the counter show, and why?",
        [
          "0",
          "zero"
        ],
        "Component state lives only in the page’s memory, and a refresh wipes it. It would need to be saved to storage and loaded on startup.",
        null
      ],
      [
        "An app saves 10 attempts in temporary memory. The server restarts. How many attempts remain?",
        [
          "0",
          "zero",
          "none"
        ],
        "Temporary memory is cleared when the server restarts. Save attempts in a database to keep them.",
        null
      ],
      [
        "An app runs on two server instances behind a load balancer and stores each learner’s progress in RAM. A learner completes 3 steps, and all those requests go to instance A. Their next request goes to instance B. How many completed steps does instance B find for them?",
        [
          "0",
          "zero"
        ],
        "Each instance has its own RAM, so B never saw the 3 steps. Shared progress has to go in a database that both instances read from.",
        null
      ],
      [
        "An app sends only the latest chat message to the AI. Can the AI see the earlier messages?",
        [
          "no",
          "cannot see",
          "can't see",
          "does not see",
          "doesn't see",
          "not sent",
          "not included"
        ],
        "The AI can only use the messages included in this request. Saving older messages does not automatically send them to the AI.",
        null
      ],
      [
        "You save three notes in your browser. Will they appear in a new Incognito window?",
        [
          "no",
          "will not",
          "won't",
          "zero",
          "0",
          "none"
        ],
        "A new Incognito session has separate browser storage, so it cannot read the notes saved in the normal browser.",
        null
      ]
    ]
  },
  {
    "title": "Why does the pointer sit on the many side?",
    "follow": "One learner has many attempts. How do you add an attempt with one row and one learner ID?",
    "cases": [
      [
        "Your app has a learners table and an attempts table. One learner makes many attempts, and each attempt belongs to one learner. Which table gets the pointer column?",
        [
          "attempts"
        ],
        "Each attempt has exactly one learner, so the attempts table holds one value: learner_id.",
        null
      ],
      [
        "Two requests each add an ID to the same old list. The second save overwrites the first. How many new IDs survive?",
        [
          "1",
          "one",
          "only the second",
          "only the last"
        ],
        "Only the ID added by the second request survives. Its save overwrites the first request’s version of the list.",
        null
      ],
      [
        "Priya’s email appears in six records. Only one is updated with her new email. How many different emails are now stored?",
        [
          "2",
          "two"
        ],
        "Five records still contain the old email, and one contains the new email: two different addresses.",
        null
      ],
      [
        "In Concept Check, the LLM names one gap per session, and a learner may submit up to 2 retries that answer that gap. Which table holds the pointer?",
        [
          "retries"
        ],
        "Each retry answers exactly one gap, so the retries table holds gap_id, while a gap can have many retries.",
        null
      ],
      [
        "Students can join many courses. Courses can have many students. Should a separate table record who joined which course?",
        [
          "yes",
          "separate table",
          "join table",
          "junction table",
          "enrollments",
          "student_courses"
        ],
        "A separate table stores one student and one course per row. This supports many students joining many courses.",
        null
      ]
    ]
  },
  {
    "title": "Why is history a row, not a cell?",
    "follow": "If you overwrite a result, how can you show what happened before?",
    "cases": [
      [
        "Concept Check stores learners.last_case_result, updated after each new case. A learner fails the first case, gets the follow-up, then passes the second case. A reviewer asks for proof of “failed before, passed after.” What can the database show, and why?",
        [
          "1",
          "one",
          "only passed",
          "only the passed",
          "only pass"
        ],
        "The fail was overwritten. With one row per attempt in attempts, both results are kept with their times.",
        null
      ],
      [
        "An app keeps only the latest delivery status. After “placed”, “shipped”, and “delivered”, which status remains?",
        [
          "delivered"
        ],
        "Each new status replaces the previous one. Only delivered remains because no status history was saved.",
        null
      ],
      [
        "A wallet app stores only accounts.balance and updates it on every payment. A user’s balance dropped from $200 to $140, and they want to know which charge caused it. How many individual charges can the app list for them?",
        [
          "0",
          "zero",
          "none"
        ],
        "Only the current balance is stored, so the individual charges are lost. A transactions table with one row per charge would show them, and the balance can be calculated from those rows.",
        null
      ],
      [
        "A shirt cost $20 when bought and costs $25 now. An invoice uses today’s price. What price does it show?",
        [
          "25",
          "twenty five"
        ],
        "The invoice reads today’s price of $25. The app would need to save the purchase price to show the original $20.",
        null
      ],
      [
        "An app keeps one latest sentence per learner. With 30 learners, how many sentences are saved?",
        [
          "30",
          "thirty"
        ],
        "There is one saved sentence for each of the 30 learners, so there are 30 sentences in total.",
        null
      ]
    ]
  },
  {
    "title": "How do you decide where a piece lives?",
    "follow": "Can a user safely see or edit it? Must it persist? Is it a fixed rule or a judgment?",
    "cases": [
      [
        "In Concept Check, each new case has a known answer. A developer sends the case and its answer to the browser, so the browser can show “Correct!” instantly. Where should the answer live, and why?",
        [
          "server",
          "backend"
        ],
        "The learner could read it in DevTools before answering. The browser sends the learner’s answer, and the server checks it.",
        null
      ],
      [
        "A developer asks the LLM, “Based on this retry, has the learner understood now? Reply PASS or FAIL,” and saves the result. Where should the pass/fail decision live, and why?",
        [
          "code",
          "deterministic",
          "not the llm",
          "not ai"
        ],
        "Code checks the new case against the pre-written answer key. Pass/fail is a fixed rule, and letting the AI decide understanding is the no-go.",
        null
      ],
      [
        "A learner is halfway through typing their explanation and hasn’t submitted it. A developer wants to save every keystroke to the database “just in case.” Where should the in-progress text live, and why?",
        [
          "browser",
          "component state",
          "localstorage"
        ],
        "It’s harmless and not needed by anyone else yet. It goes to the server only when submitted.",
        null
      ],
      [
        "Should a learner’s email be saved once in their learner record or repeated in every attempt?",
        [
          "once",
          "learner record",
          "learners record",
          "learners table",
          "learner table"
        ],
        "The email describes the learner. Store it once in the learner record and link attempts using the learner ID.",
        null
      ],
      [
        "The list of 7 ideas and the answer key are both fixed lists shipped in code. The developer sends both to the browser. Which one should not be sent?",
        [
          "answer key"
        ],
        "Learners need to see the ideas list to pick one. Seeing the answer key lets them pass without reasoning. The same kind of data goes in different places because of one question: can the user be trusted to see it?",
        null
      ]
    ]
  }
];
const $=s=>document.querySelector(s);let sessionVersion=0;let selected=2,stage=0,activeCase=0,results=[],transcript=[],records=[];const lastCases={};try{Object.assign(lastCases,JSON.parse(localStorage.getItem('concept-check-last-cases')||'{}'))}catch{}try{records=JSON.parse(localStorage.getItem('concept-check-attempts')||'[]');if(!Array.isArray(records))records=[]}catch{}const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalizeAnswer(text){return text.toLowerCase().replace(/[’‘]/g,"'").replace(/[“”]/g,'').replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim()}
function gradeAnswer(test,text){const normalized=normalizeAnswer(text);const has=term=>{const escaped=normalizeAnswer(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('\\b'+escaped+'\\b','i').test(normalized)};return (test[3]?test[3].every(group=>group.some(has)):test[1].some(has))||Boolean(test[4]?.some(pattern=>new RegExp(pattern,'i').test(normalized)))}
function message(text,user=false,highlight=false){const el=document.createElement('div');el.className='msg '+(user?'user':'');const who=document.createElement('div');who.className='who';who.textContent=user?'YOU':'LET’S UNPACK';const bubble=document.createElement('div');bubble.className='bubble';if(highlight){const a=document.createElement('span');a.textContent='A phrase to unpack: ';const mark=document.createElement('mark');mark.textContent=text;bubble.append(a,mark)}else bubble.textContent=text;el.append(who,bubble);$('#messages').append(el);$('#messages').scrollTop=$('#messages').scrollHeight;transcript.push({text,user});return bubble}
function setStep(n){document.querySelectorAll('#steps li').forEach((x,i)=>x.classList.toggle('current',i===n))}
function showPractice(){$('#workspace').hidden=false;$('#history-view').hidden=true;$('#learn').classList.add('active');$('#history').classList.remove('active');$('#breadcrumb').textContent='Concept practice'}
function listIdeas(initial=false){
 sessionVersion++;
 if(initial){$('#messages').replaceChildren();transcript=[];showPractice();}
 selected=-1;stage=-1;$('#answer').value='';$('#answer').disabled=true;$('#send').disabled=true;$('#answer').placeholder='Choose an idea above to begin…';setStep(-1);
 document.querySelectorAll('.concept').forEach(x=>x.classList.remove('selected'));
 const bubble=message(initial?'Let’s explore an idea together.\n\nChoose an idea to explain in your own words:':'What would you like to explore next?');
 const choices=document.createElement('div');choices.className='idea-choices';
 concepts.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='chip idea-choice';b.textContent=(i+1)+'. '+c.title;b.onclick=()=>start(i);choices.append(b)});
 if(initial){bubble.append(choices)}else{const arrow=document.createElement('button');arrow.type='button';arrow.className='chip reveal-ideas';arrow.textContent='→';arrow.setAttribute('aria-label','Show all concepts');arrow.setAttribute('aria-expanded','false');arrow.onclick=()=>{bubble.append(choices);arrow.setAttribute('aria-expanded','true');arrow.remove();$('#messages').scrollTop=$('#messages').scrollHeight};bubble.append(arrow)}$('#messages').scrollTop=initial?0:$('#messages').scrollHeight;
}
function start(i){sessionVersion++;selected=i;const options=concepts[i].cases.map((_,j)=>j).filter(j=>j!==lastCases[i]);activeCase=options[Math.floor(Math.random()*options.length)]??0;lastCases[i]=activeCase;try{localStorage.setItem('concept-check-last-cases',JSON.stringify(lastCases))}catch{}stage=0;results=[];transcript=[];$('#messages').replaceChildren();$('#answer').disabled=false;$('#send').disabled=false;$('#answer').value='';$('#answer').placeholder='Explain it in your own words…';setStep(0);showPractice();document.querySelectorAll('.concept').forEach((x,j)=>x.classList.toggle('selected',i===j));message('Let’s explore an idea together.\n\n'+concepts[i].title+'\n\nExplain it as if you were talking to a friend. An example can help.');}
concepts.forEach((c,i)=>{const b=document.createElement('button');b.className='concept';b.innerHTML='<b>'+String(i+1).padStart(2,'0')+'</b><span>'+escape(c.title)+'</span>';b.onclick=()=>start(i);$('#concepts').append(b)});
async function requestFollowUp(explanation,concept,version){
 stage=-2;$('#answer').disabled=true;$('#send').disabled=true;
 const loading=message('Reading your explanation…');
 try{
  const response=await fetch('/api/follow-up',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({concept,explanation})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not generate a follow-up.');
  if(version!==sessionVersion)return;
  loading.parentElement.remove();
  if(data.sentence)message(data.sentence,false,true);
  message(data.follow_up);stage=1;$('#answer').disabled=false;$('#send').disabled=false;$('#answer').placeholder='Unpack your thinking…';setStep(1);$('#answer').focus();
 }catch(error){
  if(version!==sessionVersion)return;
  loading.textContent=error.message||'Unable to reach the local server.';
  const retry=document.createElement('button');retry.type='button';retry.className='chip';retry.textContent='Retry follow-up ↗';
  retry.onclick=()=>{loading.parentElement.remove();requestFollowUp(explanation,concept,version)};loading.append(document.createElement('br'),retry);
 }
}
$('#form').onsubmit=e=>{e.preventDefault();const text=$('#answer').value.trim();if(stage<0||stage===4||!text)return;message(text,true);$('#answer').value='';const c=concepts[selected];if(stage===0){requestFollowUp(text,c.title,sessionVersion);}else if(stage===1){message('Now let’s apply that thinking to a concrete case.\n\n'+c.cases[activeCase][0]);stage=2;$('#answer').placeholder='What happens, and why?';setStep(2)}else{const test=c.cases[activeCase];const normalized=normalizeAnswer(text);const ok=gradeAnswer(test,text);results.push({case:test[0],answer:text,pass:ok,reason:test[2]});message((ok?'✓ Case matched the expected answer.':'↗ Not yet — let’s unpack this.')+'\n\n'+test[2]);{const passed=results.every(r=>r.pass);message((passed?'✓ PASS — your case answer matched.':'↗ NOT YET — there’s more to explore.')+'\n\n'+(passed?'You applied the idea in a new situation. Keep practising to make the connection stick.':'Revisit the reasoning above, then start a fresh conversation when you’re ready.'));records.unshift({concept:c.title,date:new Date().toISOString(),results,passed,transcript:[...transcript]});try{localStorage.setItem('concept-check-attempts',JSON.stringify(records))}catch{message('Browser storage is unavailable. This result will last only for this visit.')}$('#count').textContent=records.length;$('#answer').disabled=true;$('#send').disabled=true;listIdeas()}}};
$('#answer').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#form').requestSubmit()}};$('#new').onclick=()=>listIdeas(true);$('#learn').onclick=showPractice;$('#history').onclick=()=>{$('#workspace').hidden=true;$('#history-view').hidden=false;$('#history').classList.add('active');$('#learn').classList.remove('active');$('#breadcrumb').textContent='My attempts';const list=$('#history-list');list.replaceChildren();if(!records.length){list.textContent='Your first attempt is waiting. Pick a concept to begin.'}records.forEach(r=>{const el=document.createElement('article');el.className='history-card';const h=document.createElement('h3');h.textContent=r.concept;const sub=document.createElement('small');sub.textContent=new Date(r.date).toLocaleString()+' · '+(r.passed?'Pass':'Not yet');el.append(h,sub);r.results.forEach((x,i)=>{const p=document.createElement('p');p.textContent='Case '+(i+1)+' · '+(x.pass?'Matched':'Not yet')+'\nYour answer: '+x.answer+'\n'+x.reason;el.append(p)});const btn=document.createElement('button');btn.textContent='Practice again ↗';btn.onclick=()=>start(concepts.findIndex(c=>c.title===r.concept));el.append(btn);list.append(el)})};$('#count').textContent=records.length;listIdeas(true);
