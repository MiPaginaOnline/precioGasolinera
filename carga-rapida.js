/* Surtidor · carga rápida de precios
   Se pone en el <head>, ANTES del resto de scripts. No hace falta tocar nada más de la página.

   Qué hace:
   1) Guarda en el móvil la última lista de precios. La próxima vez que entres, el mapa sale
      al instante con esos datos y por detrás se descargan los nuevos (y se actualiza solo).
   2) Si no hay datos guardados, no espera a que falle una fuente para probar la siguiente:
      lanza la oficial y, si en 2,5 s no ha contestado, va añadiendo las alternativas.
      Gana la primera que responda bien y se cancelan las demás. */
(() => {
  'use strict';

  const MATCH = 'ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres';
  const API = 'https://energia.serviciosmin.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
  const API_OLD = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

  const MAX_AGE = 3 * 3600e3;   // usamos datos guardados si tienen menos de 3 h
  const STAGGER = 2500;         // cada cuántos ms añadimos otra fuente si nadie ha contestado
  const TIMEOUT = 30000;        // máximo por fuente

  if (!window.fetch) return;
  const nativeFetch = window.fetch.bind(window);

  /* conexión anticipada al servidor oficial (ahorra unos cientos de ms) */
  try {
    [API, 'https://corsproxy.io'].forEach(u => {
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = new URL(u).origin; l.crossOrigin = '';
      document.head.appendChild(l);
    });
  } catch (e) {}

  /* ---------- caché en IndexedDB (aguanta decenas de MB, a diferencia de localStorage) ---------- */
  const DB = 'surtidor_cache', STORE = 'k', KEY = 'precios';
  const openDB = () => new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = r.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
  async function getCache() {
    const db = await openDB(); if (!db) return null;
    return new Promise(res => {
      try {
        const rq = db.transaction(STORE).objectStore(STORE).get(KEY);
        rq.onsuccess = () => res(rq.result || null);
        rq.onerror = () => res(null);
      } catch (e) { res(null); }
    });
  }
  async function setCache(text) {
    const db = await openDB(); if (!db) return;
    try { db.transaction(STORE, 'readwrite').objectStore(STORE).put({ t: Date.now(), text }, KEY); } catch (e) {}
  }

  /* ---------- descarga: varias fuentes escalonadas, gana la primera buena ---------- */
  const bust = () => '?_=' + Date.now();
  const sources = () => [
    API,
    'https://corsproxy.io/?url=' + encodeURIComponent(API + bust()),
    API_OLD,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(API + bust()),
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(API + bust())
  ];
  const valid = t => typeof t === 'string' && t.length > 100000 && t.slice(0, 2000).indexOf('ListaEESSPrecio') > -1;

  let inflight = null;
  function race() {
    if (inflight) return inflight;
    inflight = new Promise((resolve, reject) => {
      const urls = sources(), ctrls = [];
      let started = 0, failed = 0, done = false, timer = null;
      const kick = () => {
        if (done || started >= urls.length) return;
        const i = started++, c = new AbortController(), to = setTimeout(() => c.abort(), TIMEOUT);
        ctrls.push(c);
        nativeFetch(urls[i], { signal: c.signal, cache: 'no-store', headers: { Accept: 'application/json' } })
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
          .then(t => {
            if (!valid(t)) throw new Error('Respuesta incompleta');
            if (done) return;
            done = true; clearTimeout(timer);
            ctrls.forEach(x => { if (x !== c) { try { x.abort(); } catch (e) {} } });
            resolve(t);
          })
          .catch(() => {
            if (done) return;
            failed++;
            if (failed >= urls.length) { done = true; clearTimeout(timer); reject(new Error('Sin respuesta')); return; }
            clearTimeout(timer); kick();               // una ha fallado: lanzamos la siguiente ya
          })
          .finally(() => clearTimeout(to));
        clearTimeout(timer);
        if (started < urls.length) timer = setTimeout(kick, STAGGER);
      };
      kick();
    }).finally(() => { inflight = null; });
    return inflight;
  }

  /* ---------- aplicar datos nuevos cuando ya se mostró la caché ---------- */
  function applyFresh() {
    // reutilizamos el botón "Actualizar" de la propia página; callamos el aviso para no molestar
    const st = document.createElement('style');
    st.textContent = '#toast{display:none!important}';
    let tries = 0;
    const t = setInterval(() => {
      const b = document.getElementById('refreshBtn');
      if (b && !b.disabled) {
        clearInterval(t);
        document.head.appendChild(st);
        b.click();
        setTimeout(() => st.remove(), 8000);
      } else if (++tries > 40) clearInterval(t);       // 40 × 300 ms = 12 s
    }, 300);
  }

  /* ---------- sustituimos fetch SOLO para la petición de precios ---------- */
  let cold = true, mem = null, memT = 0;
  const reply = text => new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(MATCH) === -1) return nativeFetch(input, init);

    const first = cold; cold = false;

    // acabamos de descargarlo (p. ej. justo tras mostrar la caché): lo reutilizamos
    if (mem && Date.now() - memT < 60000) return Promise.resolve(reply(mem));

    const download = () => race().then(t => { mem = t; memT = Date.now(); setCache(t); return t; });

    if (!first) return download().then(reply);

    return getCache().then(c => {
      if (c && c.text && Date.now() - c.t < MAX_AGE) {
        // 1) enseñamos ya lo guardado  2) descargamos lo nuevo por detrás
        download().then(t => { if (t !== c.text) applyFresh(); }).catch(() => {});
        return reply(c.text);
      }
      return download().then(reply);
    });
  };
})();
