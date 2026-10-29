const $=s=>document.querySelector(s);
let concepts=[],records=[],session=null,sessionPromise=null,version=0,selected=-1,stage=-1,attemptId=null,initialExplanation='';
try{session=JSON.parse(localStorage.getItem('lets-unpack-session')||'null')}catch{}
async function learnerSession(){
 if(session?.access_token&&session.expires_at>Date.now()/1000+60)return session;
 if(sessionPromise)return sessionPromise;
 sessionPromise=(async()=>{const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(session?.refresh_token?{refresh_token:session.refresh_token}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to connect learner session.');session=data;localStorage.setItem('lets-unpack-session',JSON.stringify(data));return data})().finally(()=>{sessionPromise=null});return sessionPromise;
}
async function api(route,body){const auth=await learnerSession();const response=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+auth.access_token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok){if(response.status===401&&session)session.expires_at=0;throw Error(data.error||'Request failed.')}return data}
function message(text,user=false,highlight=false){const el=document.createElement('div');el.className='msg '+(user?'user':'');const who=document.createElement('div');who.className='who';who.textContent=user?'YOU':'LET’S UNPACK';const bubble=document.createElement('div');bubble.className='bubble';if(highlight){const label=document.createElement('span');label.textContent='A phrase to unpack: ';const mark=document.createElement('mark');mark.textContent=text;bubble.append(label,mark)}else bubble.textContent=text;el.append(who,bubble);$('#messages').append(el);$('#messages').scrollTop=$('#messages').scrollHeight;return bubble}
function setStep(n){document.querySelectorAll('#steps li').forEach((el,i)=>el.classList.toggle('current',i===n))}
function inputEnabled(enabled,placeholder){$('#answer').disabled=!enabled;$('#send').disabled=!enabled;if(placeholder)$('#answer').placeholder=placeholder}
function showPractice(){$('#workspace').hidden=false;$('#history-view').hidden=true;$('#learn').classList.add('active');$('#history').classList.remove('active');$('#breadcrumb').textContent='Concept practice'}
function listIdeas(initial=false){version++;stage=-1;selected=-1;attemptId=null;$('#answer').value='';inputEnabled(false,'Choose an idea above to begin…');setStep(-1);document.querySelectorAll('.concept').forEach(el=>el.classList.remove('selected'));if(initial){showPractice();$('#messages').replaceChildren()}const bubble=message(initial?'Let’s explore an idea together.\n\nChoose an idea to explain in your own words:':'What would you like to explore next?');const choices=document.createElement('div');choices.className='idea-choices';concepts.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='chip idea-choice';b.textContent=(i+1)+'. '+c.title;b.onclick=()=>start(i);choices.append(b)});if(initial){bubble.append(choices);$('#messages').scrollTop=0}else{const b=document.createElement('button');b.type='button';b.className='chip reveal-ideas';b.textContent='→';b.setAttribute('aria-label','Show all concepts');b.setAttribute('aria-expanded','false');b.onclick=()=>{bubble.append(choices);b.remove();$('#messages').scrollTop=$('#messages').scrollHeight};bubble.append(b)}}
function start(i){version++;selected=i;stage=0;attemptId=crypto.randomUUID();showPractice();$('#messages').replaceChildren();$('#answer').value='';inputEnabled(true,'Explain it in your own words…');setStep(0);document.querySelectorAll('.concept').forEach((el,j)=>el.classList.toggle('selected',i===j));message('Let’s explore an idea together.\n\n'+concepts[i].title+'\n\nExplain it as if you were talking to a friend if you understand the idea. An example can help.\nOtherwise tell me and I’ll explain.');const help=document.createElement('button');help.type='button';help.className='chip';help.textContent='I don’t understand — explain it';const startedVersion=version;help.onclick=()=>{if(stage!==0||version!==startedVersion)return;help.disabled=true;message('I don’t understand the idea.',true);explainIdea()};$('#messages').lastElementChild.querySelector('.bubble').append(document.createElement('br'),help)}
async function pending(label,operation,onSuccess,currentVersion=version){stage=-2;inputEnabled(false);const loading=message(label);try{const result=await operation();if(currentVersion!==version)return;loading.parentElement.remove();onSuccess(result)}catch(error){if(currentVersion!==version)return;loading.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.className='chip';retry.textContent='Retry ↗';retry.onclick=()=>{loading.parentElement.remove();pending(label,operation,onSuccess,currentVersion)};loading.append(document.createElement('br'),retry)}}
function stageMessage(label,text){const bubble=message('');const heading=document.createElement('strong');heading.className='stage-title';heading.textContent=label;bubble.append(heading,document.createTextNode(text));return bubble}
function needsExplanation(text){const s=text.toLowerCase().replace(/[’‘]/g,"'").trim();return /^(?:(?:i\s+)?(?:don't|dont|do not|cannot|can't|cant)\s+(?:really\s+)?(?:understand|know|get|follow)\b|(?:i(?:'m| am)\s+)?(?:not sure|confused|unsure)\b|(?:i have\s+)?no idea\b|idk\b|explain\b|please\s+(?:explain|help)\b|(?:can|could|would)\s+(?:you|u)\s+explain\b|what does (?:it|this|that) mean\b|help(?: me)?[.!?]*$)/i.test(s)}
function explainIdea(){const concept=concepts[selected];pending('Let’s unpack the idea…',()=>api('explain',{concept_id:concept.id}),lesson=>{stageMessage('Let’s understand the idea',lesson.explanation+'\n\nFor example: '+lesson.example);message('When you’re ready, explain the idea in your own words. Then we’ll try Case 1.');stage=0;inputEnabled(true,'Tell me what the idea means in your own words…');setStep(0);$('#answer').focus()})}
function showFollowUp(data){if(data.sentence)message(data.sentence,false,true);stageMessage('Follow up',data.follow_up);stage=1;inputEnabled(true,'Unpack your thinking…');setStep(1);$('#answer').focus()}
function caseFeedback(result,label){stageMessage(label+' — '+(result.pass?'Pass':'Not yet'),'Question: '+result.case+'\n\nYour answer: '+result.answer+'\n\n'+(result.pass?'Why it passed: Your answer matched the expected outcome. ':'Why it was marked Not yet: Your answer did not match the expected outcome. ')+result.reason)}
function followFeedback(bubble,record){
 const follow=record.follow_up;const heading=document.createElement('strong');heading.className='stage-title';heading.textContent='Follow up — feedback';
 bubble.replaceChildren(heading,document.createTextNode('Question: '+follow.question+'\n\nYour answer: '+follow.answer+'\n\n'+(follow.feedback||follow.feedback_error||'No feedback is available.')));
 if(follow.feedback_error){const retry=document.createElement('button');retry.type='button';retry.className='chip';retry.textContent='Retry follow-up feedback';retry.onclick=async()=>{retry.disabled=true;retry.textContent='Loading feedback…';try{const updated=await api('review',{attempt_id:record.id});if(bubble.isConnected)followFeedback(bubble,updated)}catch(error){if(!bubble.isConnected)return;retry.disabled=false;retry.textContent='Retry follow-up feedback';}};bubble.append(document.createElement('br'),retry)}
}
function showFinalReview(record){
 const before=record.results.find(r=>r.phase==='before'),after=record.results.find(r=>r.phase==='after');
 if(record.completed_after_first){stageMessage('Your results','Case 1: Pass\nYou applied the idea successfully. No follow-up is needed.');caseFeedback(before,'Case 1');return;}
 if(typeof record.before_passed==='boolean')stageMessage('Your results','Case 1: '+(record.before_passed?'Pass':'Not yet')+'\nCase 2: '+(record.passed?'Pass':'Not yet')+(record.improved?'\nYou moved from Not yet to Pass on a different question.':''));
 if(before)caseFeedback(before,'Case 1');
 if(record.follow_up?.answer)followFeedback(message(''),record);
 if(after)caseFeedback(after,'Case 2');
}
function finishSession(record){showFinalReview(record);records=[record,...records.filter(r=>r.id!==record.id)];$('#count').textContent=records.length;listIdeas()}
$('#form').onsubmit=e=>{
 e.preventDefault();const answer=$('#answer').value.trim();if(stage<0||!answer)return;
 const currentStage=stage,currentId=attemptId,concept=concepts[selected];message(answer,true);$('#answer').value='';
 if(currentStage===0){
  if(needsExplanation(answer)){explainIdea();return}
  initialExplanation=answer;
  pending('Finding a question to start with…',()=>api('begin-case',{attempt_id:currentId,concept_id:concept.id,explanation:answer}),data=>{
   stageMessage('Case 1','Before we unpack your explanation, try this situation.\n\n'+data.prompt);stage=3;inputEnabled(true,'What happens, and why?');setStep(0);
  });
 }else if(currentStage===3){
  const explanation=initialExplanation;
  pending('Saving your first answer…',()=>api('before-grade',{attempt_id:currentId,answer}),data=>{
   if(data.completed){finishSession(data.record);return;}
   pending('Reading your explanation…',()=>api('follow-up',{attempt_id:currentId,concept_id:concept.id,explanation}),showFollowUp);
  });
 }else if(currentStage===1){
  pending('Finding a different situation…',()=>api('next-case',{attempt_id:currentId,answer}),data=>{stageMessage('Case 2','Now try a different situation using the same idea.\n\n'+data.prompt);stage=2;inputEnabled(true,'What happens, and why?');setStep(2)});
 }else if(currentStage===2){
  pending('Checking your answer…',()=>api('grade',{attempt_id:currentId,answer}),record=>{
   finishSession(record);
  });
 }
};
$('#answer').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#form').requestSubmit()}};
$('#new').onclick=()=>concepts.length?listIdeas(true):initialize();$('#learn').onclick=showPractice;
function renderHistory(){const list=$('#history-list');list.replaceChildren();if(!records.length){list.textContent='Your first attempt is waiting. Pick a concept to begin.';return}records.forEach(record=>{const el=document.createElement('article');el.className='history-card';const title=document.createElement('h3');title.textContent=record.concept;const sub=document.createElement('small');sub.textContent=new Date(record.date).toLocaleString()+' · '+(record.passed?'Pass':'Not yet');el.append(title,sub);const gap=document.createElement('p');gap.className='gap-status';const labels={closed:'Gap closed · Case 1 not yet → Case 2 pass',open:'Gap not closed · Keep practising',not_needed:'No gap identified · Case 1 passed',unknown:'Gap status unavailable · No first-case result saved'};gap.textContent=labels[record.gap_status]||labels.unknown;el.append(gap);const btn=document.createElement('button');btn.textContent='Practice again ↗';btn.onclick=()=>start(concepts.findIndex(c=>c.title===record.concept));el.append(btn);list.append(el)})}
$('#history').onclick=async()=>{$('#workspace').hidden=true;$('#history-view').hidden=false;$('#history').classList.add('active');$('#learn').classList.remove('active');$('#breadcrumb').textContent='My attempts';$('#history-list').textContent='Loading your saved attempts…';try{records=await api('history');$('#count').textContent=records.length;renderHistory()}catch(error){$('#history-list').textContent=error.message;const b=document.createElement('button');b.textContent='Retry';b.onclick=()=>$('#history').onclick();$('#history-list').append(b)}};
async function initialize(){showPractice();inputEnabled(false,'Connecting your learner session…');$('#messages').replaceChildren();message('Connecting to your learning space…');try{concepts=await api('concepts');records=await api('history');$('#concepts').replaceChildren();concepts.forEach((c,i)=>{const b=document.createElement('button');b.className='concept';const n=document.createElement('b');n.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.textContent=c.title;b.append(n,title);b.onclick=()=>start(i);$('#concepts').append(b)});$('#count').textContent=records.length;listIdeas(true)}catch(error){$('#messages').replaceChildren();const bubble=message(error.message);const b=document.createElement('button');b.className='chip';b.textContent='Retry connection ↗';b.onclick=initialize;bubble.append(document.createElement('br'),b)}}
initialize();
