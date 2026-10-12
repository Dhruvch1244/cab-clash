/* Cab Clash tracker client. The game never needs the network: students and finished battles are
   kept in this phone's storage and uploaded to the tracker server whenever it can be reached.
   Only the final result of each battle is sent, never the rounds themselves. */
(function(){
  const CLASSES=['SE1','SE2','SE3','SE4','SE5'],TEAMS=['1','2','3','4'];
  const LS={
    get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
    set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  };
  const clean=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,40);
  const keyOf=(name,cls)=>cls+':'+name.toLowerCase();
  const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14));
  const canSync=/^https?:$/.test(location.protocol);

  let device=LS.get('cc-device',null);
  if(!device){device=uid();LS.set('cc-device',device)}
  let presence={status:'lobby',players:[],score:null},online=false,busy=false;
  const listeners=[];

  function outbox(){return LS.get('cc-outbox',{joins:[],results:[]})}
  function roster(){return LS.get('cc-roster',[])}
  function mergeRoster(list){
    const map=new Map(roster().map(p=>[p.key,p]));
    for(const p of list)map.set(p.key,{key:p.key,name:p.name,cls:p.cls,team:p.team});
    LS.set('cc-roster',[...map.values()]);
  }
  function emit(){const o=outbox();const s={canSync,online,pending:o.results.length,joins:o.joins.length};listeners.forEach(f=>f(s))}

  function addPlayer(name,cls,team){
    name=clean(name);team=String(team);
    if(!name||!CLASSES.includes(cls)||!TEAMS.includes(team))return null;
    const p={key:keyOf(name,cls),name,cls,team};
    mergeRoster([p]);
    const o=outbox();o.joins=o.joins.filter(j=>j.key!==p.key).concat(p);LS.set('cc-outbox',o);
    sync();return p;
  }
  function recordResult(seats,score,winner,rounds,match){
    const o=outbox();
    o.results.push({id:uid(),match:match||undefined,at:Date.now(),rounds,winner,
      players:seats.map((p,i)=>({name:p.name,cls:p.cls,team:p.team,score:score[i]}))});
    LS.set('cc-outbox',o);emit();sync();
  }
  function setPresence(status,seats,score){
    presence={status,players:(seats||[]).filter(Boolean).map(({name,cls,team})=>({name,cls,team})),score:score||null};
    sync();
  }

  async function sync(){
    if(!canSync||busy)return;
    busy=true;
    const o=outbox(),sent={joins:o.joins.map(j=>j.key),results:o.results.map(r=>r.id)};
    try{
      const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
      const res=await fetch('api/sync',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,
        body:JSON.stringify({device,joins:o.joins,results:o.results,presence})});
      clearTimeout(t);
      if(!res.ok)throw new Error(res.status);
      const body=await res.json();
      // Drop only what the server confirmed; anything queued meanwhile stays.
      const now=outbox(),ok=new Set(body.accepted||[]);
      now.joins=now.joins.filter(j=>!sent.joins.includes(j.key));
      now.results=now.results.filter(r=>!ok.has(r.id));
      LS.set('cc-outbox',now);
      if(Array.isArray(body.players))mergeRoster(body.players);
      LS.set('cc-tour',body.tournament||null);
      LS.set('cc-busy',{at:Date.now(),keys:Array.isArray(body.battling)?body.battling:[]});
      online=true;
    }catch(e){online=false}
    busy=false;emit();
  }

  if(canSync){
    addEventListener('online',sync);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
    setInterval(sync,15000);
    sync();
  }
  /* Signed-in student on this phone, and where they stand in the tournament. */
  const me=()=>LS.get('cc-me',null);
  function signIn(name,cls,team){const p=addPlayer(name,cls,team);if(p)LS.set('cc-me',p);return p}
  const signOut=()=>LS.set('cc-me',null);
  const tournament=()=>LS.get('cc-tour',null);
  const brackets=t=>[...t.classes,t.final].filter(Boolean);
  function person(t,k){const p=t&&t.people[k];return p?{key:k,...p}:null}
  function findMatch(id){const t=tournament();if(!t)return null;
    for(const br of brackets(t))for(const r of br.rounds)for(const m of r)if(m.id===id)return {m,t};return null}
  // -> {state:'none'|'match'|'waiting'|'out'|'champion'|'grand'|'notin', match?, opp?, label?}
  function myStatus(){
    const t=tournament(),u=me();if(!t||!u)return {state:'none'};
    if(t.champion===u.key)return {state:'grand'};
    const mine=brackets(t).filter(b=>b.players.includes(u.key));
    if(!mine.length)return {state:'notin'};
    const br=mine[mine.length-1],label=br.stage==='final'?'Grand final':br.stage+' knockout';
    for(const r of br.rounds)for(const m of r)
      if(!m.winner&&(m.a===u.key||m.b===u.key))return {state:'match',match:m,label:`${label} · Round ${m.round}`,opp:person(t,m.a===u.key?m.b:m.a),me:person(t,u.key)};
    const lost=br.rounds.some(r=>r.some(m=>m.winner&&m.winner!==u.key&&(m.a===u.key||m.b===u.key)));
    if(lost)return {state:'out',label};
    if(br.champion===u.key)return {state:'champion',label:br.stage+' champion'};
    return {state:'waiting',label};
  }
  // Keys of students battling on another phone, from a sync in the last minute (empty when offline longer).
  const battling=()=>{const b=LS.get('cc-busy',null);return new Set(b&&b.keys&&Date.now()-b.at<60000?b.keys:[])};
  window.CC={CLASSES,TEAMS,roster,addPlayer,recordResult,setPresence,sync,me,battling,signIn,signOut,tournament,findMatch,person,myStatus,
    onStatus(f){listeners.push(f);emit()}};
})();
