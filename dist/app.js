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
        "A developer wants the browser to talk directly to the database, so they put the database username and password in the frontend code. What can any visitor now do?",
        [
          "database"
        ],
        "They copy the credentials from the frontend code. Only the backend should hold the database credentials.",
        [
          [
            "database"
          ],
          [
            "read",
            "change",
            "delete",
            "access"
          ]
        ]
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
        "A chatbot sends only the user’s latest message in each API call. The user writes “My name is Priya.” In the next message, they ask “What’s my name?” What does the model reply, and why?",
        [
          "doesn't know",
          "can't answer",
          "no idea",
          "won't know",
          "does not know",
          "cannot answer"
        ],
        "The second call didn’t include the first message, and the model keeps no memory between calls. Earlier messages have to be sent again in each call.",
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
          "405"
        ],
        "Typing a URL in the address bar sends a GET, but the endpoint only accepts POST.",
        null
      ],
      [
        "The same /diagnose endpoint expects {\"description\": \"...\"}. A client sends {\"desc\": \"API latency spiked\"}. What status code comes back, and why?",
        [
          "422"
        ],
        "The required field description is missing from the body, so validation fails before your code runs.",
        null
      ],
      [
        "A developer sends the LLM their instructions (“Find the recited sentence, ask one follow-up”) in one API call. In a second call, they send the learner’s explanation on its own. What does the model do with the second call, and why?",
        [
          "ignores the instructions"
        ],
        "It responds to the explanation as plain input, because the second call didn’t include the instructions. Instructions and input have to go in the same call.",
        [
          [
            "instructions"
          ],
          [
            "ignore",
            "ignores",
            "doesn't follow",
            "not included",
            "forgot",
            "not follow"
          ]
        ]
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
        "The developer’s account is billed because the copied key identifies their account, even when someone else uses it.",
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
        "A FastAPI server stores attempts in a global variable, attempts = []. Ten learners submit attempts in the morning. At noon, the developer redeploys a small bug fix. How many attempts does GET /attempts return afterwards, and why?",
        [
          "0",
          "zero"
        ],
        "The list was in the server’s RAM, and the redeploy started a fresh process. The attempts should have been written to a database.",
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
        "A chat app saves every message to the database. When calling the LLM, it sends only the newest message. Earlier, the user said “I’m a beginner.” Now they ask “Explain APIs at my level.” How many of the user’s messages does the model receive in this call?",
        [
          "1",
          "one"
        ],
        "Only the newest message was sent. The history was stored but not read back and included in the call, and the model keeps nothing between calls, so it never sees “I’m a beginner.” Storing it isn’t enough on its own; it has to be sent too.",
        null
      ],
      [
        "A notes app saves notes in localStorage. The user writes three notes, refreshes the page, then opens the same app in an Incognito window. How many notes do they see in the Incognito window?",
        [
          "0",
          "zero",
          "none"
        ],
        "localStorage belongs to that one browser profile, and Incognito starts with empty storage. (After a normal refresh, all 3 notes are still there.)",
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
        "A developer adds attempt_ids to learners and stores \"12,15,19\". Two of the same learner’s attempts are saved at almost the same moment. Each request reads \"12,15,19\", adds its own ID, and writes the list back. What does the cell contain afterwards, and why?",
        [
          "1",
          "one"
        ],
        "The second write overwrote the first, because both requests rewrote the same cell. With attempts.learner_id, each attempt is its own row and nothing gets overwritten.",
        null
      ],
      [
        "A developer avoids a pointer and stores each attempt as a row in one big table with learner_name, learner_email, explanation. Learner Priya has 6 attempts. She changes her email, and the app updates only her latest row. How many different emails now show for Priya, and why?",
        [
          "2",
          "two"
        ],
        "Her details were copied into all 6 rows, and only one was updated. With a separate learners table and attempts.learner_id, the email is stored once.",
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
        "A course platform has students and courses. A student takes many courses, and a course has many students. Where does the pointer go, and why?",
        [
          "third table",
          "join table",
          "junction table",
          "enrollments",
          "student_courses"
        ],
        "Both sides are “many,” so you’d get a list on both sides. A third table, enrollments(student_id, course_id), links one student to one course per row.",
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
        "A delivery app has orders.status, updated from “placed” to “shipped” to “delivered.” A customer complains that their order took 4 days to ship. How many of the three statuses can support still see for this order?",
        [
          "1",
          "one",
          "delivered"
        ],
        "The cell only holds the latest status, and the earlier statuses and their times were overwritten. A status_events(order_id, status, created_at) table would show when each change happened.",
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
        "A shop stores the price only in products.price. Orders point to the product but don’t store a price. The price of a T-shirt goes from $20 to $25. A customer who bought it last month downloads their invoice. What price does the invoice show, and why?",
        [
          "25",
          "twenty five"
        ],
        "The invoice reads the current cell, and the price at the time of purchase was never recorded. Each order row should store the price it was sold at.",
        null
      ],
      [
        "Concept Check stores learners.last_recited_sentence, overwritten each session. 30 learners have done 4 sessions each. You want to know which sentence learners recite most often across all sessions. How many sentences can you count, and why?",
        [
          "30",
          "thirty"
        ],
        "One per learner. The other 90 were overwritten. With one row per attempt, all 120 can be grouped and counted.",
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
        "A developer adds a learner_email column to the attempts table, so every attempt row repeats the email. Where should the email live, and why?",
        [
          "learners"
        ],
        "Attempts point to it with learner_id. The email describes the learner, not the attempt; repeating it means one change has to be made in many rows. (The brief also says to keep names out of the shared view, so store as little as you can.)",
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
function gradeAnswer(test,text){const normalized=normalizeAnswer(text);const has=term=>{const escaped=normalizeAnswer(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('\\b'+escaped+'\\b','i').test(normalized)};return test[3]?test[3].every(group=>group.some(has)):test[1].some(has)}
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
