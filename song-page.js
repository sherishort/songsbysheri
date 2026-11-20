// Song pages (/songs/<id>) and the Listing Songs page (/listings): player,
// heart, share buttons, print and kind words for each [data-song] on the page.
// Plays, hearts and kind words use the same private /api endpoints as the home page.
(function(){
  var songs = [].slice.call(document.querySelectorAll('[data-song]'));
  if (!songs.length) return;

  var store = {
    get: function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set: function(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  };
  var isOwner = store.get('sbs-owner') === '1';
  var players = [];
  var commentsReq = location.protocol === 'file:' ? Promise.resolve({}) :
    fetch('/api/comments', { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; });

  songs.forEach(function(page){
  var id = page.dataset.id, title = page.dataset.title, url = page.dataset.url;
  var plainTitle = (function(){ var d = document.createElement('div'); d.innerHTML = title; return d.textContent; })();
  var record = function(type){
    if (isOwner || location.protocol === 'file:') return;
    try {
      fetch('/api/count', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ song: id, type: type }), keepalive: true
      }).catch(function(){});
    } catch(e){}
  };

  // ── Player ──
  var box = page.querySelector('.sp-player');
  var btn = box.querySelector('.play'), seek = box.querySelector('.seek');
  var cur = box.querySelector('.cur'), dur = box.querySelector('.dur');
  var audio = new Audio();
  players.push(audio);
  audio.preload = 'metadata';
  audio.src = page.dataset.src;
  var dragging = false, played = false;
  var clock = function(s){
    if (!isFinite(s) || s < 0) return '—:—';
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  var paint = function(f){
    var pct = (f * 100).toFixed(2) + '%';
    box.style.setProperty('--p', pct); seek.style.setProperty('--p', pct);
  };
  audio.addEventListener('loadedmetadata', function(){ dur.textContent = clock(audio.duration); });
  audio.addEventListener('timeupdate', function(){
    if (dragging) return;
    var d = audio.duration;
    cur.textContent = clock(audio.currentTime);
    if (isFinite(d) && d > 0){ seek.value = Math.round(audio.currentTime / d * 1000); paint(audio.currentTime / d); }
  });
  audio.addEventListener('play', function(){
    players.forEach(function(o){ if (o !== audio && !o.paused) o.pause(); });
    box.classList.add('is-live', 'is-playing');
    btn.setAttribute('aria-label', 'Pause ' + plainTitle);
    if (!played){ played = true; record('play'); }
  });
  audio.addEventListener('pause', function(){
    box.classList.remove('is-playing');
    btn.setAttribute('aria-label', 'Play ' + plainTitle);
  });
  audio.addEventListener('ended', function(){
    box.classList.remove('is-playing', 'is-live');
    seek.value = 0; cur.textContent = '0:00'; paint(0);
  });
  audio.addEventListener('error', function(){
    dur.textContent = '—:—'; btn.disabled = true;
    btn.setAttribute('aria-label', plainTitle + ' could not be loaded');
  });
  btn.addEventListener('click', function(){
    if (audio.paused){ var p = audio.play(); if (p && p.catch) p.catch(function(){}); }
    else audio.pause();
  });
  seek.addEventListener('pointerdown', function(){ dragging = true; });
  seek.addEventListener('input', function(){
    var d = audio.duration;
    if (!isFinite(d) || d <= 0) return;
    cur.textContent = clock(seek.value / 1000 * d); paint(seek.value / 1000);
  });
  var commit = function(){
    var d = audio.duration;
    if (isFinite(d) && d > 0) audio.currentTime = seek.value / 1000 * d;
    dragging = false;
  };
  seek.addEventListener('change', commit);
  seek.addEventListener('pointerup', commit);
  seek.addEventListener('keyup', commit);

  // ── Heart ──
  var heart = box.querySelector('.heart');
  var hearts = {};
  try { hearts = JSON.parse(store.get('sbs-hearts') || '{}') || {}; } catch(e){ hearts = {}; }
  var showHeart = function(on){
    heart.setAttribute('aria-pressed', on ? 'true' : 'false');
    heart.setAttribute('aria-label', (on ? 'You love ' : 'Love ') + plainTitle);
  };
  showHeart(!!hearts[id]);
  heart.addEventListener('click', function(){
    var on = !hearts[id];
    if (on) hearts[id] = 1; else delete hearts[id];
    store.set('sbs-hearts', JSON.stringify(hearts));
    showHeart(on);
    heart.classList.remove('pop');
    if (on){ void heart.offsetWidth; heart.classList.add('pop'); }
    record(on ? 'heart' : 'unheart');
  });

  // ── Share ──
  var flash = function(el, text){
    var label = el.querySelector('span'), was = label.textContent;
    label.textContent = text; el.classList.add('done');
    setTimeout(function(){ label.textContent = was; el.classList.remove('done'); }, 1800);
  };
  var native = page.querySelector('.sp-native');
  if (native && navigator.share){
    native.hidden = false;
    native.addEventListener('click', function(){
      navigator.share({ title: plainTitle + ' — Songs by Sheri', text: 'Listen to "' + plainTitle + '" by Sheryl Denise Long', url: url }).catch(function(){});
    });
  }
  var copy = page.querySelector('.sp-copy');
  if (copy) copy.addEventListener('click', function(){
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){ flash(copy, 'Link copied'); }, function(){ window.prompt('Copy this link:', url); });
    } else window.prompt('Copy this link:', url);
  });

  // ── Print ──
  var print = page.querySelector('.sp-print');
  if (print) print.addEventListener('click', function(){ window.print(); });

  // ── Kind words ──
  var kind = page.querySelector('.kind');
  var list = kind.querySelector('.kind-list'), empty = kind.querySelector('.sp-kind-empty');
  var form = kind.querySelector('form'), send = form.querySelector('button');
  var fmtDate = function(iso){
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }); }
    catch(e){ return ''; }
  };
  commentsReq.then(function(bySong){
    var items = (bySong && bySong[id]) || [];
    if (!items.length){ empty.hidden = false; return; }
    var sum = kind.querySelector('summary');
    if (sum) sum.textContent = 'Kind words (' + items.length + ')';
    items.forEach(function(c){
      var li = document.createElement('li');
      var m = document.createElement('p'); m.className = 'msg'; m.textContent = c.message;
      var w = document.createElement('p'); w.className = 'who'; w.textContent = '— ' + c.name + (c.created ? ', ' + fmtDate(c.created) : '');
      li.appendChild(m); li.appendChild(w); list.appendChild(li);
    });
    list.hidden = false;
  });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var f = form.elements;
    var name = f['name'].value.trim(), message = f['message'].value.trim();
    if (!name){ f['name'].focus(); return; }
    if (!message){ f['message'].focus(); return; }
    send.disabled = true; send.textContent = 'Sending…';
    fetch('/api/comments', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ song: id, name: name, message: message, website: f['website'].value })
    }).then(function(r){
      if (!r.ok) throw new Error();
      var p = document.createElement('p');
      p.className = 'kind-thanks'; p.setAttribute('role', 'status');
      p.textContent = 'Thank you, ' + name + '! Sheri will read your kind word soon.';
      form.replaceWith(p);
    }).catch(function(){
      send.disabled = false; send.textContent = 'Send';
      form.querySelector('.left').textContent = 'That didn’t send. Please try again in a moment.';
    });
  });
  });

  // Listing Songs page opened at /listings#<id>: go to that song and light it up.
  var target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target && target.classList.contains('ls-item')){
    var go = function(){ target.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    go();
    target.classList.add('is-shared');
    window.addEventListener('load', go);
  }
})();
