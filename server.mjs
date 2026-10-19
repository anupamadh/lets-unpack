import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {practiceAPI} from './lib/practice-api.mjs';
import {reply} from './lib/groq.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
function config(){const values={};try{for(const line of fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)\s*=\s*(.*)$/);if(m)values[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2')}}catch{}return {...values,...process.env}}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)return reply(res,413,{error:'Request too large.'})}try{req.body=raw?JSON.parse(raw):{}}catch{return reply(res,400,{error:'Invalid JSON.'})}return await practiceAPI(req,res,url.pathname.slice(5),config())}catch{return reply(res,500,{error:'Request failed.'})}}
 if(!['GET','HEAD'].includes(req.method))return reply(res,405,{error:'Method not allowed.'});
 let filename;try{filename=path.resolve(root,'dist','.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname))}catch{return reply(res,400,{error:'Invalid URL.'})}
 if(!filename.startsWith(path.join(root,'dist')+path.sep))return reply(res,404,{error:'Not found.'});
 try{const body=fs.readFileSync(filename);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body)}catch{reply(res,404,{error:'Not found.'})}
});
server.listen(4173,'127.0.0.1',()=>console.log('Let’s Unpack: http://127.0.0.1:4173 (Groq + Supabase)'));
