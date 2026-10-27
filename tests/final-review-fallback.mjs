import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';
import {practiceAPI} from '../lib/practice-api.mjs';
const base='http://127.0.0.1:4173';let auth;
async function call(route,body){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth.access_token}:{})},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,route+': '+JSON.stringify(data));return data}
auth=await call('session',{});
const id=randomUUID(),explanation='An API key in the browser can be copied and used by anyone. The backend keeps it outside the visitor’s control.';
await call('begin-case',{attempt_id:id,concept_id:3,explanation});await call('before-grade',{attempt_id:id,answer:'I do not know'});
await call('follow-up',{attempt_id:id,concept_id:3,explanation});const q=await call('next-case',{attempt_id:id,answer:'A visitor can inspect browser requests and use the copied key from their own script.'});
const pairs=JSON.parse(fs.readFileSync(new URL('../lib/golden-pairs.json',import.meta.url)));
const golden=pairs.flatMap(c=>c.cases).find(c=>c[0]===q.prompt);assert.ok(golden);const answer=golden[3]?golden[3].map(g=>g[0]).join(' '):golden[1][0];
const env=Object.fromEntries(fs.readFileSync(new URL('../.env',import.meta.url),'utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));
const res={writeHead(status){this.status=status},setHeader(){},end(text){this.data=JSON.parse(text)}};
await practiceAPI({method:'POST',headers:{host:'127.0.0.1:4173',authorization:'Bearer '+auth.access_token},body:{attempt_id:id,answer}},res,'grade',{...env,GROQ_API_KEY:''});
assert.equal(res.status,200);assert.equal(res.data.before_passed,false);assert.equal(res.data.passed,true);assert.ok(res.data.results.every(r=>r.reason));assert.ok(res.data.follow_up.feedback_error);assert.equal(res.data.follow_up.feedback,null);
console.log('PASS: A Groq failure preserves both case results and explanations.');
const reviewed=await call('review',{attempt_id:id});assert.equal(reviewed.before_passed,false);assert.equal(reviewed.passed,true);assert.ok(reviewed.follow_up.feedback);assert.ok(!reviewed.follow_up.feedback_error);assert.deepEqual(reviewed.results,res.data.results);
console.log('PASS: Retrying only the follow-up feedback recovers without regrading.');
const again=await call('review',{attempt_id:id});assert.deepEqual(again,reviewed);
console.log('PASS: Saved feedback is reused on subsequent reviews.');
