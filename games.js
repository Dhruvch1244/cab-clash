/* Cab Clash question games, used by one-phone mode.
   Each gen() returns {prompt, opts, answer, cls?, note}. opts are strings or {v, l}. */
(function(){
  let R=Math.random;
  const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
  const pick=a=>a[Math.floor(R()*a.length)];
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const sample=(a,n,not)=>shuffle(a.filter(x=>!not||!not.includes(x))).slice(0,n);
  function nearby(ans,deltas,n,ok){
    const o=new Set([ans]);let guard=0;
    while(o.size<n&&guard++<200){const v=ans+pick(deltas);if(!ok||ok(v))o.add(v)}
    let k=1;while(o.size<n)o.add(ans+(k++)*7);
    return[...o];
  }
  const T=s=>`<div class="q-text">${s}</div>`;
  const BIG=s=>`<div class="q-big">${s}</div>`;

  /* ---------- word lists ---------- */
  const SPELL=[
    ['accommodate','acommodate','accomodate'],['necessary','neccessary','necesary'],['definitely','definately','definitly'],
    ['separate','seperate','separete'],['embarrass','embarass','embarras'],['occurrence','occurence','ocurrence'],
    ['rhythm','rythm','rhythym'],['restaurant','restaraunt','resturant'],['calendar','calender','calandar'],
    ['millennium','millenium','milennium'],['questionnaire','questionaire','questionnair'],['mischievous','mischievious','mischevous'],
    ['privilege','priviledge','privelege'],['guarantee','garantee','guarentee'],['recommend','reccomend','recomend'],
    ['tomorrow','tommorow','tomorow'],['beginning','begining','beggining'],['February','Febuary','Februray'],
    ['pronunciation','pronounciation','pronuncation'],['entrepreneur','entrepeneur','entreprenuer'],['bureaucracy','beaurocracy','bureacracy'],
    ['achieve','acheive','achive'],['address','adress','addres'],['argument','arguement','argumant'],
    ['apparent','apparant','aparent'],['believe','beleive','belive'],['business','buisness','bussiness'],
    ['category','catagory','categery'],['cemetery','cemetary','cematery'],['colleague','collegue','colleage'],
    ['committee','commitee','comittee'],['conscience','concience','conscence'],['conscious','concious','consious'],
    ['consensus','concensus','consensous'],['curiosity','curiousity','curiosaty'],['deceive','decieve','deceeve'],
    ['dilemma','dilema','dillema'],['disappear','dissapear','disapear'],['disappoint','dissapoint','disapoint'],
    ['ecstasy','ecstacy','extasy'],['environment','enviroment','enviornment'],['exaggerate','exagerate','exxagerate'],
    ['existence','existance','existense'],['familiar','familar','famillar'],['fascinate','facinate','fasinate'],
    ['foreign','foriegn','foregin'],['fluorescent','florescent','flourescent'],['government','goverment','govenment'],
    ['grammar','grammer','gramar'],['harass','harrass','harras'],['height','heighth','hieght'],
    ['hierarchy','heirarchy','hierachy'],['humorous','humourous','humerous'],['hygiene','hygeine','hygene'],
    ['ignorance','ignorence','ignorants'],['immediately','immediatly','imediately'],['independent','independant','indipendent'],
    ['indispensable','indispensible','indespensable'],['intelligence','inteligence','intelligance'],['interrupt','interupt','intterupt'],
    ['irresistible','irresistable','iresistible'],['knowledge','knowlege','knowledg'],['leisure','liesure','leasure'],
    ['liaison','liason','liasion'],['library','libary','liberry'],['license','lisence','licence'],
    ['lightning','lightening','litning'],['maintenance','maintainance','maintenence'],['manoeuvre','manouvre','manoevre'],
    ['medieval','medeival','mideval'],['memento','momento','mementoe'],['miniature','miniture','minature'],
    ['minuscule','miniscule','minniscule'],['misspell','mispell','misspel'],['neighbour','nieghbour','neighbor'],
    ['noticeable','noticable','noticeible'],['occasion','occassion','ocasion'],['occurred','occured','ocurred'],
    ['parliament','parliment','parlament'],['pastime','passtime','pasttime'],['perseverance','perseverence','persaverance'],
    ['personnel','personell','personel'],['playwright','playwrite','plawright'],['possession','posession','possesion'],
    ['precede','preceed','presede'],['prejudice','predjudice','prejudise'],['presence','presense','prescence'],
    ['principal','principel','princepal'],['publicly','publically','publicaly'],['receipt','reciept','receit'],
    ['receive','recieve','receeve'],['reference','referance','refrence'],['relevant','relevent','revelant'],
    ['religious','religous','relegious'],['remembrance','rememberance','rememberence'],['resistance','resistence','resistanse'],
    ['schedule','schedual','shedule'],['sergeant','sargent','sergent'],['siege','seige','sieje'],
    ['successful','succesful','successfull'],['supersede','supercede','superseed'],['surprise','suprise','surprize'],
    ['threshold','threshhold','treshold'],['tongue','tounge','tonge'],['truly','truely','trully'],
    ['twelfth','twelth','twelvth'],['tyranny','tyrany','tirany'],['until','untill','untile'],
    ['vacuum','vaccum','vacume'],['vehicle','vehical','vechicle'],['weird','wierd','weerd'],
    ['whether','wether','wheather'],['wednesday','wensday','wednsday'],['yacht','yatch','yaght'],
    ['annually','anually','annualy'],['beautiful','beautifull','beatiful'],['cappuccino','cappucino','capuccino'],
    ['chauffeur','chauffer','shauffeur'],['diarrhoea','diarhoea','diarrhea'],['handkerchief','handkercheif','hankerchief'],
    ['jewellery','jewelery','jewellry'],['mosquito','mosquitoe','mosqito'],['pharaoh','pharoah','pharoh'],
    ['silhouette','silhouete','silouette'],['spaghetti','spagetti','spaghettie'],['thorough','thourough','thurough']
  ];
  const CAPITALS=[['India','New Delhi','Mumbai'],['Japan','Tokyo','Osaka'],['Australia','Canberra','Sydney'],['Canada','Ottawa','Toronto'],
    ['Brazil','Brasilia','Rio de Janeiro'],['Turkey','Ankara','Istanbul'],['Switzerland','Bern','Zurich'],['New Zealand','Wellington','Auckland'],
    ['Nigeria','Abuja','Lagos'],['Kenya','Nairobi','Mombasa'],['Germany','Berlin','Munich'],['France','Paris','Lyon'],['Italy','Rome','Milan'],
    ['Spain','Madrid','Barcelona'],['Portugal','Lisbon','Porto'],['Russia','Moscow','St Petersburg'],['China','Beijing','Shanghai'],
    ['South Korea','Seoul','Busan'],['Thailand','Bangkok','Phuket'],['Vietnam','Hanoi','Ho Chi Minh City'],['Indonesia','Jakarta','Bali'],
    ['Malaysia','Kuala Lumpur','Penang'],['Philippines','Manila','Cebu'],['Pakistan','Islamabad','Karachi'],['Bangladesh','Dhaka','Chittagong'],
    ['Nepal','Kathmandu','Pokhara'],['Bhutan','Thimphu','Paro'],['Myanmar','Naypyidaw','Yangon'],['Afghanistan','Kabul','Kandahar'],
    ['Iran','Tehran','Isfahan'],['Iraq','Baghdad','Basra'],['Saudi Arabia','Riyadh','Jeddah'],['UAE','Abu Dhabi','Dubai'],['Qatar','Doha','Al Wakrah'],
    ['Argentina','Buenos Aires','Cordoba'],['Chile','Santiago','Valparaiso'],['Peru','Lima','Cusco'],['Colombia','Bogota','Medellin'],
    ['Mexico','Mexico City','Cancun'],['USA','Washington, D.C.','New York'],['UK','London','Manchester'],['Ireland','Dublin','Cork'],
    ['Norway','Oslo','Bergen'],['Sweden','Stockholm','Gothenburg'],['Finland','Helsinki','Turku'],['Denmark','Copenhagen','Aarhus'],
    ['Netherlands','Amsterdam','Rotterdam'],['Belgium','Brussels','Antwerp'],['Austria','Vienna','Salzburg'],['Poland','Warsaw','Krakow'],
    ['Greece','Athens','Thessaloniki'],['Hungary','Budapest','Debrecen'],['Czechia','Prague','Brno'],['Ukraine','Kyiv','Odesa'],
    ['Morocco','Rabat','Casablanca'],['Ethiopia','Addis Ababa','Gondar'],['Ghana','Accra','Kumasi'],['Egypt','Cairo','Alexandria'],
    ['South Africa','Pretoria','Cape Town'],['Scotland','Edinburgh','Glasgow']];
  const UNSCRAMBLE=['planet','garden','rocket','castle','pirate','monkey','school','bridge','ticket','driver','wallet','market','jungle','window',
    'pencil','silver','orange','potato','coffee','camera','doctor','island','mirror','rabbit','guitar','summer','winter','travel','engine','tomato',
    'cookie','dragon','pepper','button','family','flower','forest','laptop','magnet','number','office','parrot','puzzle','spider','tunnel','violin',
    'yellow','basket','candle','cinema','dinner','finger','helmet','kitten','lemons','pillow','rubber','saucer','temple','turtle','zipper'];
  const OPPOSITES=[['hot','cold'],['ancient','modern'],['generous','stingy'],['brave','cowardly'],['victory','defeat'],['rough','smooth'],
    ['tight','loose'],['arrive','depart'],['artificial','natural'],['rare','common'],['shallow','deep'],['accept','refuse'],['maximum','minimum'],
    ['ascend','descend'],['dawn','dusk'],['fragile','sturdy'],['guilty','innocent'],['horizontal','vertical'],['include','exclude'],
    ['increase','decrease'],['major','minor'],['permanent','temporary'],['private','public'],['punish','reward'],['remember','forget'],
    ['simple','complex'],['vacant','occupied'],['rigid','flexible'],['transparent','opaque'],['superior','inferior'],['optimist','pessimist'],
    ['import','export'],['praise','criticise'],['lazy','hardworking'],['noisy','quiet'],['sharp','blunt'],['ally','enemy'],['borrow','lend'],
    ['expand','shrink'],['visible','hidden'],['wide','narrow'],['scarce','plentiful'],['harmful','harmless'],['sunrise','sunset'],
    ['interior','exterior'],['juvenile','adult'],['dense','sparse'],['humble','arrogant'],['agree','disagree']];
  const BEASTS=[['Blue whale',150000],['Elephant',6000],['Hippo',1500],['Rhino',2300],['Giraffe',1200],['Polar bear',450],['Gorilla',160],
    ['Horse',500],['Cow',700],['Lion',190],['Tiger',220],['Saltwater croc',600],['Ostrich',110],['Kangaroo',60],['Chimpanzee',50],['Wolf',40],
    ['Cheetah',50],['Giant panda',100],['Camel',600],['Moose',450],['Zebra',350],['Great white shark',1100],['Dolphin',200],['Emperor penguin',30],
    ['Golden eagle',5],['House cat',4],['Labrador',30],['Goat',60],['Orca',5000],['Walrus',1200],['Komodo dragon',70],['Peacock',5],['Pig',150]];
  const CATS={
    fruit:['Apple','Mango','Banana','Grape','Cherry','Papaya','Guava','Kiwi','Peach','Lychee','Pear','Plum'],
    vegetable:['Carrot','Potato','Onion','Spinach','Cabbage','Radish','Beetroot','Cauliflower','Brinjal','Okra'],
    bird:['Sparrow','Eagle','Parrot','Pigeon','Owl','Crow','Peacock','Flamingo','Swan','Robin'],
    mammal:['Tiger','Horse','Rabbit','Goat','Monkey','Camel','Squirrel','Leopard','Donkey','Deer'],
    planet:['Mercury','Venus','Mars','Jupiter','Saturn','Neptune','Uranus'],
    instrument:['Guitar','Violin','Flute','Drum','Sitar','Piano','Tabla','Trumpet','Veena','Cello'],
    sport:['Cricket','Football','Tennis','Hockey','Badminton','Kabaddi','Rugby','Golf','Volleyball'],
    'body part':['Elbow','Knee','Ankle','Wrist','Shoulder','Ear','Thumb','Chin'],
    'kitchen tool':['Spatula','Ladle','Whisk','Tongs','Grater','Peeler','Rolling pin'],
    colour:['Red','Violet','Orange','Indigo','Pink','Maroon','Turquoise','Beige'],
    'vehicle':['Bus','Truck','Scooter','Tram','Lorry','Rickshaw','Tractor','Van']
  };
  const RHYMES=[['cake','lake','bake','snake','make'],['light','kite','bite','white','night'],['blue','shoe','crew','through','two'],
    ['stone','phone','bone','loan','own'],['chair','bear','pear','stair','there'],['face','lace','place','race','base'],
    ['bread','said','red','head','bed'],['beach','speech','peach','teach','reach'],['fun','sun','son','ton','one'],
    ['toast','ghost','most','coast','post'],['rain','train','plane','chain','lane'],['moon','spoon','tune','June','noon'],
    ['car','star','far','jar','guitar'],['heart','start','part','cart','smart'],['fly','sky','pie','tie','buy'],
    ['door','floor','more','four','roar'],['dog','fog','log','frog','jog'],['cheese','please','keys','trees','sneeze'],
    ['house','mouse','blouse','spouse','grouse'],['king','ring','swing','thing','sing']];
  const TRIVIA=[['Largest planet in our solar system?','Jupiter','Saturn','Neptune'],['How many legs does a spider have?','8','6','10'],
    ['Fastest land animal?','Cheetah','Lion','Horse'],['Water boils at sea level at (°C)?','100','90','120'],
    ['Gas that plants absorb from the air?','Carbon dioxide','Oxygen','Nitrogen'],['Tallest mountain on Earth?','Mount Everest','K2','Kilimanjaro'],
    ['Players per side in a cricket team?','11','9','12'],['How many continents are there?','7','6','5'],
    ['Largest ocean?','Pacific','Atlantic','Indian'],['Hardest natural substance?','Diamond','Gold','Quartz'],
    ['Who painted the Mona Lisa?','Leonardo da Vinci','Michelangelo','Picasso'],['Smallest prime number?','2','1','3'],
    ['Sides on a hexagon?','6','8','5'],['Currency of Japan?','Yen','Won','Yuan'],['Which planet is called the Red Planet?','Mars','Venus','Mercury'],
    ['Organ that pumps blood?','Heart','Liver','Lungs'],['Minutes in a day?','1440','1240','1640'],['Chemical symbol for gold?','Au','Ag','Go'],
    ['Largest hot desert?','Sahara','Thar','Kalahari'],['Who wrote Romeo and Juliet?','Shakespeare','Dickens','Austen'],
    ['Bones in an adult human body?','206','186','226'],['National animal of India?','Tiger','Lion','Elephant'],
    ['What do bees make?','Honey','Milk','Silk'],['Water freezes at (°F)?','32','0','12'],['Hours in a week?','168','148','178'],
    ['Square root of 144?','12','14','11'],['Largest mammal?','Blue whale','Elephant','Giraffe'],['Planet with the famous bright rings?','Saturn','Jupiter','Uranus'],
    ['Opposite direction of north-east?','South-west','South-east','North-west'],['Strings on a standard guitar?','6','5','7'],
    ['Blue + yellow paint makes?','Green','Purple','Orange'],['Zeros in one million?','6','5','7'],['Instrument with 88 keys?','Piano','Guitar','Flute'],
    ['First person to walk on the Moon?','Neil Armstrong','Buzz Aldrin','Yuri Gagarin'],['Days in a leap year?','366','365','364'],
    ['H2O is the formula for?','Water','Salt','Hydrogen'],['Blood cells that fight infection?','White','Red','Platelets'],
    ['The Taj Mahal is in which city?','Agra','Delhi','Jaipur'],['Teeth in a full adult set?','32','28','36'],
    ['The Great Wall is in which country?','China','Japan','Mongolia'],['Closest star to Earth?','The Sun','Sirius','Polaris'],
    ['Largest organ of the human body?','Skin','Liver','Brain'],['How many sides does a triangle have?','3','4','5'],
    ['Which animal is called the ship of the desert?','Camel','Horse','Donkey'],['Olympic rings: how many?','5','4','6'],
    ['Metal that is liquid at room temperature?','Mercury','Iron','Silver'],['Main language of Brazil?','Portuguese','Spanish','English'],
    ['Seconds in an hour?','3600','6000','360'],['Which planet is closest to the Sun?','Mercury','Venus','Mars'],
    ['Primary colour among these?','Blue','Green','Purple'],['Fastest bird in a dive?','Peregrine falcon','Eagle','Swift'],
    ['Number of players on a football side?','11','10','9'],['Which vitamin does sunlight help make?','D','C','A']];
  const COLOURS=[['Teal','#008080','c'],['Navy','#14245c','b'],['Maroon','#7a0f18','r'],['Olive','#7d7d12','y'],['Coral','#ff7f50','o'],
    ['Lavender','#b9a5e6','p'],['Turquoise','#30d5c8','c'],['Magenta','#e01fd0','m'],['Mustard','#d9a400','y'],['Crimson','#dc143c','r'],
    ['Indigo','#4b0082','p'],['Peach','#ffc69a','o'],['Mint','#9ef0b8','g'],['Salmon','#fa8072','o'],['Charcoal','#36454f','k'],
    ['Lime','#7ed321','g'],['Beige','#e3d5b4','k'],['Sky blue','#7ec8f2','b'],['Emerald','#109a55','g'],['Plum','#8e4585','m']];
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const INKS=[{n:'Red',c:'#ff5d5d'},{n:'Blue',c:'#5b95ff'},{n:'Green',c:'#38d968'},{n:'Pink',c:'#ff6ad5'}];

  function roman(n){const m=[[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let s='';m.forEach(([v,r])=>{while(n>=v){s+=r;n-=v}});return s}
  const fmt=(h,m)=>`${h}:${String(m).padStart(2,'0')}`;
  function clockSVG(h,m){
    const a=((h%12)+m/60)*30*Math.PI/180,b=m*6*Math.PI/180;
    let ticks='';for(let i=0;i<12;i++){const t=i*30*Math.PI/180,r1=i%3?44:40;ticks+=`<line x1="${50+r1*Math.sin(t)}" y1="${50-r1*Math.cos(t)}" x2="${50+48*Math.sin(t)}" y2="${50-48*Math.cos(t)}"/>`}
    return`<svg class="clock" viewBox="0 0 100 100" aria-label="Clock face"><circle cx="50" cy="50" r="48" fill="none"/><g>${ticks}</g>
      <line class="hh" x1="50" y1="50" x2="${50+24*Math.sin(a)}" y2="${50-24*Math.cos(a)}"/><line class="mh" x1="50" y1="50" x2="${50+38*Math.sin(b)}" y2="${50-38*Math.cos(b)}"/><circle cx="50" cy="50" r="3.5" class="hub"/></svg>`;
  }
  function dotsBox(n,cols,rows){
    const cells=shuffle([...Array(cols*rows).keys()]).slice(0,n);
    return cells.map(c=>`<span class="dot" style="left:${(c%cols)*(100/cols)+50/cols+ri(-3,3)}%;top:${Math.floor(c/cols)*(100/rows)+50/rows+ri(-5,5)}%"></span>`).join('');
  }

  const QUIZ=[
    {name:'Mental Math',rule:'Solve it fast.',gen(){
      const t=ri(0,2);let a,b,ans,s;
      if(t===0){a=ri(14,59);b=ri(12,39);ans=a+b;s=`${a} + ${b}`}
      else if(t===1){a=ri(4,12);b=ri(3,9);ans=a*b;s=`${a} × ${b}`}
      else{a=ri(40,95);b=ri(12,29);ans=a-b;s=`${a} − ${b}`}
      return{prompt:BIG(s),opts:nearby(ans,t===1?[a,-a,b,-b,1,-1]:[10,-10,1,-1,2,-2],3,v=>v>0),answer:ans,note:`${s} = ${ans}`};
    }},
    {name:'Ink Trap',rule:'Ignore the word. Tap the colour of the ink.',gen(){
      const ink=pick(INKS);let w;do{w=pick(INKS)}while(w===ink);
      return{prompt:`<div class="q-big" style="color:${ink.c}">${w.n.toUpperCase()}</div>`,opts:INKS.map(x=>x.n),answer:ink.n,note:`The ink was ${ink.n.toLowerCase()}`};
    }},
    {name:'Dot Count',rule:'Count the dots.',gen(){
      const n=ri(8,17);
      return{prompt:`<div class="dots">${dotsBox(n,8,4)}</div>`,opts:nearby(n,[1,-1,2,-2],3),answer:n,note:`There were ${n} dots`};
    }},
    {name:'Odd One Out',rule:'Find the one impostor in the grid.',gen(){
      let [x,y]=pick([['b','d'],['p','q'],['6','9'],['O','Q'],['M','N'],['E','F'],['8','B'],['5','S'],['m','n'],['C','G'],['V','Y'],['I','l'],['u','v'],['3','8']]);
      if(R()<.5)[x,y]=[y,x];const odd=ri(0,11);
      return{prompt:'',opts:[...Array(12).keys()].map(k=>({v:k,l:k===odd?y:x})),answer:odd,cls:'grid',note:`The odd one was ${y}`};
    }},
    {name:'Bigger One',rule:'Tap the bigger value.',gen(){
      const t=ri(0,1);let a,b,va,vb;
      do{
        if(t===0){const n1=ri(1,8),d1=ri(n1+1,9),n2=ri(1,8),d2=ri(n2+1,9);a=`${n1}/${d1}`;b=`${n2}/${d2}`;va=n1/d1;vb=n2/d2}
        else{const x=ri(6,13),y=ri(4,9);a=`${x} × ${y}`;va=x*y;vb=va+ri(-6,6);b=String(vb)}
      }while(va===vb||Math.abs(va-vb)>(t===0?0.15:6));
      const f=v=>Number.isInteger(v)?v:v.toFixed(2);
      return{prompt:'',opts:[{v:'a',l:a},{v:'b',l:b}],answer:va>vb?'a':'b',cls:'two',note:`${a} is ${f(va)}, ${b} is ${f(vb)}`};
    }},
    {name:'Arrow Flip',rule:'SAME means tap that arrow. OPPOSITE means tap the reverse.',gen(){
      const A=[['←','Left'],['↑','Up'],['→','Right'],['↓','Down']],k=ri(0,3),same=R()<.5,ans=same?k:(k+2)%4;
      return{prompt:`<div class="q-tag">${same?'SAME':'OPPOSITE'}</div><div class="q-sym">${A[k][0]}</div>`,opts:A.map((a,j)=>({v:j,l:a[0]})),answer:ans,cls:'four arrows',note:`Answer: ${A[ans][1]}`};
    }},
    {name:'Spell It',rule:'Only one is spelled right. Tap it.',gen(){
      const w=pick(SPELL);return{prompt:'',opts:w.slice(),answer:w[0],cls:'stack',note:`It's spelled ${w[0]}`};
    }},
    {name:'Capital Cities',rule:'Tap the capital city.',gen(){
      const c=pick(CAPITALS),others=sample(CAPITALS.filter(x=>x!==c).map(x=>x[1]),1);
      return{prompt:T(`Capital of <b>${c[0]}</b>?`),opts:[c[1],c[2],others[0]],answer:c[1],cls:'stack',note:`The capital of ${c[0]} is ${c[1]}`};
    }},
    {name:'Unscramble',rule:'Which word do these letters spell?',gen(){
      const w=pick(UNSCRAMBLE);let s;do{s=shuffle(w.split('')).join('')}while(s===w);
      const others=sample(UNSCRAMBLE.filter(x=>x.length===w.length&&x!==w),2);
      return{prompt:`<div class="q-tiles">${s.toUpperCase().split('').map(ch=>`<span>${ch}</span>`).join('')}</div>`,opts:[w,...others].map(x=>x.toUpperCase()),answer:w.toUpperCase(),cls:'stack',note:`It spelled ${w.toUpperCase()}`};
    }},
    {name:'Missing Number',rule:'Find the number that fits the pattern.',gen(){
      const t=ri(0,4);let seq;
      if(t===0){const a=ri(2,20),d=ri(3,12);seq=[0,1,2,3,4].map(i=>a+i*d)}
      else if(t===1){const a=ri(1,5),r=ri(2,3);seq=[0,1,2,3,4].map(i=>a*r**i)}
      else if(t===2){const s=ri(1,6);seq=[0,1,2,3,4].map(i=>(s+i)**2)}
      else if(t===3){let a=ri(1,4),b=ri(2,6);seq=[a,b];while(seq.length<5)seq.push(seq[seq.length-1]+seq[seq.length-2])}
      else{const a=ri(50,99),d=ri(4,11);seq=[0,1,2,3,4].map(i=>a-i*d)}
      const k=ri(1,4),ans=seq[k],gap=Math.max(1,Math.abs((seq[1]-seq[0])));
      const shown=seq.map((v,i)=>i===k?'<b class="q-gap">?</b>':v).join(', ');
      return{prompt:BIG(`<span class="q-seq">${shown}</span>`),opts:nearby(ans,[1,-1,2,-2,gap,-gap],3,v=>v>=0),answer:ans,note:`${seq.join(', ')}`};
    }},
    {name:'Clock Reader',rule:'What time does the clock show?',gen(){
      const h=ri(1,12),m=ri(0,11)*5,ans=fmt(h,m),o=new Set([ans]);
      const sh=m===0?12:m/5,sm=(h%12)*5;o.add(fmt(sh,sm));
      o.add(fmt(h===12?1:h+1,m));o.add(fmt(h===1?12:h-1,m));
      let i=1;while(o.size<4)o.add(fmt(h,(m+5*i++)%60));
      return{prompt:clockSVG(h,m),opts:shuffle([...o].filter(x=>x!==ans)).slice(0,2).concat(ans),answer:ans,note:`It was ${ans}`};
    }},
    {name:'Opposites',rule:'Tap the opposite word.',gen(){
      let p=pick(OPPOSITES);if(R()<.5)p=[p[1],p[0]];
      const others=sample([...new Set(OPPOSITES.filter(x=>!x.includes(p[0])&&!x.includes(p[1])).map(x=>pick(x)))],2);
      return{prompt:T(`Opposite of <b>${p[0].toUpperCase()}</b>`),opts:[p[1],...others],answer:p[1],cls:'stack',note:`${p[0]} ↔ ${p[1]}`};
    }},
    {name:'True or False',rule:'Is the sum right?',gen(){
      const t=ri(0,1),a=t?ri(3,12):ri(12,79),b=t?ri(3,12):ri(12,49),real=t?a*b:a+b,ok=R()<.5;
      const shown=ok?real:real+pick(t?[a,-a,b,-b,1,-1,10]:[1,-1,10,-10,2,-2]);
      return{prompt:BIG(`${a} ${t?'×':'+'} ${b} = ${shown}`),opts:['True','False'],answer:ok?'True':'False',cls:'two',note:`${a} ${t?'×':'+'} ${b} = ${real}`};
    }},
    {name:'Heavier Beast',rule:'Which animal is heavier?',gen(){
      let a,b;do{a=pick(BEASTS);b=pick(BEASTS)}while(a===b||Math.max(a[1],b[1])/Math.min(a[1],b[1])<2);
      const kg=v=>v>=1000?(v/1000)+' t':v+' kg';
      return{prompt:'',opts:[a[0],b[0]],answer:a[1]>b[1]?a[0]:b[0],cls:'two words',note:`${a[0]} ~${kg(a[1])}, ${b[0]} ~${kg(b[1])}`};
    }},
    {name:'Odd Word Out',rule:'Three belong together. Tap the one that doesn’t.',gen(){
      const keys=Object.keys(CATS),ka=pick(keys);let kb;do{kb=pick(keys)}while(kb===ka);
      const three=sample(CATS[ka],3),odd=pick(CATS[kb].filter(x=>!CATS[ka].includes(x)));
      return{prompt:'',opts:[...three,odd],answer:odd,cls:'four words',note:`${odd} isn’t a ${ka}`};
    }},
    {name:'Rhyme Time',rule:'Tap the word that rhymes.',gen(){
      const g=pick(RHYMES),r=pick(g.slice(1)),others=sample([...new Set(RHYMES.filter(x=>x!==g).map(x=>pick(x)))],2);
      return{prompt:T(`Rhymes with <b>${g[0].toUpperCase()}</b>`),opts:[r,...others],answer:r,note:`${r} rhymes with ${g[0]}`};
    }},
    {name:'Quick Trivia',rule:'Tap the right answer.',gen(){
      const q=pick(TRIVIA);return{prompt:T(q[0]),opts:q.slice(1),answer:q[1],cls:'stack',note:q[1]};
    }},
    {name:'Roman Numerals',rule:'What number is this?',gen(){
      const n=ri(4,89);return{prompt:BIG(roman(n)),opts:nearby(n,[1,-1,5,-5,10,-10,9,-9],3,v=>v>0),answer:n,note:`${roman(n)} = ${n}`};
    }},
    {name:'Day Jump',rule:'Count the days. Which day is it?',gen(){
      const d=ri(0,6),k=ri(2,24),fwd=R()<.6,ans=DAYS[((d+(fwd?k:-k))%7+7)%7];
      return{prompt:T(`Today is <b>${DAYS[d]}</b>. What day ${fwd?`is it in ${k} days`:`was it ${k} days ago`}?`),
        opts:[ans,...sample(DAYS.filter(x=>x!==ans),3)],answer:ans,cls:'four words',note:`It's ${ans}`};
    }},
    {name:'Next Letter',rule:'Which letter comes next?',gen(){
      const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ',t=ri(0,2);let seq;
      if(t===0){const s=ri(0,8),d=ri(2,4);seq=[0,1,2,3,4].map(i=>s+i*d)}
      else if(t===1){const s=ri(16,25),d=ri(2,3);seq=[0,1,2,3,4].map(i=>s-i*d)}
      else{const s=ri(0,6);seq=[s,s+1,s+3,s+6,s+10]}
      const ans=A[seq[4]],o=new Set([ans]);[1,-1,2,-2].forEach(x=>{const c=A[seq[4]+x];if(c&&o.size<3)o.add(c)});
      return{prompt:BIG(seq.slice(0,4).map(i=>A[i]).join(' ')+' <b class="q-gap">?</b>'),opts:[...o],answer:ans,note:`Next was ${ans}`};
    }},
    {name:'Percent Panic',rule:'Work out the percentage.',gen(){
      const p=pick([5,10,15,20,25,30,40,50,60,75]),base=pick([20,40,60,80,120,160,200,240,300,400,500]),ans=p*base/100;
      return{prompt:BIG(`${p}% of ${base}`),opts:nearby(ans,[base/20,-base/20,base/10,-base/10,5,-5],3,v=>v>0&&Number.isInteger(v)),answer:ans,note:`${p}% of ${base} = ${ans}`};
    }},
    {name:'Name That Colour',rule:'What is this colour called?',gen(){
      const c=pick(COLOURS),others=sample(COLOURS.filter(x=>x[2]!==c[2]),2).map(x=>x[0]);
      return{prompt:`<div class="q-swatch" style="background:${c[1]}"></div>`,opts:[c[0],...others],answer:c[0],cls:'stack',note:`That was ${c[0].toLowerCase()}`};
    }},
    {name:'More Dots',rule:'Tap the box with more dots.',gen(){
      const a=ri(7,16),b=a+pick([1,2,3,-1,-2,-3]);
      return{prompt:'',opts:[{v:'L',l:dotsBox(a,4,5),html:1},{v:'R',l:dotsBox(b,4,5),html:1}],answer:a>b?'L':'R',cls:'two dotbtn',note:`${Math.max(a,b)} dots beat ${Math.min(a,b)}`};
    }},
    {name:'Number Hunt',rule:'Find the target number in the grid.',gen(){
      const t=ri(12,98),rev=Number(String(t).split('').reverse().join('')),pool=new Set();
      [rev,t+1,t-1,t+10,t-10,t+11].forEach(v=>{if(v!==t&&v>=10&&v<=99)pool.add(v)});
      while(pool.size<15){const v=ri(10,99);if(v!==t)pool.add(v)}
      const nums=shuffle([...pool].slice(0,15).concat(t));const at=nums.indexOf(t);
      return{prompt:T(`Find <b>${t}</b>`),opts:nums.map((v,i)=>({v:i,l:v})),answer:at,cls:'grid',note:`${t} was in row ${Math.floor(at/4)+1}`};
    }},
    {name:'Middle Arrow',rule:'Which way does the MIDDLE arrow point?',gen(){
      const mid=R()<.5?'←':'→',side=R()<.6?(mid==='←'?'→':'←'):mid;
      return{prompt:`<div class="q-flank">${side}${side}<b>${mid}</b>${side}${side}</div>`,opts:[{v:'L',l:'←'},{v:'R',l:'→'}],answer:mid==='←'?'L':'R',cls:'two arrows',note:`The middle pointed ${mid==='←'?'left':'right'}`};
    }},
    {name:'Flash Memory',rule:'Memorise the number before it vanishes.',gen(){
      const len=ri(4,5);let s='';for(let i=0;i<len;i++)s+=ri(i?0:1,9);
      const o=new Set([s]);let g=0;
      while(o.size<3&&g++<50){const a=s.split(''),i=ri(0,len-2);
        if(R()<.5){[a[i],a[i+1]]=[a[i+1],a[i]]}else{a[i+1]=String((Number(a[i+1])+ri(1,8))%10)}
        if(a[0]!=='0')o.add(a.join(''))}
      return{prompt:`<div class="q-flash">${s}</div>`,opts:[...o],answer:s,note:`It was ${s}`};
    }},
    {name:'Time Travel',rule:'Add the minutes. What time will it be?',gen(){
      const h=ri(1,12),m=ri(0,11)*5,add=ri(3,19)*5,tot=m+add,h2=((h-1+Math.floor(tot/60))%12)+1,m2=tot%60,ans=fmt(h2,m2);
      const o=new Set([ans]);[[0,10],[0,-10],[1,0],[-1,0],[0,5]].forEach(([dh,dm])=>{if(o.size>=3)return;let mm=m2+dm,hh=h2+dh;if(mm<0){mm+=60;hh--}if(mm>=60){mm-=60;hh++}hh=((hh-1)%12+12)%12+1;o.add(fmt(hh,mm))});
      return{prompt:T(`It’s <b>${fmt(h,m)}</b>. What time is it in <b>${add} min</b>?`),opts:[...o],answer:ans,note:`${fmt(h,m)} + ${add} min = ${ans}`};
    }}
  ];

  const css=`
.q-text{font-size:clamp(22px,6.4vw,30px);line-height:1.25;text-wrap:balance;max-width:24ch}
.q-text b{font-weight:700;color:var(--yellow,#f6c432)}
.q-big{font-family:var(--display);font-size:clamp(28px,9vw,48px);line-height:1.1;font-variant-numeric:tabular-nums;text-wrap:balance}
.q-gap{color:var(--yellow,#f6c432);font-weight:400}
.q-seq{font-size:.78em;letter-spacing:.02em}
.q-tag{font:400 clamp(20px,6vw,30px) var(--display);letter-spacing:.06em}
.q-sym{font-size:clamp(60px,20vw,110px);line-height:1}
.q-tiles{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.q-tiles span{font-family:var(--display);font-size:clamp(22px,7vw,34px);width:1.6em;height:1.6em;display:grid;place-items:center;border-radius:10px;background:var(--yellow,#f6c432);color:#13151b}
.q-swatch{width:min(70%,220px);aspect-ratio:2/1;max-width:100%;border-radius:16px;border:3px solid rgba(255,255,255,.18)}
.q-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.q-pair .dots{height:clamp(110px,22vh,170px)}
.q-flank{font-size:clamp(46px,15vw,80px);letter-spacing:.06em;line-height:1}
.q-flank b{font-weight:400}
.q-flash{font-family:var(--display);font-size:clamp(40px,13vw,66px);letter-spacing:.12em;animation:qflash 1.7s forwards}
@keyframes qflash{0%,70%{opacity:1}100%{opacity:0}}
.clock{width:clamp(120px,36vw,170px);height:auto;max-width:100%}
.clock circle{stroke:var(--ink,#f3efe4);stroke-width:3}
.clock line{stroke:var(--ink,#f3efe4);stroke-linecap:round}
.clock g line{stroke-width:2.5;opacity:.7}
.clock .hh{stroke-width:6}
.clock .mh{stroke-width:3.5;stroke:var(--yellow,#f6c432)}
.clock .hub{fill:var(--ink,#f3efe4);stroke:none}
.opts.two{grid-template-columns:repeat(2,1fr)}
.opts.words .opt{font-size:21px}
.opts.dotbtn .opt{position:relative;height:clamp(110px,22vh,170px);padding:0}
.opts.arrows .opt{font:400 46px/1 system-ui,sans-serif}
.opts.two.words .opt{font:700 24px var(--body)}
.arena{position:relative;width:100%;height:clamp(170px,46vh,420px);border:2px dashed var(--line,#3a4050);border-radius:14px}
.target{position:absolute;width:62px;height:62px;border-radius:50%;transform:translate(-50%,-50%);border:0;padding:0;
  background:radial-gradient(circle,#13151b 0 18%,#f6c432 19% 42%,#13151b 43% 56%,#f6c432 57%);box-shadow:0 0 0 3px rgba(0,0,0,.35);animation:qpop .14s ease-out}
@keyframes qpop{from{transform:translate(-50%,-50%) scale(.4)}to{transform:translate(-50%,-50%) scale(1)}}
@media (prefers-reduced-motion:reduce){.q-flash{animation-duration:2.2s}.target{animation:none}}
`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  window.CCG={QUIZ,setRand(f){R=f},count:QUIZ.length};
})();
