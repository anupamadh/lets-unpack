import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const expected=JSON.parse(fs.readFileSync(new URL('../lib/concept-lessons.json',import.meta.url)));
const sessionResponse=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
assert.equal(sessionResponse.status,200);const session=await sessionResponse.json();
for(const lesson of expected){const r=await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({concept_id:lesson.id})});assert.equal(r.status,200);const data=await r.json();assert.deepEqual(data,{title:lesson.title,explanation:lesson.explanation,example:lesson.example});assert.ok(data.explanation.length>100);assert.ok(data.example);assert.deepEqual(Object.keys(data).sort(),['example','explanation','title']);}
console.log('PASS: All seven concepts return their document-based explanation and example without case keys.');
const unauthorised=await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"concept_id":1}'});assert.equal(unauthorised.status,401);
const invalid=await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:'{"concept_id":999}'});assert.equal(invalid.status,400);
const wrongMethod=await fetch(base+'/api/explain');assert.equal(wrongMethod.status,405);
console.log('PASS: Unknown concepts, unauthenticated requests and incorrect methods are rejected.');
const cfg=Object.fromEntries(fs.readFileSync(new URL('../.env',import.meta.url),'utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));
const attempts=await fetch(cfg.SUPABASE_URL+'/rest/v1/attempts?select=id',{headers:{apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token}});assert.equal(attempts.status,200);assert.deepEqual(await attempts.json(),[]);
console.log('PASS: Asking for explanations creates no graded or ungraded practice attempts.');
