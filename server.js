/* Cab Clash tracker server. No dependencies: `node server.js`.
   Serves the game, receives each finished battle's result from phones (queued on the phone
   while offline), and gives the admin screen the lobby, standings and battle log.
   Env: PORT (9000), ADMIN_PASSWORD (cd2026), DATA_DIR (./data), PUBLIC_URL (link for the QR code). */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');

const PORT=+process.env.PORT||9000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'cd2026';
const PUBLIC_URL=process.env.PUBLIC_URL||'';
const ROOT=__dirname;
const DATA=process.env.DATA_DIR||path.join(ROOT,'data');
const CLASSES=['SE1','SE2','SE3','SE4','SE5'],TEAMS=['1','2','3','4'];
const ONLINE_MS=45000;

/* ---------- Storage: players.json (rewritten), results.jsonl (append-only) ---------- */
fs.mkdirSync(DATA,{recursive:true});
const PLAYERS_FILE=path.join(DATA,'players.json'),RESULTS_FILE=path.join(DATA,'results.jsonl');
const players=new Map();   // key -> {key,name,cls,team,joinedAt,lastSeen}
let results=[];            // [{id,at,receivedAt,device,rounds,winner,players:[{key,name,cls,team,score}]}]
const resultIds=new Set();
const devices=new Map();   // device -> {device,status,players:[key],seen}  (memory only)

try{for(const p of JSON.parse(fs.readFileSync(PLAYERS_FILE,'utf8')))players.set(p.key,p)}catch(e){}
try{for(const line of fs.readFileSync(RESULTS_FILE,'utf8').split('\n')){
  if(!line.trim())continue;try{const r=JSON.parse(line);if(!resultIds.has(r.id)){resultIds.add(r.id);results.push(r)}}catch(e){}
}}catch(e){}

let saveTimer=null;
function savePlayers(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    const tmp=PLAYERS_FILE+'.tmp';
    fs.writeFile(tmp,JSON.stringify([...players.values()],null,1),err=>{if(!err)fs.rename(tmp,PLAYERS_FILE,()=>{})});
  },300);
}

/* ---------- Validation ---------- */
const clean=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,40);
const keyOf=(name,cls)=>cls+':'+name.toLowerCase();
function person(p){
  if(!p||typeof p!=='object')return null;
  const name=clean(p.name),cls=String(p.cls),team=String(p.team);
  if(!name||!CLASSES.includes(cls)||!TEAMS.includes(team))return null;
  return {key:keyOf(name,cls),name,cls,team};
}
function upsertPlayer(p,now){
  const old=players.get(p.key);
  if(old&&old.name===p.name&&old.team===p.team&&now-old.lastSeen<60000)return old;
  const rec={...p,joinedAt:old?old.joinedAt:now,lastSeen:now};
  players.set(p.key,rec);savePlayers();return rec;
}
function result(r,device,now){
  if(!r||typeof r!=='object'||!/^[\w-]{8,64}$/.test(String(r.id))||resultIds.has(r.id))return null;
  if(!Array.isArray(r.players)||r.players.length!==2)return null;
  const ps=r.players.map(p=>{const q=person(p);if(!q)return null;const score=Math.trunc(+p.score);return score>=0&&score<100?{...q,score}:null});
  if(ps.includes(null)||ps[0].key===ps[1].key)return null;
  const winner=+r.winner;if(winner!==0&&winner!==1)return null;
  const at=Math.trunc(+r.at);
  return {id:String(r.id),at:at>0&&at<=now+86400000?at:now,receivedAt:now,device,
    rounds:Math.max(0,Math.min(999,Math.trunc(+r.rounds)||0)),winner,players:ps};
}

/* ---------- HTTP helpers ---------- */
function send(res,code,body,type='application/json; charset=utf-8'){
  res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(type.startsWith('application/json')?JSON.stringify(body):body);
}
function readJson(req){
  return new Promise((ok,fail)=>{
    let size=0;const chunks=[];
    req.on('data',c=>{size+=c.length;if(size>256*1024){fail(new Error('too big'));req.destroy()}else chunks.push(c)});
    req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch(e){fail(e)}});
    req.on('error',fail);
  });
}
const digest=s=>crypto.createHash('sha256').update(String(s)).digest();
const isAdmin=req=>crypto.timingSafeEqual(digest(req.headers['x-admin-password']||''),digest(ADMIN_PASSWORD));

/* ---------- Static files (allowlist only: never serves server.js or data/) ---------- */
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const PUBLIC=new Set(['index.html','duel.html','admin.html','games.js','sfx.js','tracker.js','sw.js','icon.svg','manifest.webmanifest',
  'fonts/fonts.css','fonts/rubik-mono-one.woff2','fonts/barlow-condensed-500.woff2','fonts/barlow-condensed-700.woff2','vendor/qrcode.min.js']);
function serveStatic(req,res,pathname){
  let rel=decodeURIComponent(pathname).replace(/^\/+/,'')||'index.html';
  if(rel==='admin')rel='admin.html';
  if(!PUBLIC.has(rel))return send(res,404,'Not found','text/plain; charset=utf-8');
  fs.readFile(path.join(ROOT,rel),(err,buf)=>{
    if(err)return send(res,404,'Not found','text/plain; charset=utf-8');
    const ext=path.extname(rel);
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff',
      'Cache-Control':ext==='.woff2'?'public, max-age=604800':'no-cache'});
    res.end(req.method==='HEAD'?undefined:buf);
  });
}

/* ---------- API ---------- */
async function api(req,res,pathname){
  const now=Date.now();
  // Phones call this when they can reach the server: new students, finished battles, and what they're doing now.
  if(pathname==='/api/sync'&&req.method==='POST'){
    const b=await readJson(req);
    const device=clean(b.device).slice(0,64)||'unknown';
    for(const j of Array.isArray(b.joins)?b.joins.slice(0,500):[]){const p=person(j);if(p)upsertPlayer(p,now)}
    const accepted=[],fresh=[];
    for(const r of Array.isArray(b.results)?b.results.slice(0,500):[]){
      if(r&&resultIds.has(r.id)){accepted.push(r.id);continue}
      const rec=result(r,device,now);if(!rec)continue;
      rec.players.forEach(p=>upsertPlayer({key:p.key,name:p.name,cls:p.cls,team:p.team},now));
      resultIds.add(rec.id);results.push(rec);fresh.push(JSON.stringify(rec));accepted.push(rec.id);
    }
    if(fresh.length)fs.appendFileSync(RESULTS_FILE,fresh.join('\n')+'\n');
    const pr=b.presence||{};
    const seated=(Array.isArray(pr.players)?pr.players:[]).map(person).filter(Boolean).slice(0,2);
    seated.forEach(p=>upsertPlayer(p,now));
    devices.set(device,{device,status:pr.status==='battle'?'battle':'lobby',players:seated.map(p=>p.key),
      score:Array.isArray(pr.score)?pr.score.slice(0,2).map(n=>Math.trunc(+n)||0):null,seen:now});
    return send(res,200,{ok:true,accepted,players:[...players.values()].map(({key,name,cls,team})=>({key,name,cls,team}))});
  }
  if(pathname==='/api/players'&&req.method==='GET')
    return send(res,200,{players:[...players.values()].map(({key,name,cls,team})=>({key,name,cls,team}))});

  if(pathname.startsWith('/api/admin/')){
    if(!isAdmin(req))return send(res,401,{error:'Wrong password'});
    if(pathname==='/api/admin/state'&&req.method==='GET'){
      for(const [k,d] of devices)if(now-d.seen>ONLINE_MS*4)devices.delete(k);
      return send(res,200,{now,publicUrl:PUBLIC_URL,classes:CLASSES,teams:TEAMS,players:[...players.values()],results,
        devices:[...devices.values()].filter(d=>now-d.seen<ONLINE_MS)});
    }
    if(pathname==='/api/admin/reset'&&req.method==='POST'){
      const b=await readJson(req);
      results=[];resultIds.clear();fs.writeFileSync(RESULTS_FILE,'');
      if(b.what==='all'){players.clear();fs.writeFileSync(PLAYERS_FILE,'[]')}
      return send(res,200,{ok:true});
    }
  }
  send(res,404,{error:'Not found'});
}

http.createServer(async(req,res)=>{
  const {pathname}=new URL(req.url,'http://x');
  try{
    if(pathname.startsWith('/api/'))await api(req,res,pathname);
    else if(req.method==='GET'||req.method==='HEAD')serveStatic(req,res,pathname);
    else send(res,405,'Method not allowed','text/plain; charset=utf-8');
  }catch(e){if(!res.headersSent)send(res,400,{error:'Bad request'})}
}).listen(PORT,()=>console.log(`Cab Clash on http://0.0.0.0:${PORT}  (admin: /admin)  data: ${DATA}`));
