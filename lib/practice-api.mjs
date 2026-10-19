import { followUp,reply } from './groq.mjs';
import { supabaseRequest,rpc,verifySession,databaseConfig } from './supabase.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const answerValid=s=>typeof s==='string'&&s.trim().length>0&&s.length<=5000;
export async function practiceAPI(req,res,route,env=process.env){
 try{
  if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)return reply(res,403,{error:'Origin not allowed.'})}
  if(route==='health')return reply(res,200,{provider:'Groq',configured:Boolean(env.GROQ_API_KEY),database:Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)});
  const allowed=['session','follow-up','next-case','grade'].includes(route)?'POST':'GET';if(req.method!==allowed){res.setHeader('Allow',allowed);return reply(res,405,{error:'Method not allowed.'})}
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
  if(route==='follow-up'){
   if(!uuid.test(input.attempt_id)||!Number.isInteger(input.concept_id)||!answerValid(input.explanation))return reply(res,400,{error:'Please provide a concept and explanation.'});
   const concepts=await supabaseRequest('/rest/v1/concepts?id=eq.'+input.concept_id+'&select=title',{token,env});if(concepts.length!==1)return reply(res,400,{error:'Unknown concept.'});
   // If the request is retried, return its saved follow-up without calling Groq again.
   const prior=await supabaseRequest('/rest/v1/gaps?attempt_id=eq.'+input.attempt_id+'&select=sentence,follow_up',{token,env});
   if(prior.length)return reply(res,200,{attempt_id:input.attempt_id,...prior[0]});
   const generated=await followUp(concepts[0].title,input.explanation,env);
   const result=await rpc('lu_start_attempt',{p_id:input.attempt_id,p_concept_id:input.concept_id,p_explanation:input.explanation,p_sentence:generated.sentence,p_follow_up:generated.follow_up},token,env);
   return reply(res,200,result);
  }
  if(route==='next-case'||route==='grade'){
   if(!uuid.test(input.attempt_id)||!answerValid(input.answer))return reply(res,400,{error:'Please provide an answer.'});
   return reply(res,200,await rpc(route==='grade'?'lu_submit_answer':'lu_next_case',{p_attempt_id:input.attempt_id,p_answer:input.answer},token,env));
  }
  return reply(res,404,{error:'Not found.'});
 }catch(error){return reply(res,error.status||500,{error:error.status?error.message:'Unable to complete this request. Please retry.'})}
}
