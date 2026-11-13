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

function render(){const M=MODES[mode],minutes=+$('minutes').value;
$('timeLabel').textContent=M.emoji+' '+M.name+'時間';
$('goWhat').textContent=$('query').value.trim()?'「'+$('query').value.trim()+'」':categoryLabel;
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
function openMaps(){window.open(mapsSearchUrl(searchTerm()),'_blank','noopener');if(!position)toast('小提醒：先定位，地圖會更準喔')}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();openMaps()});$('goMaps').onclick=openMaps;
$('savedNear').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.range){$('minutes').value=b.dataset.range;render();toast('放寬到 '+b.dataset.range+' 分鐘')}else if(b.dataset.modeSwitch){setMode(b.dataset.modeSwitch);toast('改用'+MODES[mode].name+'，再找找看 '+MODES[mode].emoji)}});
function goSaved(){$('savedNear').scrollIntoView({behavior:motionEnabled()?'smooth':'instant',block:'start'});$('explore').classList.remove('selected');$('bottomSaved').classList.add('selected')}
$('saved').onclick=goSaved;$('bottomSaved').onclick=goSaved;$('explore').onclick=()=>{window.scrollTo({top:0,behavior:motionEnabled()?'smooth':'instant'});$('explore').classList.add('selected');$('bottomSaved').classList.remove('selected')};
function sheet(html){$('sheetContent').innerHTML=html;$('sheet').showModal()}
$('closeSheet').onclick=()=>$('sheet').close();$('sheet').addEventListener('click',e=>{if(e.target===$('sheet')){const r=$('sheet').getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)$('sheet').close()}});
function locate(silent){if(!navigator.geolocation){toast('這個瀏覽器不支援定位，請用手機瀏覽器開啟');return}$('locationTitle').textContent='正在找你的位置…';$('locate').disabled=true;navigator.geolocation.getCurrentPosition(p=>{position={latitude:p.coords.latitude,longitude:p.coords.longitude};$('locationTitle').textContent='定位成功 ♡';$('locationText').textContent='點一下可以重新定位';$('locate').disabled=false;render();if(!silent)toast('定位成功！看看附近有沒有你收藏的店')},e=>{$('locationTitle').textContent='定位未成功，點我重試';$('locationText').textContent=e.code===1?'請在瀏覽器設定允許定位，再試一次':'請確認 GPS 與網路後再試';$('locate').disabled=false;if(!silent)toast('沒拿到位置，不會猜測你的所在地')},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
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
$('petBun').onclick=e=>{sprinkles(e.clientX,e.clientY,true);$('petBun').classList.remove('boop');void $('petBun').offsetWidth;if(motionEnabled())$('petBun').classList.add('boop');toast(['今天也要好好吃飯 ♡','讓小象陪你找點快樂！','肚子說：可以開飯了～'][Math.floor(Math.random()*3)])};
document.addEventListener('click',e=>{const b=e.target.closest('[data-cat], [data-mode]');if(b){let r=b.getBoundingClientRect();sprinkles(r.left+r.width/2,r.top+r.height/2,false)}});
syncMotion();
