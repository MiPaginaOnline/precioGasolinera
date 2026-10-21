/* Añadir a la pantalla de inicio · Gasolina barata (Surtidor)
   1) Aviso que sale 10 s después de entrar en la web.
   2) Botón permanente entre "Comparador gratuito de carburantes" y el título de la página.
   Todo se inyecta solo (CSS + HTML incluidos): no hay que tocar nada más del index.html. */
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

  /* ---------- ya instalada (abierta desde el icono): no hacemos nada ---------- */
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;

  /* ---------- service worker (necesario para que Chrome ofrezca instalar) ---------- */
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------- ¿el aviso flotante puede salir? (el botón fijo sale siempre) ---------- */
  const saved = store.get();
  const ts = parseInt(saved || '0', 10);
  const bannerAllowed = saved !== 'done' && !(ts && Date.now() - ts < SNOOZE_DAYS * 864e5);

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isTouch = matchMedia('(pointer:coarse)').matches;

  let deferred = null, timerDone = false, bannerShown = false, el = null, wrap = null;

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; maybeShow(); });
  addEventListener('appinstalled', () => { store.set('done'); track('pwa_instalada'); hide(); removeButton(); });
  if (bannerAllowed) setTimeout(() => { timerDone = true; maybeShow(); }, DELAY_MS);

  function maybeShow() {
    if (!bannerAllowed || bannerShown || el || !timerDone) return;
    if (!deferred && !isIOS) return;     // el navegador no permite instalar: no mostramos el aviso
    bannerShown = true;
    build();
  }

  /* ---------- iconos ---------- */
  /* surtidor de gasolina con el símbolo € en la pantalla */
  const PUMP = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect x="3" y="2.5" width="11" height="17.5" rx="2.2" fill="#fff"/>' +
    '<rect x="5.4" y="4.9" width="6.2" height="5.4" rx="1.1" fill="#0fb05c"/>' +
    '<text x="8.5" y="9.2" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-weight="800" font-size="5.2" fill="#fff">€</text>' +
    '<rect x="1.8" y="19.4" width="13.4" height="2.4" rx="1.2" fill="#fff"/>' +
    '<path d="M14 7.2h2.1a1.9 1.9 0 0 1 1.9 1.9v6.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="16.6" y="15.2" width="3" height="3.8" rx="1.1" fill="#fff"/></svg>';
  const SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';

  const steps = list => '<ul class="steps">' + list.map((t, i) => '<li><i>' + (i + 1) + '</i><span>' + t + '</span></li>').join('') + '</ul>';

  /* pasos según el navegador, para cuando no se puede instalar con un solo toque */
  function helpHTML() {
    if (isIOS) return steps(['Toca <b>Compartir</b> ' + SHARE + ' en la barra del navegador', 'Elige <b>«Añadir a pantalla de inicio»</b>']);
    if (isAndroid) return steps(['Toca el menú <b>⋮</b> de tu navegador', 'Elige <b>«Añadir a pantalla de inicio»</b> o <b>«Instalar aplicación»</b>']);
    return steps(['Busca el icono de <b>instalar</b> a la derecha de la barra de direcciones', 'O abre el menú <b>⋮</b> y elige <b>«Instalar Surtidor»</b>']);
  }

  /* ---------- estilos ---------- */
  const CSS = `
#a2hs{position:fixed;left:50%;top:max(66px,calc(env(safe-area-inset-top) + 10px));z-index:2500;width:min(430px,calc(100vw - 24px));
  box-sizing:border-box;padding:18px 18px 10px;border-radius:20px;background:#fff;color:#16212c;overflow:hidden;
  font-family:'Schibsted Grotesk',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;
  box-shadow:0 18px 50px rgba(22,33,44,.38),0 0 0 1px rgba(22,33,44,.1);
  transform:translate(-50%,-170%);opacity:0;transition:transform .55s cubic-bezier(.2,.9,.25,1.05),opacity .35s ease}
#a2hs.show{transform:translate(-50%,0);opacity:1}
#a2hs::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#0fb05c 0%,#ffa300 50%,#e2202d 100%)}
#a2hs *{box-sizing:border-box}
#a2hs .row{display:flex;gap:14px;align-items:center;padding-right:22px}
#a2hs .ic{flex:none;width:62px;height:62px;border-radius:16px;background:#0fb05c;display:grid;place-items:center;box-shadow:0 4px 12px rgba(15,176,92,.45)}
#a2hs .ic svg{width:40px;height:40px}
#a2hs strong{display:block;margin:0 0 4px;font-size:18px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
#a2hs p{margin:0;font-size:14px;line-height:1.45;color:#566370}
#a2hs p b{color:#16212c;font-weight:700}
#a2hs .x{position:absolute;top:12px;right:8px;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#7b8791;font-size:22px;line-height:1;cursor:pointer}
#a2hs .x:hover{background:#f2f4f6;color:#16212c}
#a2hs .go{display:block;width:100%;height:50px;margin-top:16px;border:0;border-radius:13px;background:#0fb05c;color:#04210f;font:inherit;font-weight:800;font-size:16px;cursor:pointer;
  animation:a2pulse 2.4s ease-out 1.2s infinite}
#a2hs .go:hover{background:#13c869}
#a2hs .foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:2px}
#a2hs .fine{font-size:12.5px;color:#566370}
#a2hs .later{padding:10px 4px 10px 12px;border:0;background:none;color:#566370;font:inherit;font-weight:600;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
#a2hs .later:hover{color:#16212c}
#a2hs :focus-visible,.a2-wrap :focus-visible{outline:3px solid #2b6cff;outline-offset:2px}
.steps{margin:2px 0 0;padding:0;list-style:none;font-size:14px;line-height:1.5;color:#566370}
.steps li{display:flex;gap:9px;align-items:center;margin-top:7px}
.steps i{flex:none;width:22px;height:22px;border-radius:50%;background:#16212c;color:#fff;font-style:normal;font-weight:800;font-size:12.5px;display:grid;place-items:center}
.steps b{color:#16212c}
.steps svg{width:17px;height:17px;vertical-align:-3px;margin:0 2px;color:#16212c}
@keyframes a2pulse{0%{box-shadow:0 0 0 0 rgba(15,176,92,.55)}70%,100%{box-shadow:0 0 0 14px rgba(15,176,92,0)}}

/* botón permanente */
.a2-wrap{margin:2px 0 20px}
.a2-btn{display:inline-flex;align-items:center;gap:11px;min-height:50px;max-width:100%;padding:6px 22px 6px 8px;border:0;border-radius:999px;background:#0fb05c;color:#04210f;
  font:inherit;font-weight:800;font-size:15.5px;line-height:1.2;text-align:left;cursor:pointer;box-shadow:0 6px 16px rgba(15,176,92,.35);transition:background .15s,transform .15s}
.a2-btn:hover{background:#13c869;transform:translateY(-1px)}
.a2-btn:active{transform:none}
.a2-btn svg{flex:none;width:36px;height:36px;padding:6px;border-radius:50%;background:#0b8f4a}
.a2-help{max-width:430px;margin-top:12px;padding:12px 14px 14px;border:1px solid #e2e7ec;border-radius:14px;background:#fafbfc}
.a2-help[hidden]{display:none}
.a2-help .t{margin:0 0 4px;font-size:14px;font-weight:800;color:#16212c}
@media (prefers-reduced-motion:reduce){#a2hs{transition:opacity .2s}#a2hs .go{animation:none}.a2-btn{transition:none}}
`;
  let cssDone = false;
  function addCSS() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  }

  /* ---------- botón permanente ---------- */
  function mountButton() {
    const kicker = document.querySelector('#seoContent .seo-kicker');
    if (!kicker || wrap) return;
    addCSS();
    wrap = document.createElement('div');
    wrap.className = 'a2-wrap';
    wrap.innerHTML =
      '<button type="button" class="a2-btn" id="a2hsBtn" aria-expanded="false" aria-controls="a2hsHelp">' + PUMP + '<span>Añadir a mi pantalla de inicio</span></button>' +
      '<div class="a2-help" id="a2hsHelp" hidden></div>';
    kicker.insertAdjacentElement('afterend', wrap);
    wrap.querySelector('.a2-btn').addEventListener('click', onButton);
  }
  function removeButton() { if (wrap) { wrap.remove(); wrap = null; } }

  function onButton() {
    track('pwa_boton_fijo');
    if (deferred) { install(); return; }              // Chrome/Android/PC: instalación directa
    const help = wrap.querySelector('.a2-help'), b = wrap.querySelector('.a2-btn');
    const open = help.hidden;                          // si no se puede directo, enseñamos los pasos
    help.innerHTML = open ? '<p class="t">Solo 2 pasos:</p>' + helpHTML() : '';
    help.hidden = !open;
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---------- aviso flotante ---------- */
  function build() {
    addCSS();
    const title = 'Echa siempre la gasolina más barata';
    const txt = 'Guarda esta web en tu móvil como una app y mira <b>qué gasolinera te sale más barata</b> antes de echar.';
    const btn = isIOS ? 'Cómo añadirla a mi móvil' : (isTouch ? 'Añadir a mi móvil' : 'Instalar la app');

    el = document.createElement('div');
    el.id = 'a2hs';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'a2hsT');
    el.setAttribute('aria-describedby', 'a2hsD');
    el.innerHTML =
      '<button type="button" class="x" aria-label="Cerrar">×</button>' +
      '<div class="row"><div class="ic">' + PUMP + '</div>' +
      '<div><strong id="a2hsT">' + title + '</strong><div id="a2hsD"><p>' + txt + '</p></div></div></div>' +
      '<button type="button" class="go">' + btn + '</button>' +
      '<div class="foot"><span class="fine">Gratis · Sin descargar nada</span>' +
      '<button type="button" class="later">Ahora no</button></div>';
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
    const d = deferred;
    d.prompt();
    let outcome = 'dismissed';
    try { outcome = (await d.userChoice).outcome; } catch (e) {}
    deferred = null;
    if (outcome === 'accepted') { store.set('done'); track('pwa_instalar_aceptado'); removeButton(); }
    else { store.set(String(Date.now())); track('pwa_instalar_rechazado'); }
    hide();
  }

  function showIOSSteps(go) {
    el.querySelector('#a2hsD').innerHTML = steps([
      'Toca <b>Compartir</b> ' + SHARE + ' en la barra del navegador',
      'Elige <b>«Añadir a pantalla de inicio»</b>'
    ]);
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

  /* ---------- arranque del botón fijo ---------- */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountButton);
  else mountButton();
})();
