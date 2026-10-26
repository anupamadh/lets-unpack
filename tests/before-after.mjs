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
const id=randomUUID(),explanation='A backend holds shared data outside the browser. It makes the app secure.';
const input={attempt_id:id,concept_id:1,explanation};
assert.equal((await request('follow-up',input)).status,409);pass('Follow-up cannot come before the first question');
const before=await call('begin-case',input);assert.ok(before.prompt);assert.deepEqual(Object.keys(before).sort(),['attempt_id','case_id','prompt']);
assert.deepEqual(await call('begin-case',input),before);pass('First golden-pair question is stable on retry and contains no answer key');
assert.equal((await request('follow-up',input)).status,409);
assert.notEqual((await request('next-case',{attempt_id:id,answer:'skip'})).status,200);pass('Cannot skip the baseline answer');
const beforeAnswer='I do not know yet';
const baseline=await call('before-grade',{attempt_id:id,answer:beforeAnswer});assert.equal(baseline.passed,false);assert.deepEqual(Object.keys(baseline).sort(),['attempt_id','passed']);
assert.deepEqual(await call('before-grade',{attempt_id:id,answer:'10'}),baseline);pass('Baseline Not yet is saved once without revealing the answer');
const gap=await call('follow-up',input);assert.ok(gap.follow_up.endsWith('?'));if(gap.sentence)assert.ok(explanation.includes(gap.sentence));assert.deepEqual(await call('follow-up',input),gap);pass('One live Groq follow-up is saved after the baseline');
const followAnswer='The server stores shared data and validates user input outside the browser, where users cannot alter those checks.';
const after=await call('next-case',{attempt_id:id,answer:followAnswer});assert.notEqual(after.case_id,before.case_id);assert.notEqual(after.prompt,before.prompt);assert.deepEqual(await call('next-case',{attempt_id:id,answer:followAnswer}),after);pass('After question is different and stable on retry');
const golden=pairs.flatMap(p=>p.cases).find(c=>c[0]===after.prompt);assert.ok(golden);
const answer=golden[3]?golden[3].map(g=>g[0]).join(' '):golden[1][0];
const record=await call('grade',{attempt_id:id,answer});assert.equal(record.before_passed,false);assert.equal(record.passed,true);assert.equal(record.improved,true);assert.equal(record.results.length,2);assert.equal(record.results[0].answer,beforeAnswer);assert.equal(record.results[1].answer,answer);assert.deepEqual(record.results.map(r=>r.phase),['before','after']);
assert.deepEqual(await call('grade',{attempt_id:id,answer:'overwrite'}),record);pass('Both results persist and Not yet → Pass is reported accurately');
const history=await call('history');const saved=history.find(x=>x.id===id);assert.ok(saved);assert.deepEqual(Object.keys(saved).sort(),['concept','date','id','passed']);pass('History still hides answers and explanations');
const other=await call('session',{},null);assert.ok(!(await call('history',undefined,other)).find(x=>x.id===id));assert.notEqual((await request('before-grade',{attempt_id:id,answer:'10'},other)).status,200);pass('Other learners cannot see or change this result');
const report=['# Before and after verification','',`App: ${base}`,`Attempt: ${id}`,'','## Explanation',explanation,'','## Before question',before.prompt,`Answer: ${beforeAnswer}`,'Result: Not yet','','## Follow-up',gap.follow_up,`Answer: ${followAnswer}`,'','## After question',after.prompt,`Answer: ${answer}`,'Result: Pass','','## Checks',...checks.map(x=>'- '+x)].join('\n');
fs.writeFileSync(new URL('../../before-after-verification.md',import.meta.url),report);
console.log('All before/after checks passed. Attempt: '+id);
