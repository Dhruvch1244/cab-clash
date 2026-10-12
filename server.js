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
const TOUR_FILE=path.join(DATA,'tournament.json');
let tour=null;             // see startTournament()
try{tour=JSON.parse(fs.readFileSync(TOUR_FILE,'utf8'))}catch(e){}
// Registration: once closed (now, or at closesAt), only students already joined can play.
const REG_FILE=path.join(DATA,'registration.json');
let reg={open:true,closesAt:null};
try{reg={...reg,...JSON.parse(fs.readFileSync(REG_FILE,'utf8'))}}catch(e){}
const regOpen=(now=Date.now())=>reg.open&&!(reg.closesAt&&now>=reg.closesAt);
function setReg(r){reg=r;fs.writeFileSync(REG_FILE,JSON.stringify(reg))}
const publicReg=()=>({open:regOpen(),closesAt:reg.open?reg.closesAt:null});

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
  if(!old&&!regOpen(now))return null;
  if(old&&!regOpen(now))p={...p,team:old.team};
  if(old&&old.name===p.name&&old.team===p.team&&now-old.lastSeen<60000)return old;
  const rec={...p,joinedAt:old?old.joinedAt:now,lastSeen:now};
  players.set(p.key,rec);savePlayers();return rec;
}
function result(r,device,now){
  if(!r||typeof r!=='object'||!/^[\w-]{8,64}$/.test(String(r.id))||resultIds.has(r.id))return null;
  if(!Array.isArray(r.players)||r.players.length!==2)return null;
  const ps=r.players.map(p=>{const q=person(p);if(!q)return null;const score=Math.trunc(+p.score);return score>=0&&score<100?{...q,score}:null});
  if(ps.includes(null)||ps[0].key===ps[1].key)return null;
  if(!regOpen(now)&&ps.some(p=>!players.has(p.key)))return null;
  const winner=+r.winner;if(winner!==0&&winner!==1)return null;
  const at=Math.trunc(+r.at);
  const match=typeof r.match==='string'&&r.match.length<64?r.match:undefined;
  return {id:String(r.id),match,at:at>0&&at<=now+86400000?at:now,receivedAt:now,device,
    rounds:Math.max(0,Math.min(999,Math.trunc(+r.rounds)||0)),winner,players:ps};
}

/* ---------- Tournament: random knockout inside each SE class, then the SE champions play a final ---------- */
function saveTour(){fs.writeFileSync(TOUR_FILE,JSON.stringify(tour))}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
function makeRound(stage,keys,n){
  keys=shuffle(keys.slice());const ms=[];
  for(let i=0;i<keys.length;i+=2){
    const a=keys[i],b=keys[i+1]||null;
    ms.push({id:`${stage}-r${n}-m${i/2+1}`,stage,round:n,a,b,winner:b?null:a,score:null});
  }
  return ms;
}
function newBracket(stage,keys){
  const br={stage,players:keys.slice(),rounds:[],champion:keys.length===1?keys[0]:null};
  if(keys.length>1)br.rounds.push(makeRound(stage,keys,1));
  return br;
}
function advanceBracket(br){
  while(!br.champion&&br.rounds.length){
    const last=br.rounds[br.rounds.length-1];
    if(last.some(m=>!m.winner))return;
    const winners=last.map(m=>m.winner);
    if(winners.length===1){br.champion=winners[0];return}
    br.rounds.push(makeRound(br.stage,winners,br.rounds.length+1));
  }
}
function advanceTour(){
  if(!tour)return;
  tour.classes.forEach(advanceBracket);
  if(!tour.final&&tour.classes.every(b=>b.champion)){
    const champs=tour.classes.map(b=>b.champion);
    tour.final=newBracket('final',champs);
  }
  if(tour.final){advanceBracket(tour.final);if(tour.final.champion&&!tour.champion){tour.champion=tour.final.champion;tour.endedAt=Date.now()}}
}
function startTournament(){
  const byCls=CLASSES.map(c=>[...players.values()].filter(p=>p.cls===c).map(p=>p.key)).map((keys,i)=>({cls:CLASSES[i],keys}));
  const used=byCls.filter(x=>x.keys.length);
  if(!used.length)return false;
  tour={id:crypto.randomUUID(),startedAt:Date.now(),classes:used.map(x=>newBracket(x.cls,x.keys)),final:null,champion:null};
  advanceTour();saveTour();return true;
}
function findMatch(id){
  if(!tour)return null;
  for(const br of [...tour.classes,tour.final].filter(Boolean))for(const r of br.rounds)for(const m of r)if(m.id===id)return m;
  return null;
}
function decide(m,winnerKey,score){
  if(!m||m.winner||!m.b||(winnerKey!==m.a&&winnerKey!==m.b))return false;
  m.winner=winnerKey;m.score=score||null;advanceTour();saveTour();return true;
}
function publicTour(){
  if(!tour)return null;
  const ps={};const add=k=>{const p=players.get(k);if(p)ps[k]={name:p.name,cls:p.cls,team:p.team}};
  for(const br of [...tour.classes,tour.final].filter(Boolean))br.players.forEach(add);
  return {...tour,people:ps};
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
    const accepted=[],fresh=[],rejected=[];
    for(const r of Array.isArray(b.results)?b.results.slice(0,500):[]){
      if(r&&resultIds.has(r.id)){accepted.push(r.id);continue}
      const rec=result(r,device,now);if(!rec){if(r&&r.id)rejected.push(String(r.id).slice(0,64));continue}
      rec.players.forEach(p=>upsertPlayer({key:p.key,name:p.name,cls:p.cls,team:p.team},now));
      resultIds.add(rec.id);results.push(rec);fresh.push(JSON.stringify(rec));accepted.push(rec.id);
      if(rec.match){const m=findMatch(rec.match),keys=rec.players.map(p=>p.key);
        if(m&&keys.includes(m.a)&&keys.includes(m.b))decide(m,keys[rec.winner],[rec.players.find(p=>p.key===m.a).score,rec.players.find(p=>p.key===m.b).score])}
    }
    if(fresh.length)fs.appendFileSync(RESULTS_FILE,fresh.join('\n')+'\n');
    const pr=b.presence||{};
    const seated=(Array.isArray(pr.players)?pr.players:[]).map(person).filter(Boolean).slice(0,2);
    seated.forEach(p=>upsertPlayer(p,now));
    const refused=(Array.isArray(b.joins)?b.joins:[]).map(person).filter(p=>p&&!players.has(p.key)).map(p=>p.key);
    devices.set(device,{device,status:pr.status==='battle'?'battle':'lobby',players:seated.map(p=>p.key),
      score:Array.isArray(pr.score)?pr.score.slice(0,2).map(n=>Math.trunc(+n)||0):null,seen:now});
    // Students seated on another phone right now, so nobody can pick them for a second battle.
    const battling=[...new Set([...devices.values()].filter(d=>d.device!==device&&d.status==='battle'&&now-d.seen<ONLINE_MS).flatMap(d=>d.players))];
    return send(res,200,{ok:true,accepted,rejected,refused,registration:publicReg(),battling,tournament:publicTour(),players:[...players.values()].map(({key,name,cls,team})=>({key,name,cls,team}))});
  }
  if(pathname==='/api/players'&&req.method==='GET')
    return send(res,200,{players:[...players.values()].map(({key,name,cls,team})=>({key,name,cls,team}))});

  if(pathname.startsWith('/api/admin/')){
    if(!isAdmin(req))return send(res,401,{error:'Wrong password'});
    if(pathname==='/api/admin/state'&&req.method==='GET'){
      for(const [k,d] of devices)if(now-d.seen>ONLINE_MS*4)devices.delete(k);
      return send(res,200,{now,publicUrl:PUBLIC_URL,classes:CLASSES,teams:TEAMS,players:[...players.values()],results,tournament:publicTour(),registration:reg,
        devices:[...devices.values()].filter(d=>now-d.seen<ONLINE_MS)});
    }
    if(pathname==='/api/admin/registration'&&req.method==='POST'){
      const b=await readJson(req);
      const at=b.closesAt==null?null:Math.trunc(+b.closesAt);
      setReg({open:!!b.open,closesAt:at>0?at:null});
      return send(res,200,{ok:true,registration:reg});
    }
    if(pathname==='/api/admin/tournament'&&req.method==='POST'){
      const b=await readJson(req);
      if(b.action==='start'){if(!startTournament())return send(res,400,{error:'No students have joined yet'});setReg({open:false,closesAt:null})}
      else if(b.action==='stop'){tour=null;fs.rmSync(TOUR_FILE,{force:true})}
      else if(b.action==='winner'){if(!decide(findMatch(b.match),b.winner,null))return send(res,400,{error:'Match already decided'})}
      return send(res,200,{ok:true,tournament:publicTour()});
    }
    if(pathname==='/api/admin/reset'&&req.method==='POST'){
      const b=await readJson(req);
      results=[];resultIds.clear();fs.writeFileSync(RESULTS_FILE,'');
      if(b.what==='all'){players.clear();fs.writeFileSync(PLAYERS_FILE,'[]');tour=null;fs.rmSync(TOUR_FILE,{force:true});setReg({open:true,closesAt:null})}
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
