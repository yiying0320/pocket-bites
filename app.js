const $=id=>document.getElementById(id);
// Food places from the shared Google Maps list「想去的地點」. Rating/count noted 2026-11-13.
const SAVED=[
{name:'金貴 中式料理',type:'台灣餐廳',emoji:'🥢',rating:4.6,count:2848,city:'高雄',lat:22.6614076,lng:120.314173},
{name:'酌咖啡烘豆坊',type:'咖啡店',emoji:'☕',rating:4.9,count:74,city:'高雄',lat:22.6879771,lng:120.320118},
{name:'叟卡宋 SOKA SONG',type:'咖啡店',emoji:'☕',rating:5.0,count:82,city:'台南',lat:22.9926993,lng:120.2001188},
{name:'晝夜甜時 zhòuyè',type:'甜品店',emoji:'🍰',rating:4.7,count:70,city:'高雄',lat:22.650909,lng:120.3050819},
{name:'大骨麵 DaGoodMan',type:'麵店',emoji:'🍜',rating:4.3,count:1514,city:'高雄',lat:22.6302326,lng:120.2929891},
{name:'TO DAY 致日子咖啡 黃埔店',type:'咖啡店',emoji:'☕',rating:4.1,count:159,city:'高雄',lat:22.6183229,lng:120.3640146},
{name:'小園日本料理',type:'日式料理',emoji:'🍣',rating:4.1,count:1712,city:'高雄',lat:22.6277042,lng:120.2957276},
{name:'Phli : Cafe x Khao Soi',type:'咖啡店',emoji:'☕',rating:4.5,count:269,city:'清邁',lat:18.852309,lng:99.0436431}];
const MODES={walk:{name:'步行',emoji:'🚶',maps:'walking',kmPerMin:.075,extra:0},scooter:{name:'騎機車',emoji:'🛵',maps:'two-wheeler',kmPerMin:.4,extra:2},car:{name:'開車',emoji:'🚗',maps:'driving',kmPerMin:.33,extra:4}};
const RANGES=[10,15,20,30];
const GKEY=window.POCKET_BITES_MAPS_KEY||'';
let placesLib=null,searchSeq=0,lastResults=null;
let mode='walk',category='餐廳',categoryLabel='餐廳',position=null,toastTimer;

function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// Straight-line distance x1.3 road factor, rough speed per mode (+ parking time).
function roadKm(s){const r=x=>x*Math.PI/180,dLat=r(s.lat-position.latitude),dLng=r(s.lng-position.longitude),a=Math.sin(dLat/2)**2+Math.cos(r(position.latitude))*Math.cos(r(s.lat))*Math.sin(dLng/2)**2;return 2*6371*Math.asin(Math.sqrt(a))*1.3}
function minutesTo(s){const M=MODES[mode];return Math.max(1,Math.round(roadKm(s)/M.kmPerMin+M.extra))}
function searchTerm(){return $('query').value.trim()||category}
function mapsSearchUrl(q){if(position){const M=MODES[mode],km=Math.max(.5,(+$('minutes').value-M.extra)*M.kmPerMin),zoom=Math.min(17,Math.max(11,Math.round(16-Math.log2(km))));return 'https://www.google.com/maps/search/'+encodeURIComponent(q)+'/@'+position.latitude.toFixed(6)+','+position.longitude.toFixed(6)+','+zoom+'z'}const u=new URL('https://www.google.com/maps/search/');u.searchParams.set('api','1');u.searchParams.set('query',q+' 附近');return u.href}
function placeUrl(s){const u=new URL('https://www.google.com/maps/search/');u.searchParams.set('api','1');u.searchParams.set('query',s.name+' '+s.city);return u.href}
function dirUrl(s){const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('destination',s.lat+','+s.lng);u.searchParams.set('travelmode',MODES[mode].maps);return u.href}
function starsHtml(s){return '<a class="rating" href="'+placeUrl(s)+'" target="_blank" rel="noopener" aria-label="Google 評分 '+s.rating.toFixed(1)+' 顆星，'+s.count+' 則評論"><span class="stars" style="--r:'+s.rating+'" aria-hidden="true">★★★★★</span><b>'+s.rating.toFixed(1)+'</b><span>('+s.count.toLocaleString()+')</span></a>'}

function render(){const M=MODES[mode],minutes=+$('minutes').value;renderNearby();
$('timeLabel').textContent=M.emoji+' '+M.name+'時間';
if(!GKEY){$('goArrow').textContent='↗';$('goNote').textContent='會在 Google Maps 看到真實店家的照片、星數、評論與營業時間。'}$('goWhat').textContent=$('query').value.trim()?'「'+$('query').value.trim()+'」':categoryLabel;
const box=$('savedNear');
let html='<div class="step-label"><b>03</b> 附近的口袋收藏 <span class="saved-chip">'+M.name+' '+minutes+' 分內</span></div>';
if(!position){box.innerHTML=html+'<p class="saved-hint">📍 先按上方「用我的位置找吃的」，小象只挑你附近、到得了的收藏店給你 ♡</p>';return}
const near=SAVED.map(s=>({...s,min:minutesTo(s)})).filter(s=>s.min<=minutes).sort((a,b)=>a.min-b.min);
if(near.length){html+=near.map(s=>'<div class="saved-row"><span class="saved-emoji">'+s.emoji+'</span><div><strong>'+esc(s.name)+'</strong>'+starsHtml(s)+'<small>'+s.type+' · '+M.emoji+' 約 '+s.min+' 分鐘</small></div><div class="saved-actions"><a class="saved-page" href="'+placeUrl(s)+'" target="_blank" rel="noopener">店家頁</a><a href="'+dirUrl(s)+'" target="_blank" rel="noopener">導航 ↗</a></div></div>').join('')+'<p class="saved-note">時間以直線距離粗估；星數為 2026/11/13 的紀錄，點「店家頁」看最新評論、照片與菜單。</p>'}
else{const next=RANGES.find(n=>n>minutes),nextMode=mode==='walk'?'scooter':mode==='scooter'?'car':null,lost=minutes>20;
let btn='';if(!lost&&next)btn='<button class="saved-more" data-range="'+next+'">放寬到 '+next+' 分鐘 →</button>';else if(nextMode)btn='<button class="saved-more" data-mode-switch="'+nextMode+'">改'+MODES[nextMode].name+'找找看 '+MODES[nextMode].emoji+'</button>';
html+='<div class="saved-empty"><span>'+(lost?'🐘':'🥺')+'</span><h3>'+(lost?'嗚嗚，找不到了…':'附近還沒有你收藏的店')+'</h3><p>'+M.name+' '+minutes+' 分鐘內沒有你收藏的店。'+(lost?'可以直接用上面的 Google Maps 找附近新店家！':'')+'</p>'+btn+'</div>'}
box.innerHTML=html}

function setMode(m){mode=m;document.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('active',x.dataset.mode===m);x.setAttribute('aria-pressed',x.dataset.mode===m)});render()}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);toast(MODES[mode].emoji+' 改用'+MODES[mode].name+'計算時間')}));
document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.cat;categoryLabel=b.textContent.replace(/\p{Extended_Pictographic}/gu,'').trim()==='都想看看'?'餐廳':b.dataset.cat.split(' ')[0];$('query').value='';document.querySelectorAll('[data-cat]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});render()}));
$('minutes').addEventListener('change',render);$('query').addEventListener('input',render);
function openMaps(){if(GKEY){findNearby();return}window.open(mapsSearchUrl(searchTerm()),'_blank','noopener');if(!position)toast('小提醒：先定位，地圖會更準喔')}
// ---- Google Places (on-page results) ----
function loadPlaces(){if(placesLib)return Promise.resolve(placesLib);return new Promise((res,rej)=>{window.__pbMapsReady=()=>google.maps.importLibrary('places').then(l=>{placesLib=l;res(l)},rej);const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(GKEY)+'&v=weekly&language=zh-TW&region=TW&loading=async&callback=__pbMapsReady';s.async=true;s.onerror=()=>rej(new Error('load'));window.gm_authFailure=()=>rej(new Error('auth'));document.head.appendChild(s)})}
function navUrl(p){const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('destination',p.name);u.searchParams.set('destination_place_id',p.id);u.searchParams.set('travelmode',MODES[mode].maps);return u.href}
// Open-now from regular opening hours, evaluated in the place's own timezone.
function openInfo(p){const h=p.regularOpeningHours;if(!h||!h.periods||!h.periods.length)return {open:null,today:''};
const off=p.utcOffsetMinutes!=null?p.utcOffsetMinutes:480,t=new Date(Date.now()+off*60000),day=t.getUTCDay(),now=day*1440+t.getUTCHours()*60+t.getUTCMinutes(),W=7*1440;
let open=false;for(const pr of h.periods){if(!pr.close){open=true;break}const a=pr.open.day*1440+pr.open.hour*60+pr.open.minute;let b=pr.close.day*1440+pr.close.hour*60+pr.close.minute;if(b<=a)b+=W;if((now>=a&&now<b)||(now+W>=a&&now+W<b)){open=true;break}}
const d=h.weekdayDescriptions||[];const today=(d[(day+6)%7]||'').replace(/^[^:：]+[:：]\s*/,'');return {open,today}}
// ---- At-a-glance info: price per person, features, popular dishes
function priceText(p){const pr=p.priceRange,u=m=>m&&m.units!=null?Number(m.units):null;if(pr){const a=u(pr.startPrice),b=u(pr.endPrice);if(a!=null&&b!=null)return a<=1?'每人 $'+b+' 內':'每人 $'+a+'–'+b;if(a!=null)return '每人 $'+a+' 起'}
return {INEXPENSIVE:'平價',MODERATE:'中等價位',EXPENSIVE:'偏高價位',VERY_EXPENSIVE:'高價位'}[p.priceLevel]||''}
function features(p){const f=[],pay=p.paymentOptions||{};
if(p.hasDineIn)f.push('🪑 內用');if(p.hasTakeout)f.push('🥡 外帶');if(p.hasDelivery)f.push('🛵 外送');if(p.isReservable)f.push('📅 可訂位');if(p.hasOutdoorSeating)f.push('🌤️ 戶外座位');if(p.allowsDogs)f.push('🐶 寵物友善');if(p.servesVegetarianFood)f.push('🥬 有素食');if(p.servesDessert)f.push('🍰 有甜點');if(p.servesCoffee)f.push('☕ 有咖啡');
if(pay.acceptsCashOnly)f.push('💵 只收現金');else{if(pay.acceptsCreditCards)f.push('💳 可刷卡');if(pay.acceptsNFC)f.push('📱 行動支付')}return f.slice(0,6)}
// Common Taiwanese food words; the ones mentioned most in the review summary and reviews become "人氣美食".
const DISHES=['鹹酥雞','鹽酥雞','雞排','炸雞','豆乳雞','雞米花','雞腿','雞翅','雞肉捲','魷魚','花枝','甜不辣','米血','豆皮','黑輪','魚板','銀絲捲','蘿蔔糕','四季豆','杏鮑菇','地瓜球','薯條','洋蔥圈','拉麵','叉燒','叉燒飯','溏心蛋','沾麵','烏龍麵','蕎麥麵','牛肉麵','乾麵','麻醬麵','涼麵','擔仔麵','意麵','炒麵','義大利麵','燉飯','焗烤','披薩','漢堡','牛肉堡','起司堡','早午餐','三明治','蛋餅','蘿蔔糕','飯糰','水餃','煎餃','鍋貼','小籠包','湯包','包子','餛飩','抄手','滷肉飯','雞肉飯','排骨飯','便當','咖哩','丼飯','親子丼','豬排','炸豬排','壽司','生魚片','手捲','天婦羅','鰻魚飯','燒肉','烤肉','牛排','火鍋','麻辣鍋','臭豆腐','滷味','鹽水雞','蚵仔煎','肉圓','碗粿','米糕','粽子','虱目魚','魚湯','牛肉湯','羊肉','薑母鴨','燒烤','串燒','炒飯','蛋包飯','河粉','打拋豬','綠咖哩','月亮蝦餅','泰式奶茶','金沙','鬆餅','厚鬆餅','可麗餅','巴斯克','乳酪蛋糕','提拉米蘇','布丁','布朗尼','司康','肉桂捲','可頌','蛋塔','泡芙','馬卡龍','千層','戚風','蛋糕','冰淇淋','義式冰淇淋','聖代','剉冰','雪花冰','芒果冰','豆花','仙草','芋圓','湯圓','紅豆湯','奶茶','珍珠奶茶','紅茶','綠茶','拿鐵','手沖','美式','咖啡','調酒','精釀','蛤蜊','干貝','松露','蒜味','豚骨','雞白湯','味噌','鹽味'];
function popularDishes(p){const sum=(p.reviewSummary&&p.reviewSummary.text)||'',rev=(p.reviews||[]).map(r=>r.text||'').join('\n'),score={};
const norm=t=>t.replace(/[鹽塩]/g,'鹹'),skip=norm((p.displayName||'')+searchTerm());for(const d of DISHES){if(skip.includes(norm(d)))continue;const a=sum.split(d).length-1,b=rev.split(d).length-1;if(a||b)score[d]=a*3+b}
// Drop words contained in a longer hit (e.g. 叉燒 when 叉燒飯 also matched).
let hits=Object.keys(score).sort((x,y)=>score[y]-score[x]||y.length-x.length);hits=hits.filter(d=>!hits.some(o=>o!==d&&o.includes(d)&&score[o]>=score[d]));return hits.slice(0,4)}
const PRICE={INEXPENSIVE:'$',MODERATE:'$$',EXPENSIVE:'$$$',VERY_EXPENSIVE:'$$$$'};
async function findNearby(){const box=$('results');if(!position){toast('先按上方「用我的位置找吃的」喔');$('locate').scrollIntoView({behavior:'smooth',block:'center'});return}
const seq=++searchSeq,M=MODES[mode],minutes=+$('minutes').value,q=searchTerm();box.hidden=false;
box.innerHTML='<div class="step-label"><b>03</b> 附近的店家</div><div class="nearby-loading"><img src="elephant.svg?v=5" alt=""> 小象正在找附近的'+esc(q)+'…</div>';box.scrollIntoView({behavior:motionEnabled()?'smooth':'instant',block:'start'});
try{const {Place}=await loadPlaces();const radius=Math.min(50000,Math.max(500,((minutes-M.extra)*M.kmPerMin/1.3)*1000));
const {places}=await Place.searchByText({textQuery:q,fields:['id','displayName','location','rating','userRatingCount','photos','regularOpeningHours','utcOffsetMinutes','businessStatus','priceLevel','priceRange','primaryTypeDisplayName','googleMapsURI','websiteURI','editorialSummary','reviewSummary','reviews','hasTakeout','hasDelivery','hasDineIn','hasOutdoorSeating','isReservable','servesVegetarianFood','allowsDogs','servesDessert','servesCoffee','paymentOptions'],locationBias:{center:{lat:position.latitude,lng:position.longitude},radius},maxResultCount:20,language:'zh-TW',region:'tw'});
if(seq!==searchSeq)return;
const list=await Promise.all((places||[]).filter(p=>p.businessStatus!=='CLOSED_PERMANENTLY'&&p.location).map(async p=>{const {open,today}=openInfo(p);const ph=p.photos&&p.photos[0];const r={id:p.id,name:p.displayName,lat:p.location.lat(),lng:p.location.lng(),rating:p.rating,count:p.userRatingCount||0,type:p.primaryTypeDisplayName||'',price:PRICE[p.priceLevel]||'',open,today,url:p.googleMapsURI,web:p.websiteURI,photo:ph?ph.getURI({maxWidth:480,maxHeight:300}):'',credit:ph&&ph.authorAttributions&&ph.authorAttributions[0],priceText:priceText(p),feats:features(p),dishes:popularDishes(p),buzz:(p.reviewSummary&&(p.reviewSummary.text||''))||p.editorialSummary||'',buzzAI:!!(p.reviewSummary&&p.reviewSummary.text)};r.min=minutesTo(r);return r}));
lastResults={q,list};renderNearby()}catch(e){if(seq!==searchSeq)return;box.innerHTML='<div class="step-label"><b>03</b> 附近的店家</div><div class="saved-empty"><span>🙈</span><h3>暫時連不上 Google 店家資料</h3><p>'+(e.message==='auth'?'API 金鑰無效或尚未開通 Places API。':'請確認網路後再試一次。')+'</p><a class="saved-more" href="'+mapsSearchUrl(q)+'" target="_blank" rel="noopener">改到 Google Maps 找 ↗</a></div>'}}
function renderNearby(){if(!lastResults)return;const box=$('results'),M=MODES[mode],minutes=+$('minutes').value,{q}=lastResults;
const inRange=lastResults.list.map(r=>({...r,min:minutesTo(r)})).filter(r=>r.min<=minutes),list=inRange.filter(r=>r.open===true).sort((a,b)=>a.min-b.min),hiddenCount=inRange.length-list.length;
let html='<div class="step-label"><b>03</b> 附近的「'+esc(q)+'」 <span class="saved-chip">'+M.name+' '+minutes+' 分內 · 營業中 '+list.length+' 家</span></div>';
if(!list.length){const next=RANGES.find(n=>n>minutes),nextMode=mode==='walk'?'scooter':mode==='scooter'?'car':null,lost=minutes>20;let btn='';if(!lost&&next)btn='<button class="saved-more" data-range="'+next+'">放寬到 '+next+' 分鐘 →</button>';else if(nextMode)btn='<button class="saved-more" data-mode-switch="'+nextMode+'">改'+MODES[nextMode].name+'找找看 '+MODES[nextMode].emoji+'</button>';
html+='<div class="saved-empty"><span>'+(lost?'🐘':'🥺')+'</span><h3>'+(lost?'嗚嗚，找不到了…':'這個範圍內還沒找到')+'</h3><p>'+(hiddenCount?M.name+' '+minutes+' 分鐘內有 '+hiddenCount+' 家，但現在都沒在營業。':M.name+' '+minutes+' 分鐘內沒有符合的店。')+'</p>'+btn+'</div>'}
else html+=list.map(r=>'<article class="card place"><div class="art'+(r.photo?' has-photo':'')+'" style="--artbg:#fde3ee">'+(r.photo?'<img src="'+esc(r.photo)+'" alt="'+esc(r.name)+' 的照片" loading="lazy">':'<span class="food" aria-hidden="true">🍽️</span>')+'<span class="distance">'+M.emoji+' 約 '+r.min+' 分鐘</span>'+(r.credit?'<a class="caption" href="'+esc(r.credit.uri||'#')+'" target="_blank" rel="noopener">📷 '+esc(r.credit.displayName||'')+'</a>':'')+'</div><div class="card-body"><div class="card-title"><h3>'+esc(r.name)+'</h3>'+(r.open===true?'<span class="status">● 營業中</span>':r.open===false?'<span class="status closed">休息中</span>':'')+'</div>'+(r.rating?'<a class="rating" href="'+esc(r.url)+'" target="_blank" rel="noopener"><span class="stars" style="--r:'+r.rating+'" aria-hidden="true">★★★★★</span><b>'+r.rating.toFixed(1)+'</b><span>('+r.count.toLocaleString()+' 則評論)</span></a>':'<p class="tags">尚無評分</p>')+'<p class="tags">'+esc(r.type)+(r.today?' · 🕒 今天 '+esc(r.today):'')+'</p>'+
'<div class="chips">'+(r.priceText?'<span class="chip price">💰 '+esc(r.priceText)+'</span>':'')+r.feats.map(f=>'<span class="chip">'+esc(f)+'</span>').join('')+'</div>'+
(r.dishes.length?'<div class="hot"><span>🔥 人氣美食</span>'+r.dishes.map(d=>'<b>'+esc(d)+'</b>').join('')+'</div>':'')+
(r.buzz?'<details class="buzz"><summary>💬 <span>'+esc(r.buzz)+'</span></summary><p>'+esc(r.buzz)+'</p>'+(r.buzzAI?'<small>✨ 由 Google Gemini 根據評論摘要</small>':'')+'</details>':'')+'<div class="actions"><a href="'+esc(r.url)+'" target="_blank" rel="noopener">📋 菜單・評論</a><a class="go" href="'+navUrl(r)+'" target="_blank" rel="noopener">🧭 直接導航</a></div></div></article>').join('');
html+='<p class="saved-note">'+(hiddenCount?'已隱藏 '+hiddenCount+' 家休息中或沒提供營業時間的店。':'')+'資料來自 Google；時間以直線距離粗估。<a href="'+mapsSearchUrl(q)+'" target="_blank" rel="noopener">在 Google Maps 看更多 ↗</a></p>';box.innerHTML=html}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();openMaps()});$('goMaps').onclick=openMaps;
['savedNear','results'].forEach(id=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.range){$('minutes').value=b.dataset.range;render();toast('放寬到 '+b.dataset.range+' 分鐘')}else if(b.dataset.modeSwitch){setMode(b.dataset.modeSwitch);toast('改用'+MODES[mode].name+'，再找找看 '+MODES[mode].emoji)}}));
function goSaved(){$('savedNear').scrollIntoView({behavior:motionEnabled()?'smooth':'instant',block:'start'});$('explore').classList.remove('selected');$('bottomSaved').classList.add('selected')}
$('saved').onclick=goSaved;$('bottomSaved').onclick=goSaved;$('explore').onclick=()=>{window.scrollTo({top:0,behavior:motionEnabled()?'smooth':'instant'});$('explore').classList.add('selected');$('bottomSaved').classList.remove('selected')};
function sheet(html){$('sheetContent').innerHTML=html;$('sheet').showModal()}
$('closeSheet').onclick=()=>$('sheet').close();$('sheet').addEventListener('click',e=>{if(e.target===$('sheet')){const r=$('sheet').getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)$('sheet').close()}});
const IN_APP=/Line\/|Instagram|FBAN|FBAV|MicroMessenger/i.test(navigator.userAgent);
function setPosition(lat,lng,title,sub){position={latitude:lat,longitude:lng};$('locationTitle').textContent=title;$('locationText').textContent=sub;$('locate').disabled=false;render();if(lastResults)findNearby()}
function locateFailed(e,silent){$('locate').disabled=false;$('locationTitle').textContent='定位未成功，點我重試';
const msg=IN_APP?'你在 LINE／IG 裡開啟，請按右上角「⋯」改用 Safari 或 Chrome 開啟':e&&e.code===1?'瀏覽器沒有定位權限：請到瀏覽器或手機設定允許「位置」':e&&e.code===3?'等太久沒收到 GPS，可以到窗邊再試，或直接輸入地點':'暫時抓不到位置，請確認手機定位已開啟，或直接輸入地點';
$('locationText').textContent=msg;$('placeForm').classList.add('nudge');if(!silent)toast('定位沒成功，也可以在下面直接輸入地點 ↓')}
function locate(silent){if(!navigator.geolocation){locateFailed(null,silent);return}$('locationTitle').textContent='正在找你的位置…';$('locationText').textContent='第一次會請你允許定位';$('locate').disabled=true;
const ok=p=>{setPosition(p.coords.latitude,p.coords.longitude,'定位成功 ♡','點一下可以重新定位');$('placeForm').classList.remove('nudge');if(!silent)toast('定位成功！')};
navigator.geolocation.getCurrentPosition(ok,e=>{if(e.code===1){locateFailed(e,silent);return}
// High-accuracy GPS failed or timed out: retry once with network-based location.
$('locationText').textContent='GPS 較慢，改用網路定位再試一次…';navigator.geolocation.getCurrentPosition(ok,e2=>locateFailed(e2,silent),{enableHighAccuracy:false,timeout:15000,maximumAge:300000})},{enableHighAccuracy:true,timeout:10000,maximumAge:60000})}
async function usePlace(text){text=text.trim();if(!text)return;if(!GKEY){toast('需要 Google 金鑰才能用地點搜尋');return}
$('placeGo').disabled=true;$('placeGo').textContent='找…';
try{const {Place}=await loadPlaces();const {places}=await Place.searchByText({textQuery:text,fields:['location','displayName','formattedAddress'],maxResultCount:1,language:'zh-TW',region:'tw'});
if(!places||!places.length||!places[0].location){toast('找不到「'+text+'」，換個說法試試');return}
const p=places[0];setPosition(p.location.lat(),p.location.lng(),'📍 '+(p.displayName||text),'以這個地點為中心找吃的・點上面可改回 GPS 定位');$('placeForm').classList.remove('nudge');toast('改從「'+(p.displayName||text)+'」出發')}
catch(e){toast(e.message==='auth'?'Google 金鑰無法使用':'地點搜尋失敗，請稍後再試')}
finally{$('placeGo').disabled=false;$('placeGo').textContent='用這裡'}}
$('placeForm').addEventListener('submit',e=>{e.preventDefault();usePlace($('placeInput').value)});
$('locate').onclick=()=>locate(false);
// If location was already allowed before, locate automatically.
try{navigator.permissions&&navigator.permissions.query({name:'geolocation'}).then(r=>{if(r.state==='granted')locate(true)}).catch(()=>{})}catch{}
$('about').onclick=()=>sheet('<h2 class="sheet-head">吃點可愛的 ☺</h2><div class="sheet-block">① 按「用我的位置找吃的」允許定位。<br>② 選心情或輸入想吃的，再選步行／騎機車／開車與時間。<br>③ 按「到 Google Maps 找附近」，看真實店家的照片、星數、評論。<br>④ 下方「附近的口袋收藏」只列出你 Google「想去的地點」中，在時間內到得了的店，可直接導航。</div><div class="sheet-block"><b>小提醒</b><br>收藏清單不會自動同步，新增收藏後需要更新網站。距離是直線粗估，實際路程以 Google Maps 為準。<br>想放到手機桌面：用瀏覽器選單的「加入主畫面」。</div>');
render();

// Gentle feedback; motion can be disabled and respects system reduced-motion.
let motionOn=true;try{motionOn=localStorage.getItem('pocket-motion')!=='off'}catch{}
function motionEnabled(){return motionOn&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
function syncMotion(){document.body.classList.toggle('quiet-motion',!motionOn);$('motionToggle').setAttribute('aria-pressed',String(motionOn));$('motionToggle').setAttribute('aria-label',motionOn?'關閉小動畫':'開啟小動畫');$('motionToggle').textContent=motionOn?'✦':'☾'}
function sprinkles(x,y,heart=false){if(!motionEnabled())return;for(let i=0;i<7;i++){const e=document.createElement('span');e.className='sprinkle';e.textContent=heart?['♥','♡','✧'][i%3]:['✦','✿','·'][i%3];e.style.left=x+'px';e.style.top=y+'px';e.style.setProperty('--dx',((i-3)*17)+'px');e.style.setProperty('--dy',(-35-Math.random()*50)+'px');e.style.setProperty('--rot',((i-3)*25)+'deg');e.style.color=['#e06495','#b76b9b','#ee96b4'][i%3];document.body.appendChild(e);e.addEventListener('animationend',()=>e.remove(),{once:true});setTimeout(()=>e.remove(),1100)}}
$('motionToggle').onclick=()=>{motionOn=!motionOn;syncMotion();try{localStorage.setItem('pocket-motion',motionOn?'on':'off')}catch{}toast(motionOn?'小動畫開啟 ✦':'小動畫已關閉，安靜找吃的')};
const FACES=[['happy','嘿嘿～被你發現了 ♡'],['wink','偷偷告訴你，附近有好吃的 😉'],['love','最喜歡吃飯了 ♡♡'],['wow','哇！肚子咕嚕叫了！']];let faceTimer,lastFace=-1;
['happy','wink','love','wow'].forEach(f=>{const i=new Image();i.src='elephant-'+f+'.svg?v=10'});
$('petBun').onclick=e=>{let n;do{n=Math.floor(Math.random()*FACES.length)}while(n===lastFace);lastFace=n;const img=$('petBun').querySelector('.ellie');img.src='elephant-'+FACES[n][0]+'.svg?v=10';clearTimeout(faceTimer);faceTimer=setTimeout(()=>{img.src='elephant.svg?v=5'},1600);sprinkles(e.clientX,e.clientY,true);$('petBun').classList.remove('boop');void $('petBun').offsetWidth;if(motionEnabled())$('petBun').classList.add('boop');toast(FACES[n][1])};
document.addEventListener('click',e=>{const b=e.target.closest('[data-cat], [data-mode]');if(b){let r=b.getBoundingClientRect();sprinkles(r.left+r.width/2,r.top+r.height/2,false)}});
syncMotion();
