import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const pairs=JSON.parse(fs.readFileSync(new URL('../lib/golden-pairs.json',import.meta.url)));
let auth;const checks=[];
async function request(route,body,session=auth){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{...(session?{Authorization:'Bearer '+session.access_token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
async function call(route,body,session=auth){const r=await request(route,body,session);assert.equal(r.status,200,route+': '+JSON.stringify(r.data));return r.data}
function pass(label){checks.push(label);console.log('PASS: '+label)}
auth=await call('session',{},null);
const id=randomUUID(),input={attempt_id:id,concept_id:1,explanation:'A backend stores shared data outside the browser.'};
const before=await call('begin-case',input);
const golden=pairs.flatMap(p=>p.cases).find(c=>c[0]===before.prompt);
const answer=golden[3]?golden[3].map(g=>g[0]).join(' '):golden[1][0];
const result=await call('before-grade',{attempt_id:id,answer});
assert.equal(result.completed,true);assert.equal(result.record.completed_after_first,true);assert.equal(result.record.passed,true);assert.equal(result.record.results.length,1);assert.equal(result.record.results[0].phase,'before');assert.ok(result.record.results[0].reason);assert.equal(result.record.follow_up,null);
assert.deepEqual(await call('before-grade',{attempt_id:id,answer:'changed'}),result);
assert.equal((await request('follow-up',input)).status,409);
assert.notEqual((await request('next-case',{attempt_id:id,answer:'skip'})).status,200);
assert.deepEqual(await call('review',{attempt_id:id}),result.record);
const history=await call('history');assert.equal(history.find(r=>r.id===id).passed,true);assert.equal(history.find(r=>r.id===id).gap_closed,false);assert.equal(history.find(r=>r.id===id).gap_status,'not_needed');
const other=await call('session',{},null);assert.notEqual((await request('review',{attempt_id:id},other)).status,200);
console.log('PASS: Case 1 pass completes once, returns one explained result, saves history, blocks follow-up/Case 2, and preserves learner isolation.');
