// In-page Google map sheet: shop buttons open an embedded map instead of jumping to the Maps app.
// Loaded after app.js (uses its globals: position, mode, MODES, lastResults, SAVED, loadPlaces, ...).
(function () {
  const $e = id => document.getElementById(id);
  let mapsReady = null, map = null, markers = [], line = null;

  // ---------- overlay shell ----------
  const ov = document.createElement('div');
  ov.id = 'mapSheet';
  ov.innerHTML =
    '<div class="ms-back"></div>' +
    '<div class="ms-panel" role="dialog" aria-label="地圖">' +
    '  <div class="ms-handle"></div>' +
    '  <div class="ms-head"><b id="msTitle">地圖</b><button id="msClose" aria-label="關閉">×</button></div>' +
    '  <div class="ms-map" id="msMap"></div>' +
    '  <div class="ms-card" id="msCard"></div>' +
    '</div>';
  document.body.appendChild(ov);
  const close = () => ov.classList.remove('on');
  $e('msClose').onclick = close;
  ov.querySelector('.ms-back').onclick = close;

  function ensureMaps() {
    if (!mapsReady) mapsReady = loadPlaces().then(() => Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')]));
    return mapsReady;
  }
  function pin(html, cls) { const d = document.createElement('div'); d.className = 'ms-pin ' + (cls || ''); d.innerHTML = html; return d; }
  function clearMap() { markers.forEach(m => m.map = null); markers = []; if (line) { line.setMap(null); line = null; } }

  async function openMap(title, places, focus) {
    $e('msTitle').textContent = title;
    $e('msCard').innerHTML = '<p class="ms-loading">小象正在打開地圖…</p>';
    ov.classList.add('on');
    try {
      const [{ Map, Polyline }, { AdvancedMarkerElement }] = await ensureMaps();
      if (!map) map = new Map($e('msMap'), { mapId: 'DEMO_MAP_ID', disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false });
      clearMap();
      const bounds = new google.maps.LatLngBounds();
      if (position) {
        const me = { lat: position.latitude, lng: position.longitude };
        markers.push(new AdvancedMarkerElement({ map, position: me, content: pin('📍<span>你在這</span>', 'me'), zIndex: 5 }));
        bounds.extend(me);
      }
      places.forEach(p => {
        const at = { lat: p.lat, lng: p.lng };
        const m = new AdvancedMarkerElement({ map, position: at, content: pin((p.emoji || '🍽️') + '<span>' + esc(shortName(p.name)) + '</span>', p === focus ? 'focus' : ''), zIndex: p === focus ? 9 : 1 });
        m.addListener('click', () => select(p, places));
        markers.push(m); bounds.extend(at);
      });
      if (places.length === 1 && !position) { map.setCenter({ lat: places[0].lat, lng: places[0].lng }); map.setZoom(16); }
      else map.fitBounds(bounds, 60);
      select(focus || places[0], places);
    } catch (e) {
      $e('msCard').innerHTML = '<p class="ms-loading">地圖暫時打不開：' + esc(e.message || '') + '</p>';
    }
  }

  function shortName(n) { return n.length > 9 ? n.slice(0, 8) + '…' : n; }

  async function select(p, places) {
    const { Polyline } = await ensureMaps().then(r => r[0]);
    markers.forEach(m => { const c = m.content; if (c && !c.classList.contains('me')) c.classList.toggle('focus', c.textContent.includes(shortName(p.name))); });
    if (line) line.setMap(null);
    if (position) {
      line = new Polyline({ map, path: [{ lat: position.latitude, lng: position.longitude }, { lat: p.lat, lng: p.lng }], strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: '#c64d7f', scale: 3 }, offset: '0', repeat: '14px' }] });
    }
    const M = MODES[mode], min = position ? minutesTo(p) : null;
    const stars = p.rating ? '<span class="stars" style="--r:' + p.rating + '">★★★★★</span> <b>' + p.rating.toFixed(1) + '</b> <small>(' + (p.count || 0).toLocaleString() + ')</small>' : '';
    const chips = [p.priceText ? '💰 ' + p.priceText : '', p.today ? '🕒 ' + p.today : '', min != null ? M.emoji + ' 約 ' + min + ' 分鐘' : ''].filter(Boolean).map(t => '<span class="chip">' + esc(t) + '</span>').join('');
    const dishes = (p.dishes || []).length ? '<div class="hot"><span>🔥 人氣美食</span>' + p.dishes.map(d => '<b>' + esc(d) + '</b>').join('') + '</div>' : '';
    const page = p.url || placeUrl(p), nav = p.id ? navUrl(p) : dirUrl(p);
    $e('msCard').innerHTML =
      '<div class="ms-info">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="">' : '<div class="ms-emoji">' + (p.emoji || '🍽️') + '</div>') +
      '<div><h3>' + esc(p.name) + '</h3><div class="ms-stars">' + stars + '</div></div></div>' +
      '<div class="chips">' + chips + '</div>' + dishes +
      '<div class="actions"><a href="' + esc(page) + '" target="_blank" rel="noopener">📋 菜單・評論</a><a class="go" href="' + esc(nav) + '" target="_blank" rel="noopener">🧭 開始導航</a></div>' +
      (places.length > 1 ? '<p class="ms-tip">點地圖上的其他圖釘，可以切換店家 ♡</p>' : '<p class="ms-tip">可以拖曳、縮放地圖；要語音導航再按「開始導航」</p>');
  }

  // ---------- hook the existing buttons ----------
  function resultFromCard(card) {
    const name = card.querySelector('h3') && card.querySelector('h3').textContent;
    return lastResults && lastResults.list.find(r => r.name === name);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('#results .card .actions a');
    if (a) {
      const card = a.closest('.card'), r = resultFromCard(card); if (!r) return;
      e.preventDefault(); openMap(r.name, [r], r); return;
    }
    const s = e.target.closest('#savedNear .saved-actions a');
    if (s) {
      const name = s.closest('.saved-row').querySelector('strong').textContent, p = SAVED.find(x => x.name === name);
      if (!p || p.lat == null) return;
      e.preventDefault(); openMap(p.name, [p], p);
    }
  }, true);

  // "看地圖" button above results: all shops on one map
  const obs = new MutationObserver(() => {
    const head = document.querySelector('#results .step-label');
    if (head && !head.querySelector('.ms-all') && lastResults) {
      const b = document.createElement('button'); b.className = 'ms-all'; b.textContent = '🗺️ 地圖模式';
      b.onclick = () => {
        const M = MODES[mode], minutes = +$e('minutes').value;
        const list = lastResults.list.map(r => ({ ...r, min: minutesTo(r) })).filter(r => r.min <= minutes && r.open === true).sort((a, b) => a.min - b.min);
        if (!list.length) { toast('目前範圍內沒有營業中的店'); return; }
        openMap('附近營業中 ' + list.length + ' 家', list, list[0]);
      };
      head.appendChild(b);
    }
  });
  obs.observe($e('results'), { childList: true, subtree: true });

})();
