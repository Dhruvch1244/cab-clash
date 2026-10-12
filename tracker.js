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
  function recordResult(seats,score,winner,rounds){
    const o=outbox();
    o.results.push({id:uid(),at:Date.now(),rounds,winner,
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
  window.CC={CLASSES,TEAMS,roster,addPlayer,recordResult,setPresence,sync,
    onStatus(f){listeners.push(f);emit()}};
})();
