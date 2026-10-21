/* Surtidor · aviso "Añadir a la pantalla de inicio"
   Aparece 10 s después de entrar en la web. Se inyecta solo (CSS + HTML incluidos). */
(() => {
  'use strict';

  const DELAY_MS = 10000;          // 10 segundos
  const SNOOZE_DAYS = 7;           // si pulsa "Ahora no", no volvemos a molestar en 7 días
  const KEY = 'surtidor_a2hs';

  /* ---------- almacenamiento (puede fallar en navegación privada) ---------- */
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  };
  const track = n => { try { if (window.gtag) window.gtag('event', n); } catch (e) {} };

  /* ---------- ya instalada: no hacemos nada ---------- */
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;

  /* ---------- service worker (necesario para que Chrome ofrezca instalar) ---------- */
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------- ¿ya la instaló o la descartó hace poco? ---------- */
  const saved = store.get();
  if (saved === 'done') return;
  const ts = parseInt(saved || '0', 10);
  if (ts && Date.now() - ts < SNOOZE_DAYS * 864e5) return;

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTouch = matchMedia('(pointer:coarse)').matches;

  let deferred = null, timerDone = false, el = null;

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; maybeShow(); });
  addEventListener('appinstalled', () => { store.set('done'); track('pwa_instalada'); hide(); });
  setTimeout(() => { timerDone = true; maybeShow(); }, DELAY_MS);

  function maybeShow() {
    if (el || !timerDone) return;
    if (!deferred && !isIOS) return;     // el navegador no permite instalar: no mostramos nada
    build();
  }

  /* ---------- estilos ---------- */
  const CSS = `
#a2hs{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));z-index:2500;width:min(420px,calc(100vw - 24px));
  box-sizing:border-box;padding:18px 18px 12px;border-radius:20px;background:#16212c;color:#fff;overflow:hidden;
  font-family:'Schibsted Grotesk',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;
  box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08);
  transform:translate(-50%,160%);opacity:0;transition:transform .55s cubic-bezier(.2,.9,.25,1.05),opacity .35s ease}
#a2hs.show{transform:translate(-50%,0);opacity:1}
#a2hs::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#0fb05c 0%,#ffa300 50%,#e2202d 100%)}
#a2hs *{box-sizing:border-box}
#a2hs .row{display:flex;gap:14px;align-items:flex-start;padding-right:26px}
#a2hs .ic{flex:none;width:46px;height:46px;border-radius:13px;background:#222;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
#a2hs .ic svg{width:26px;height:26px}
#a2hs strong{display:block;margin:1px 0 4px;font-size:17px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
#a2hs p{margin:0;font-size:14px;line-height:1.45;color:#c4ccd4}
#a2hs p b{color:#fff;font-weight:700}
#a2hs .x{position:absolute;top:10px;right:10px;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#8f9aa5;font-size:22px;line-height:1;cursor:pointer}
#a2hs .x:hover{background:rgba(255,255,255,.1);color:#fff}
#a2hs .go{display:block;width:100%;height:48px;margin-top:16px;border:0;border-radius:13px;background:#0fb05c;color:#04210f;font:inherit;font-weight:800;font-size:15.5px;cursor:pointer;
  animation:a2pulse 2.4s ease-out 1.2s infinite}
#a2hs .go:hover{background:#13c869}
#a2hs .later{display:block;margin:4px auto 0;padding:10px 14px;border:0;background:none;color:#8f9aa5;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer}
#a2hs .later:hover{color:#fff}
#a2hs :focus-visible{outline:3px solid #7ab0ff;outline-offset:2px}
#a2hs .steps{margin:2px 0 0;padding:0;list-style:none;font-size:14px;line-height:1.5;color:#c4ccd4}
#a2hs .steps li{display:flex;gap:9px;align-items:center;margin-top:7px}
#a2hs .steps i{flex:none;width:22px;height:22px;border-radius:50%;background:#fff;color:#16212c;font-style:normal;font-weight:800;font-size:12.5px;display:grid;place-items:center}
#a2hs .steps svg{width:17px;height:17px;vertical-align:-3px;margin:0 2px}
@keyframes a2pulse{0%{box-shadow:0 0 0 0 rgba(15,176,92,.55)}70%,100%{box-shadow:0 0 0 14px rgba(15,176,92,0)}}
@media (prefers-reduced-motion:reduce){#a2hs{transition:opacity .2s}#a2hs .go{animation:none}}
`;

  const DROP = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="a2g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0fb05c"/><stop offset=".55" stop-color="#ffa300"/><stop offset="1" stop-color="#e2202d"/></linearGradient></defs><path fill="url(#a2g)" d="M12 2.2c-.4 0-.8.2-1 .5C8.4 6.1 5.5 9.6 5.5 14a6.5 6.5 0 0 0 13 0c0-4.4-2.9-7.9-5.5-11.3-.2-.3-.6-.5-1-.5z"/></svg>';
  const SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';

  /* ---------- construir y mostrar ---------- */
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    const title = 'Ten Surtidor a un toque';
    const txt = isTouch
      ? 'Añádelo a tu pantalla de inicio y <b>mira la gasolina más barata antes de echar</b>.'
      : 'Instálalo como app y <b>mira la gasolina más barata antes de echar</b>.';
    const btn = isIOS ? 'Cómo añadirlo' : (isTouch ? 'Añadir a pantalla de inicio' : 'Instalar Surtidor');

    el = document.createElement('div');
    el.id = 'a2hs';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'a2hsT');
    el.setAttribute('aria-describedby', 'a2hsD');
    el.innerHTML =
      '<button type="button" class="x" aria-label="Cerrar">×</button>' +
      '<div class="row"><div class="ic">' + DROP + '</div>' +
      '<div><strong id="a2hsT">' + title + '</strong><div id="a2hsD"><p>' + txt + '</p></div></div></div>' +
      '<button type="button" class="go">' + btn + '</button>' +
      '<button type="button" class="later">Ahora no</button>';
    document.body.appendChild(el);

    const go = el.querySelector('.go');
    el.querySelector('.x').addEventListener('click', snooze);
    el.querySelector('.later').addEventListener('click', snooze);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && el) snooze(); });
    go.addEventListener('click', () => (isIOS && !deferred) ? showIOSSteps(go) : install());

    requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add('show')));
    track('pwa_aviso_mostrado');
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    let outcome = 'dismissed';
    try { outcome = (await deferred.userChoice).outcome; } catch (e) {}
    deferred = null;
    if (outcome === 'accepted') { store.set('done'); track('pwa_instalar_aceptado'); }
    else { store.set(String(Date.now())); track('pwa_instalar_rechazado'); }
    hide();
  }

  function showIOSSteps(go) {
    el.querySelector('#a2hsD').innerHTML =
      '<ul class="steps">' +
      '<li><i>1</i><span>Toca <b>Compartir</b> ' + SHARE + ' en la barra del navegador</span></li>' +
      '<li><i>2</i><span>Elige <b>«Añadir a pantalla de inicio»</b></span></li>' +
      '</ul>';
    const ok = go.cloneNode(false);          // botón nuevo, sin los eventos anteriores
    ok.textContent = 'Entendido';
    ok.addEventListener('click', () => { store.set(String(Date.now())); hide(); });
    go.replaceWith(ok);
    el.querySelector('.later').style.display = 'none';
    track('pwa_instrucciones_ios');
  }

  function snooze() { store.set(String(Date.now())); track('pwa_aviso_cerrado'); hide(); }

  function hide() {
    if (!el) return;
    const n = el; el = null;
    n.classList.remove('show');
    setTimeout(() => n.remove(), 600);
  }
})();
