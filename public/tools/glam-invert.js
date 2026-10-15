/* ═══════════════════════════════════════════════════════════
   GLAM — switch de tema de color
   arriba: rojo/negro (normal) · abajo: #00E9B4 / #E64CDF / negro

   Se carga en el <head> de cada herramienta (sin defer) para que la
   clase quede puesta antes del primer pintado y no haya parpadeo.

   - html.glam-alt cambia las variables --g-* que usa la interfaz.
   - La elección se guarda en localStorage ('glam-tema') y se comparte
     entre todas las herramientas, incluido el shell de React y los
     iframes (el evento 'storage' los mantiene sincronizados).
   - Si la página tiene #master-bar, se inserta el switch vertical antes
     de los controles de ventana (— □ ✕).
   ═══════════════════════════════════════════════════════════ */
(function () {
  var CLAVE = 'glam-tema';
  var root = document.documentElement;

  function leer() {
    try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return false; }
  }
  function guardar(v) {
    try { localStorage.setItem(CLAVE, v ? '1' : '0'); } catch (e) { /* sin storage */ }
  }

  function aplicar(v) {
    root.classList.toggle('glam-alt', v);
    var sw = document.querySelectorAll('.g-inv');
    for (var i = 0; i < sw.length; i++) {
      sw[i].setAttribute('aria-checked', v ? 'true' : 'false');
      sw[i].title = v ? 'Colores originales' : 'Cambiar colores';
    }
  }

  aplicar(leer());

  window.addEventListener('storage', function (e) {
    if (e.key === CLAVE) aplicar(e.newValue === '1');
  });

  function alternar() {
    var v = !root.classList.contains('glam-alt');
    guardar(v);
    aplicar(v);
    // por si la página está dentro de un iframe del shell
    try { window.parent && window.parent !== window && window.parent.postMessage({ glamInvert: v }, '*'); } catch (e) { /* nada */ }
  }
  window.glamInvertToggle = alternar;

  // Estilos del switch (iguales en todas las herramientas).
  var css = '' +
    '.g-inv{position:relative;flex:none;width:12px;height:22px;padding:0;margin:0 6px 0 2px;' +
    'background:transparent;border:1.5px solid var(--g-black);cursor:pointer;border-radius:0;' +
    'display:block;-webkit-tap-highlight-color:transparent;}' +
    '.g-inv::before{content:"";position:absolute;left:1px;right:1px;top:1px;height:8px;' +
    'background:var(--g-black);transition:transform .22s cubic-bezier(.3,1.4,.5,1);}' +
    '.g-inv[aria-checked="true"]::before{transform:translateY(9px);}' +
    '.g-inv:focus-visible{outline:1px dashed var(--g-black);outline-offset:2px;}';

  function montar() {
    if (!document.getElementById('g-inv-css')) {
      var st = document.createElement('style');
      st.id = 'g-inv-css';
      st.textContent = css;
      document.head.appendChild(st);
    }
    var bar = document.getElementById('master-bar');
    if (!bar || bar.querySelector('.g-inv')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'g-inv';
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-label', 'Cambiar colores');
    b.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
    var mright = bar.querySelector('.mright');
    if (mright) mright.insertBefore(b, mright.firstChild);
    else bar.appendChild(b);
    aplicar(root.classList.contains('glam-alt'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
