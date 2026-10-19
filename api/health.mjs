import { reply } from '../lib/groq.mjs';
export default function handler(req,res){return reply(res,200,{provider:'Groq',configured:Boolean(process.env.GROQ_API_KEY),model:process.env.GROQ_MODEL||'openai/gpt-oss-120b'})}
