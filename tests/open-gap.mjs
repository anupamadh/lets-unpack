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
const input={attempt_id:randomUUID(),concept_id:1,explanation:'A backend stores shared data. It makes the app secure.'};
await call('begin-case',input);await call('before-grade',{attempt_id:input.attempt_id,answer:'I do not know'});
await call('follow-up',input);await call('next-case',{attempt_id:input.attempt_id,answer:'I still do not know how shared storage works.'});
const record=await call('grade',{attempt_id:input.attempt_id,answer:'I do not know'});
assert.equal(record.gap_closed,false);assert.equal(record.gap_status,'open');
const saved=(await call('history')).find(r=>r.id===input.attempt_id);assert.equal(saved.gap_closed,false);assert.equal(saved.gap_status,'open');assert.ok(!('results' in saved));assert.ok(!('explanation' in saved));
console.log('PASS: Failed Case 2 persists an open gap, and history hides answers.');
