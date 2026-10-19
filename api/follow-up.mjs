import { followUp, reply } from '../lib/groq.mjs';
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'Method not allowed.'})}
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return reply(res,403,{error:'Origin not allowed.'})}catch{return reply(res,403,{error:'Origin not allowed.'})}}
 try{
  const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!input||typeof input.concept!=='string'||input.concept.length>300||typeof input.explanation!=='string'||!input.explanation.trim()||input.explanation.length>5000)return reply(res,400,{error:'Please provide a concept and explanation.'});
  return reply(res,200,await followUp(input.concept,input.explanation));
 }catch(error){return reply(res,error.status||502,{error:error.status?error.message:'Could not generate a follow-up. Please retry.'})}
}
