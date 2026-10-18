/* ═══════════════════════════════════════════════════════════
   GLAM — grabador del viewport en formato post de Instagram

   Graba SOLO el contenido del viewport de la herramienta en un video
   de 1080×1350 (4:5) y, al detener, ofrece descargarlo.

   Uso (desde cada herramienta):

     const rec = GlamRec.montar({
       contenedor: elemento donde va el botón (panel de propiedades),
       clase:      clase CSS de botón de la herramienta (mismo look),
       nombre:     prefijo del archivo descargado,
       manual:     true si la herramienta llama a rec.frame() justo
                   después de pintar (necesario con WebGL); false para
                   que el grabador tome cuadros solo,
       dibujar(ctx, W, H) { ...pinta el viewport en ctx a W×H... },
       ancho, alto  // opcional: tamaño del video (por defecto 1080×1350)
       aspecto      // opcional: ancho/alto del contenido (por defecto 0,8 = 4:5)
       alIniciar(), alTerminar()   // opcionales (p. ej. subir resolución)
       zonaCursor()  // opcional: elemento cuyo recorte 4:5 central es lo que
                     // se graba; el cursor (manito) se dibuja en el video
                     // sobre esa zona: dedo apuntando, y pinch al presionar.
       ventana()   // opcional: devuelve el elemento .win del viewport.
                   // Si está, el video muestra esa ventana (borde y barra
                   // de título, copiados del DOM con el tema activo) con
                   // margen alrededor, y dibujar() recibe solo el área de
                   // contenido, siempre en 4:5.
     });

   GlamRec.cubrir(ctx, fuente, sx, sy, sw, sh, W, H) recorta la región
   (sx, sy, sw, sh) de la fuente para que llene W×H sin deformarse.
   ═══════════════════════════════════════════════════════════ */
(function () {
  var W = 1080, H = 1350;
  var BITRATE = 20000000;   // 20 Mbps: calidad alta para 1080×1350
  var FPS = 60;

  function elegirFormato() {
    if (typeof MediaRecorder === 'undefined') return null;
    var opciones = [
      // H.264 en MP4 primero: es lo que Instagram acepta directo
      ['video/mp4;codecs=avc1.640028', 'mp4'],
      ['video/mp4;codecs=avc1.4d0028', 'mp4'],
      ['video/mp4;codecs=avc1', 'mp4'],
      ['video/mp4', 'mp4'],
      ['video/webm;codecs=vp9', 'webm'],
      ['video/webm;codecs=vp8', 'webm'],
      ['video/webm', 'webm'],
    ];
    for (var i = 0; i < opciones.length; i++) {
      try { if (MediaRecorder.isTypeSupported(opciones[i][0])) return { mime: opciones[i][0], ext: opciones[i][1] }; } catch (e) { /* sigue */ }
    }
    return null;
  }

  function cubrir(ctx, fuente, sx, sy, sw, sh, dw, dh) {
    if (!sw || !sh) return;
    var k = Math.max(dw / sw, dh / sh);
    var cw = dw / k, ch = dh / k;               // región de la fuente que entra
    ctx.drawImage(fuente, sx + (sw - cw) / 2, sy + (sh - ch) / 2, cw, ch, 0, 0, dw, dh);
  }

  // ── Marco de ventana ──────────────────────────────────────
  // Se "fotografía" la ventana real del viewport: posiciones, colores y
  // textos de su barra de título se leen del DOM y se reescalan al video.
  // Se mide al empezar y cada medio segundo (por si cambia el tema).
  function transparente(c) { return !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c); }

  function fondoDetras(el) {
    var n = el.parentElement;
    while (n) {
      var c = n.ownerDocument.defaultView.getComputedStyle(n).backgroundColor;
      if (!transparente(c)) return c;
      n = n.parentElement;
    }
    return '#000';
  }

  function medirVentana(win, W, H, ASP) {
    var vista = win.ownerDocument.defaultView;
    var cs = function (e) { return vista.getComputedStyle(e); };
    var r = win.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var csw = cs(win);
    var b = parseFloat(csw.borderTopWidth) || 0;
    var barra = win.querySelector('.win__bar, .tss__win-bar');
    var rb = barra ? barra.getBoundingClientRect() : { height: 0 };
    // El video muestra una ventana "virtual" cuyo contenido es el recorte
    // 4:5 del viewport real: así la barra conserva su proporción aunque
    // la ventana en pantalla sea muy ancha.
    var cwDom = r.width - 2 * b, chDom = r.height - 2 * b - rb.height;
    var vw = Math.max(1, Math.min(cwDom, chDom > 0 ? chDom * ASP : cwDom));
    // Margen para que el contenido quede justo en 4:5 y el margen
    // lateral y el vertical salgan parecidos.
    var K = 2 * b + rb.height + vw / ASP;
    var q = K / (vw + 2 * b);
    var mh = q > 1.01 ? (W * q - H) / (2 * (q - 1)) : 48;
    mh = Math.max(24, Math.min(140, mh));
    var sc = (W - 2 * mh) / (vw + 2 * b);
    var cw = vw * sc, ch = cw / ASP;
    var total = 2 * b * sc + rb.height * sc + ch;
    var mv = (H - total) / 2;
    var plan = {
      fondo: fondoDetras(win),
      borde: csw.borderTopColor, b: b * sc,
      x: mh, y: mv, w: W - 2 * mh, h: total,
      contenido: { x: mh + b * sc, y: mv + b * sc + rb.height * sc, w: cw, h: ch },
      ops: [],
    };
    if (!barra) return plan;

    var ox = r.left + b, oy = r.top + b;   // origen: esquina interior de la ventana
    var finDer = W - mh - b * sc;          // borde interior derecho en el video
    var medio = rb.left + rb.width / 2;
    // lo que está en la mitad derecha de la barra (controles) se ancla a
    // la derecha; el resto, a la izquierda
    var X = function (v, ancho) { return (v + (ancho || 0) / 2) > medio ? finDer - (rb.right - v) * sc : mh + b * sc + (v - ox) * sc; };
    var Y = function (v) { return mv + b * sc + (v - oy) * sc; };
    var csb = cs(barra);
    var anchoBarra = cw;   // la barra ocupa todo el ancho interior de la ventana virtual
    plan.ops.push({ t: 'rect', x: mh + b * sc, y: Y(rb.top), w: anchoBarra, h: rb.height * sc, c: csb.backgroundColor });
    var bb = parseFloat(csb.borderBottomWidth) || 0;
    if (bb) plan.ops.push({ t: 'rect', x: mh + b * sc, y: Y(rb.bottom - bb), w: anchoBarra, h: bb * sc, c: csb.borderBottomColor });

    var todos = barra.querySelectorAll('*');
    for (var i = 0; i < todos.length; i++) {
      var e = todos[i], ce = cs(e);
      if (ce.display === 'none' || ce.visibility === 'hidden') continue;
      var re = e.getBoundingClientRect();
      if (!re.width || !re.height) continue;
      if (!transparente(ce.backgroundColor)) plan.ops.push({ t: 'rect', x: X(re.left, re.width), y: Y(re.top), w: re.width * sc, h: re.height * sc, c: ce.backgroundColor });
      var bw = parseFloat(ce.borderTopWidth) || 0;
      if (bw && !transparente(ce.borderTopColor) && ce.borderTopStyle !== 'none') {
        plan.ops.push({ t: 'borde', x: X(re.left, re.width), y: Y(re.top), w: re.width * sc, h: re.height * sc, g: bw * sc, c: ce.borderTopColor });
      }
      // texto propio del elemento (nodos de texto directos)
      for (var n = e.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        var rg = e.ownerDocument.createRange();
        rg.selectNodeContents(n);
        var rt = rg.getBoundingClientRect();
        if (!rt.width) continue;
        var txt = n.textContent.trim();
        if (ce.textTransform === 'uppercase') txt = txt.toUpperCase();
        plan.ops.push({
          t: 'texto', s: txt, x: X(rt.left, rt.width), y: Y(rt.top + rt.height / 2), w: rt.width * sc,
          c: ce.color, f: ce.fontWeight + ' ' + (parseFloat(ce.fontSize) * sc) + 'px ' + ce.fontFamily,
          ls: (parseFloat(ce.letterSpacing) || 0) * sc,
        });
      }
    }
    return plan;
  }

  function pintarVentana(ctx, p, W, H) {
    ctx.fillStyle = p.fondo;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = p.borde;
    ctx.fillRect(p.x, p.y, p.w, p.h);                  // borde (y relleno de base)
    ctx.fillStyle = '#000';
    ctx.fillRect(p.x + p.b, p.y + p.b, p.w - 2 * p.b, p.h - 2 * p.b);
    for (var i = 0; i < p.ops.length; i++) {
      var o = p.ops[i];
      if (o.t === 'rect') { ctx.fillStyle = o.c; ctx.fillRect(o.x, o.y, o.w, o.h); }
      else if (o.t === 'borde') {
        ctx.fillStyle = o.c;
        ctx.fillRect(o.x, o.y, o.w, o.g); ctx.fillRect(o.x, o.y + o.h - o.g, o.w, o.g);
        ctx.fillRect(o.x, o.y, o.g, o.h); ctx.fillRect(o.x + o.w - o.g, o.y, o.g, o.h);
      } else {
        ctx.fillStyle = o.c;
        ctx.font = o.f;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        if ('letterSpacing' in ctx) ctx.letterSpacing = o.ls + 'px';
        ctx.fillText(o.s, o.x, o.y, o.w + 2);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      }
    }
  }

  // ── Cursor (manito pixel art) ─────────────────────────────
  // Mismos PNG que el cursor en pantalla: 24×24 pixel art; punta del
  // dedo en (9,1); pinch al presionar.
  var CURSOR = {
    apunta:  { src: '/tools/cursor-point.png', hx: 9, hy: 1 },
    cerrada: { src: '/tools/cursor-pinch.png', hx: 9, hy: 5 },
  };
  for (var k in CURSOR) { var im = new Image(); im.src = CURSOR[k].src; CURSOR[k].img = im; }
  var TAM_CURSOR = 24;   // px CSS en pantalla

  // Posición del puntero dentro del recorte 4:5 central de un elemento.
  function mapa45(el, x, y, ASP) {
    var r = el === el.ownerDocument.documentElement
      ? { left: 0, top: 0, width: el.ownerDocument.defaultView.innerWidth, height: el.ownerDocument.defaultView.innerHeight }
      : el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var cx = 0, cy = 0, cw = r.width, ch = r.height;
    if (r.width / r.height > ASP) { cw = r.height * ASP; cx = (r.width - cw) / 2; }
    else { ch = r.width / ASP; cy = (r.height - ch) / 2; }
    return { u: (x - r.left - cx) / cw, v: (y - r.top - cy) / ch, ancho: cw };
  }

  function dosDigitos(n) { return (n < 10 ? '0' : '') + n; }
  function tiempo(ms) {
    var s = Math.floor(ms / 1000);
    return dosDigitos(Math.floor(s / 60)) + ':' + dosDigitos(s % 60);
  }
  function sello() {
    var d = new Date();
    return d.getFullYear() + dosDigitos(d.getMonth() + 1) + dosDigitos(d.getDate()) + '-' +
      dosDigitos(d.getHours()) + dosDigitos(d.getMinutes()) + dosDigitos(d.getSeconds());
  }

  var css = '' +
    '.g-rec{display:flex;flex-direction:column;gap:4px;width:100%;}' +
    '.g-rec__fila{display:flex;gap:4px;}' +
    '.g-rec__fila>button{flex:1;}' +
    '.g-rec__info{font-size:8px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;}' +
    '.g-rec__btn.grabando{animation:gRecLatido 1s steps(2,start) infinite;}' +
    '@keyframes gRecLatido{to{opacity:.55;}}';

  function montar(op) {
    var W = op.ancho || 1080, H = op.alto || 1350, ASP = op.aspecto || 0.8;
    var TAM = W + '×' + H;
    if (!document.getElementById('g-rec-css')) {
      var st = document.createElement('style');
      st.id = 'g-rec-css';
      st.textContent = css;
      document.head.appendChild(st);
    }

    var formato = elegirFormato();
    var caja = document.createElement('div');
    caja.className = 'g-rec';
    var fila = document.createElement('div');
    fila.className = 'g-rec__fila';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (op.clase || '') + ' g-rec__btn';
    btn.textContent = '● GRABAR';
    var dl = document.createElement('button');
    dl.type = 'button';
    dl.className = (op.clase || '') + ' g-rec__dl';
    dl.textContent = '↓ DESCARGAR';
    dl.hidden = true;
    var info = document.createElement('div');
    info.className = 'g-rec__info';
    info.textContent = 'post IG · ' + TAM;
    fila.appendChild(btn);
    fila.appendChild(dl);
    caja.appendChild(fila);
    caja.appendChild(info);
    if (op.contenedor) op.contenedor.appendChild(caja);

    // Dos motores:
    //  1) WebCodecs + MP4 (Chrome, Edge, Safari 16.4+, Firefox 130+):
    //     cada cuadro se codifica con su marca de tiempo exacta (n/60 s),
    //     así el archivo sale a 60 fps constantes, en H.264 MP4. Si la
    //     herramienta pinta más lento, se repite el último cuadro para no
    //     perder el ritmo; si pinta más rápido (pantallas 120 Hz), se
    //     toma uno cada 1/60 s.
    //  2) Respaldo con MediaRecorder, con el mismo ritmo de 60 cuadros/s.
    var webc = null;          // { codec } si WebCodecs sirve
    var listo = false;
    var tieneWebc = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
    if (!tieneWebc && (!formato || !HTMLCanvasElement.prototype.captureStream)) {
      btn.disabled = true;
      info.textContent = 'este navegador no permite grabar';
      return { frame: function () {}, grabando: function () { return false; } };
    }

    // Lienzo de grabación: fuera de pantalla, pero dentro del documento
    // (algunos navegadores no entregan cuadros de un canvas suelto).
    var lienzo = document.createElement('canvas');
    lienzo.width = W;
    lienzo.height = H;
    lienzo.setAttribute('aria-hidden', 'true');
    lienzo.style.cssText = 'position:fixed;left:-20000px;top:0;width:1px;height:1px;pointer-events:none;';
    document.body.appendChild(lienzo);
    var ctx = lienzo.getContext('2d', { alpha: false });

    var grabando = false, rec = null, partes = [], t0 = 0, reloj = 0, raf = 0;
    var stream = null, pista = null, url = null, ultimoArchivo = '';
    var plan = null, planEn = 0;
    var hechos = 0;                 // cuadros ya entregados al video
    var MS = 1000 / FPS;
    var encoder = null, muxer = null, fallo = false;

    function cargarMuxer() {
      if (window.Mp4Muxer) return Promise.resolve();
      return new Promise(function (ok, mal) {
        var sc = document.createElement('script');
        sc.src = '/tools/lib/mp4-muxer.min.js';
        sc.onload = function () { ok(); };
        sc.onerror = mal;
        document.head.appendChild(sc);
      });
    }

    // Se elige el codec una vez, al montar.
    (function prepararWebc() {
      if (!tieneWebc) { listo = true; return; }
      // H.264 primero (lo que Instagram acepta directo); VP9/AV1 en MP4
      // solo si el navegador no codifica H.264.
      var codecs = ['avc1.64002A', 'avc1.4D002A', 'avc1.42002A', 'avc1.640028', 'vp09.00.41.08', 'av01.0.09M.08'];
      var i = 0;
      function probar() {
        if (i >= codecs.length) { listo = true; if (!formato) { btn.disabled = true; info.textContent = 'este navegador no permite grabar'; } return; }
        var c = codecs[i++];
        VideoEncoder.isConfigSupported({ codec: c, width: W, height: H, bitrate: BITRATE, framerate: FPS })
          .then(function (r) { if (r && r.supported) { webc = { codec: c }; listo = true; info.textContent = 'post IG · ' + TAM + ' · 60 fps'; } else probar(); })
          .catch(probar);
      }
      probar();
    })();

    // Puntero: se sigue siempre (también fuera de la grabación) para que
    // el primer cuadro ya tenga la manito en su sitio.
    var ptr = { x: 0, y: 0, dentro: false, presionado: false };
    if (op.zonaCursor) {
      var vista = window;
      vista.addEventListener('pointermove', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.dentro = true; }, true);
      vista.addEventListener('pointerdown', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.dentro = true; ptr.presionado = true; }, true);
      vista.addEventListener('pointerup', function () { ptr.presionado = false; }, true);
      vista.addEventListener('pointercancel', function () { ptr.presionado = false; }, true);
      document.documentElement.addEventListener('pointerleave', function () { ptr.dentro = false; });
      vista.addEventListener('blur', function () { ptr.presionado = false; });
    }

    function pintarCursor(c, cw, ch) {
      if (!op.zonaCursor || !ptr.dentro) return;
      var z = op.zonaCursor();
      if (!z) return;
      var m = mapa45(z, ptr.x, ptr.y, ASP);
      if (!m || m.u < 0 || m.u > 1 || m.v < 0 || m.v > 1) return;
      var cur = ptr.presionado ? CURSOR.cerrada : CURSOR.apunta;
      if (!cur.img.complete || !cur.img.naturalWidth) return;
      var s = cw / m.ancho;                 // px de video por px de pantalla
      var t = TAM_CURSOR * s;
      c.save();
      c.imageSmoothingEnabled = false;      // pixel art nítido
      c.drawImage(cur.img, Math.round(m.u * cw - cur.hx * s), Math.round(m.v * ch - cur.hy * s), Math.round(t), Math.round(t));
      c.restore();
    }

    function pintar() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      var ahora = performance.now();
      if (op.ventana && ahora - planEn > 500) {
        planEn = ahora;
        try { var w = op.ventana(); plan = w ? medirVentana(w, W, H, ASP) : null; } catch (e) { plan = null; }
      }
      if (plan) {
        pintarVentana(ctx, plan, W, H);
        var c = plan.contenido;
        ctx.save();
        ctx.beginPath();
        ctx.rect(c.x, c.y, c.w, c.h);
        ctx.clip();
        ctx.translate(c.x, c.y);
        ctx.save();
        try { op.dibujar(ctx, c.w, c.h); } catch (e) { /* un cuadro suelto */ }
        ctx.restore();
        pintarCursor(ctx, c.w, c.h);
        ctx.restore();
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        try { op.dibujar(ctx, W, H); } catch (e) { /* un cuadro suelto */ }
        ctx.restore();
        pintarCursor(ctx, W, H);
      }
    }

    // Ritmo fijo de 60 cuadros por segundo de tiempo real.
    function frame() {
      if (!grabando || fallo) return;
      var ahora = performance.now();
      var debidos = Math.floor((ahora - t0) / MS) + 1;
      if (debidos <= hechos) return;            // todavía no toca otro cuadro
      // Si la pestaña estuvo oculta (más de 2 s sin cuadros), no se rellena
      // el hueco: se sigue desde aquí (el video no tendrá un tramo congelado).
      if (debidos - hechos > FPS * 2) { t0 += (debidos - hechos - 1) * MS; debidos = hechos + 1; }
      pintar();
      if (encoder) {
        // Normalmente se entrega un cuadro por cada 1/60 s pendiente. Si el
        // codificador va atrasado (equipo lento), en vez de apilar copias
        // del mismo cuadro se entrega uno solo que dura todo el tramo: el
        // video sigue en la rejilla de 60 fps y a tiempo real, sin colapsar.
        var cola = encoder.encodeQueueSize || 0;
        while (hechos < debidos) {
          var tramo = cola > 3 ? debidos - hechos : 1;
          var vf = new VideoFrame(lienzo, { timestamp: Math.round(hechos * 1e6 / FPS), duration: Math.round(tramo * 1e6 / FPS) });
          try { encoder.encode(vf, { keyFrame: hechos === 0 || Math.floor(hechos / (FPS * 2)) !== Math.floor((hechos + tramo - 1) / (FPS * 2)) || (hechos % (FPS * 2) === 0) }); } catch (e) { fallo = true; console.warn('[glam-rec] encode:', e && e.message); }
          vf.close();
          hechos += tramo;
          cola++;
        }
      } else {
        if (pista && pista.requestFrame) pista.requestFrame();
        hechos = debidos;
      }
    }

    function bucle() {
      if (!grabando) return;
      frame();
      raf = requestAnimationFrame(bucle);
    }

    function arrancarComun() {
      if (op.alIniciar) { try { op.alIniciar(); } catch (e) { /* nada */ } }
      grabando = true;
      fallo = false;
      planEn = 0;
      hechos = 0;
      t0 = performance.now();
      frame();
      btn.disabled = false;
      btn.classList.add('grabando', 'on');
      btn.textContent = '■ DETENER 00:00';
      info.textContent = 'grabando · ' + TAM + ' · 60 fps';
      reloj = setInterval(function () { btn.textContent = '■ DETENER ' + tiempo(performance.now() - t0); }, 250);
      if (!op.manual) raf = requestAnimationFrame(bucle);
    }

    function empezar() {
      if (!listo) return;
      if (url) { URL.revokeObjectURL(url); url = null; }
      dl.hidden = true;
      partes = [];
      if (webc) {
        btn.disabled = true;
        info.textContent = 'preparando…';
        cargarMuxer().then(function () {
          var mx = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.ArrayBufferTarget(),
            video: { codec: /^avc/.test(webc.codec) ? 'avc' : /^vp09/.test(webc.codec) ? 'vp9' : 'av1', width: W, height: H, frameRate: FPS },
            fastStart: 'in-memory',
          });
          muxer = mx;
          encoder = new VideoEncoder({
            // el muxer de ESTA grabación (no la variable compartida, que
            // se suelta al detener mientras aún llegan los últimos cuadros)
            output: function (chunk, meta) { mx.addVideoChunk(chunk, meta); },
            error: function (e) { fallo = true; console.warn('[glam-rec] codificador:', e && e.message); },
          });
          var conf = { codec: webc.codec, width: W, height: H, bitrate: BITRATE, framerate: FPS };
          if (/^avc/.test(webc.codec)) conf.avc = { format: 'avc' };
          encoder.configure(conf);
          arrancarComun();
        }).catch(function () {
          // sin el muxer, se graba con el respaldo
          webc = null; encoder = null; muxer = null;
          btn.disabled = false;
          empezar();
        });
        return;
      }
      if (!formato) return;
      stream = lienzo.captureStream(0);
      pista = stream.getVideoTracks()[0];
      if (!pista || !pista.requestFrame) {
        stream = lienzo.captureStream(FPS);
        pista = null;
      }
      try {
        rec = new MediaRecorder(stream, { mimeType: formato.mime, videoBitsPerSecond: BITRATE });
      } catch (e) {
        info.textContent = 'no se pudo iniciar la grabación';
        return;
      }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
      rec.onstop = function () { terminar(new Blob(partes, { type: formato.mime.split(';')[0] }), formato.ext); };
      rec.start(1000);
      arrancarComun();
    }

    function detener() {
      if (!grabando) return;
      grabando = false;
      cancelAnimationFrame(raf);
      clearInterval(reloj);
      if (op.alTerminar) { try { op.alTerminar(); } catch (e) { /* nada */ } }
      btn.classList.remove('grabando', 'on');
      btn.textContent = '● GRABAR';
      info.textContent = 'procesando…';
      if (encoder) {
        var enc = encoder, mx = muxer;
        encoder = null; muxer = null;
        btn.disabled = true;
        enc.flush().then(function () {
          enc.close();
          mx.finalize();
          terminar(new Blob([mx.target.buffer], { type: 'video/mp4' }), 'mp4');
        }).catch(function () {
          info.textContent = 'no se pudo terminar el video, intenta de nuevo';
        }).then(function () { btn.disabled = false; });
      } else if (rec && rec.state !== 'inactive') rec.stop();
    }

    function terminar(blob, ext) {
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      partes = [];
      if (!blob || !blob.size || !hechos) { info.textContent = 'no se grabó nada, intenta de nuevo'; return; }
      url = URL.createObjectURL(blob);
      ultimoArchivo = (op.nombre || 'glam') + '-' + sello() + '.' + ext;
      dl.hidden = false;
      info.textContent = 'listo · ' + tiempo(hechos * MS) + ' · 60 fps · ' + (blob.size / 1048576).toFixed(1) + ' MB · ' + ext.toUpperCase();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (grabando) detener(); else empezar();
    });
    dl.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!url) return;
      var a = document.createElement('a');
      a.href = url;
      a.download = ultimoArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    return { frame: frame, grabando: function () { return grabando; } };
  }

  window.GlamRec = { montar: montar, cubrir: cubrir, ANCHO: W, ALTO: H };
})();
