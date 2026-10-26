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
function start(i){version++;selected=i;stage=0;attemptId=crypto.randomUUID();showPractice();$('#messages').replaceChildren();$('#answer').value='';inputEnabled(true,'Explain it in your own words…');setStep(0);document.querySelectorAll('.concept').forEach((el,j)=>el.classList.toggle('selected',i===j));message('Let’s explore an idea together.\n\n'+concepts[i].title+'\n\nExplain it as if you were talking to a friend. An example can help.')}
async function pending(label,operation,onSuccess,currentVersion=version){stage=-2;inputEnabled(false);const loading=message(label);try{const result=await operation();if(currentVersion!==version)return;loading.parentElement.remove();onSuccess(result)}catch(error){if(currentVersion!==version)return;loading.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.className='chip';retry.textContent='Retry ↗';retry.onclick=()=>{loading.parentElement.remove();pending(label,operation,onSuccess,currentVersion)};loading.append(document.createElement('br'),retry)}}
function stageMessage(label,text){const bubble=message('');const heading=document.createElement('strong');heading.className='stage-title';heading.textContent=label;bubble.append(heading,document.createTextNode(text));return bubble}
function showFollowUp(data){if(data.sentence)message(data.sentence,false,true);stageMessage('Follow up',data.follow_up);stage=1;inputEnabled(true,'Unpack your thinking…');setStep(1);$('#answer').focus()}
$('#form').onsubmit=e=>{
 e.preventDefault();const answer=$('#answer').value.trim();if(stage<0||!answer)return;
 const currentStage=stage,currentId=attemptId,concept=concepts[selected];message(answer,true);$('#answer').value='';
 if(currentStage===0){
  initialExplanation=answer;
  pending('Finding a question to start with…',()=>api('begin-case',{attempt_id:currentId,concept_id:concept.id,explanation:answer}),data=>{
   stageMessage('Case 1','Before we unpack your explanation, try this situation.\n\n'+data.prompt);stage=3;inputEnabled(true,'What happens, and why?');setStep(0);
  });
 }else if(currentStage===3){
  const explanation=initialExplanation;
  pending('Saving your first answer…',()=>api('before-grade',{attempt_id:currentId,answer}),()=>{
   pending('Reading your explanation…',()=>api('follow-up',{attempt_id:currentId,concept_id:concept.id,explanation}),showFollowUp);
  });
 }else if(currentStage===1){
  pending('Finding a different situation…',()=>api('next-case',{attempt_id:currentId,answer}),data=>{stageMessage('Case 2','Now try a different situation using the same idea.\n\n'+data.prompt);stage=2;inputEnabled(true,'What happens, and why?');setStep(2)});
 }else if(currentStage===2){
  pending('Checking your answer…',()=>api('grade',{attempt_id:currentId,answer}),record=>{
   const result=record.results.find(r=>r.phase==='after')||record.results[record.results.length-1];
   message((record.passed?'✓ Case 2 result: PASS — your answer matched.':'↗ Case 2 result: NOT YET — there’s more to explore.')+'\n\n'+result.reason);
   if(typeof record.before_passed==='boolean')message('Case 1 (before follow-up): '+(record.before_passed?'Pass':'Not yet')+'\nCase 2 (after follow-up): '+(record.passed?'Pass':'Not yet')+(record.improved?'\nYou moved from Not yet to Pass on a different question.':''));
   records=[record,...records.filter(r=>r.id!==record.id)];$('#count').textContent=records.length;listIdeas();
  });
 }
};
$('#answer').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#form').requestSubmit()}};
$('#new').onclick=()=>concepts.length?listIdeas(true):initialize();$('#learn').onclick=showPractice;
function renderHistory(){const list=$('#history-list');list.replaceChildren();if(!records.length){list.textContent='Your first attempt is waiting. Pick a concept to begin.';return}records.forEach(record=>{const el=document.createElement('article');el.className='history-card';const title=document.createElement('h3');title.textContent=record.concept;const sub=document.createElement('small');sub.textContent=new Date(record.date).toLocaleString()+' · '+(record.passed?'Pass':'Not yet');el.append(title,sub);const btn=document.createElement('button');btn.textContent='Practice again ↗';btn.onclick=()=>start(concepts.findIndex(c=>c.title===record.concept));el.append(btn);list.append(el)})}
$('#history').onclick=async()=>{$('#workspace').hidden=true;$('#history-view').hidden=false;$('#history').classList.add('active');$('#learn').classList.remove('active');$('#breadcrumb').textContent='My attempts';$('#history-list').textContent='Loading your saved attempts…';try{records=await api('history');$('#count').textContent=records.length;renderHistory()}catch(error){$('#history-list').textContent=error.message;const b=document.createElement('button');b.textContent='Retry';b.onclick=()=>$('#history').onclick();$('#history-list').append(b)}};
async function initialize(){showPractice();inputEnabled(false,'Connecting your learner session…');$('#messages').replaceChildren();message('Connecting to your learning space…');try{concepts=await api('concepts');records=await api('history');$('#concepts').replaceChildren();concepts.forEach((c,i)=>{const b=document.createElement('button');b.className='concept';const n=document.createElement('b');n.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.textContent=c.title;b.append(n,title);b.onclick=()=>start(i);$('#concepts').append(b)});$('#count').textContent=records.length;listIdeas(true)}catch(error){$('#messages').replaceChildren();const bubble=message(error.message);const b=document.createElement('button');b.className='chip';b.textContent='Retry connection ↗';b.onclick=initialize;bubble.append(document.createElement('br'),b)}}
initialize();
