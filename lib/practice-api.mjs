import lessons from './concept-lessons.json' with {type:'json'};
import { followUp,reviewFollowUp,reply } from './groq.mjs';
import { supabaseRequest,rpc,verifySession,databaseConfig } from './supabase.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function finalReview(record,token,env){
 const follow=record.follow_up;
 if(!follow?.answer||follow.feedback)return record;
 try{
  const lesson=lessons.find(item=>item.title===record.concept);
  const feedback=await reviewFollowUp({concept:record.concept,reference:lesson?.explanation||'',initial_explanation:record.explanation,question:follow.question,answer:follow.answer},env);
  follow.feedback=await rpc('lu_save_follow_up_feedback',{p_attempt_id:record.id,p_feedback:feedback},token,env);
 }catch(error){
  console.warn('Follow-up review unavailable',{name:error.name,status:error.status||502});
  follow.feedback_error='Follow-up feedback is temporarily unavailable. Your case results are saved; you can retry the feedback.';
 }
 return record;
}
const answerValid=s=>typeof s==='string'&&s.trim().length>0&&s.length<=5000;
export async function practiceAPI(req,res,route,env=process.env){
 try{
  if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)return reply(res,403,{error:'Origin not allowed.'})}
  if(route==='health')return reply(res,200,{provider:'Groq',configured:Boolean(env.GROQ_API_KEY),database:Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)});
  const allowed=['session','explain','begin-case','before-grade','review','follow-up','next-case','grade'].includes(route)?'POST':'GET';if(req.method!==allowed){res.setHeader('Allow',allowed);return reply(res,405,{error:'Method not allowed.'})}
  const input=req.body||{};
  if(route==='session'){
   databaseConfig(env);
   const session=input.refresh_token?await supabaseRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:input.refresh_token},env}):await supabaseRequest('/auth/v1/signup',{method:'POST',body:{data:{}},env});
   if(!session.access_token)throw Object.assign(new Error('Supabase did not create a session.'),{status:502});
   return reply(res,200,{access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at||Math.floor(Date.now()/1000)+session.expires_in});
  }
  const token=await verifySession(req,env);
  if(route==='concepts'){const concepts=await supabaseRequest('/rest/v1/concepts?select=id,title&order=id',{token,env});return reply(res,200,concepts)}
  if(route==='history'){const records=await rpc('lu_attempt_history',{},token,env);return reply(res,200,records.map(({id,concept,date,passed})=>({id,concept,date,passed})));}
  if(route==='explain'){
   if(!Number.isInteger(input.concept_id))return reply(res,400,{error:'Please choose a concept.'});
   const lesson=lessons.find(item=>item.id===input.concept_id);
   if(!lesson)return reply(res,400,{error:'Unknown concept.'});
   return reply(res,200,{title:lesson.title,explanation:lesson.explanation,example:lesson.example});
  }
  if(route==='begin-case'){
   if(!uuid.test(input.attempt_id)||!Number.isInteger(input.concept_id)||!answerValid(input.explanation))return reply(res,400,{error:'Please provide a concept and explanation.'});
   return reply(res,200,await rpc('lu_begin_case',{p_id:input.attempt_id,p_concept_id:input.concept_id,p_explanation:input.explanation},token,env));
  }
  if(route==='before-grade'){
   if(!uuid.test(input.attempt_id)||!answerValid(input.answer))return reply(res,400,{error:'Please provide an answer.'});
   return reply(res,200,await rpc('lu_submit_before',{p_attempt_id:input.attempt_id,p_answer:input.answer},token,env));
  }
  if(route==='follow-up'){
   if(!uuid.test(input.attempt_id)||!Number.isInteger(input.concept_id)||!answerValid(input.explanation))return reply(res,400,{error:'Please provide a concept and explanation.'});
   const attempts=await supabaseRequest('/rest/v1/attempts?id=eq.'+input.attempt_id+'&select=concept_id,explanation,before_case_id,before_answer,before_graded_at',{token,env});
   const attempt=attempts[0];
   if(!attempt||!attempt.before_case_id||!attempt.before_graded_at)return reply(res,409,{error:'Answer the first question before the follow-up.'});
   if(attempt.concept_id!==input.concept_id||attempt.explanation!==input.explanation)return reply(res,409,{error:'Attempt input changed. Please start a new conversation.'});
   const concepts=await supabaseRequest('/rest/v1/concepts?id=eq.'+input.concept_id+'&select=title',{token,env});if(concepts.length!==1)return reply(res,400,{error:'Unknown concept.'});
   // If the request is retried, return its saved follow-up without calling Groq again.
   const prior=await supabaseRequest('/rest/v1/gaps?attempt_id=eq.'+input.attempt_id+'&select=sentence,follow_up',{token,env});
   if(prior.length)return reply(res,200,{attempt_id:input.attempt_id,...prior[0]});
   const generated=await followUp(concepts[0].title,input.explanation,env,{first_answer:attempt.before_answer});
   const result=await rpc('lu_start_attempt',{p_id:input.attempt_id,p_concept_id:input.concept_id,p_explanation:input.explanation,p_sentence:generated.sentence,p_follow_up:generated.follow_up},token,env);
   return reply(res,200,result);
  }
  if(route==='review'){
   if(!uuid.test(input.attempt_id))return reply(res,400,{error:'Please provide an attempt.'});
   const record=await rpc('lu_attempt_review',{p_attempt_id:input.attempt_id},token,env);
   return reply(res,200,await finalReview(record,token,env));
  }
  if(route==='next-case'||route==='grade'){
   if(!uuid.test(input.attempt_id)||!answerValid(input.answer))return reply(res,400,{error:'Please provide an answer.'});
   const result=await rpc(route==='grade'?'lu_submit_answer':'lu_next_case',{p_attempt_id:input.attempt_id,p_answer:input.answer},token,env);
   return reply(res,200,route==='grade'?await finalReview(result,token,env):result);
  }
  return reply(res,404,{error:'Not found.'});
 }catch(error){return reply(res,error.status||500,{error:error.status?error.message:'Unable to complete this request. Please retry.'})}
}
