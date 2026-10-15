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
       alIniciar(), alTerminar()   // opcionales (p. ej. subir resolución)
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
    info.textContent = 'post IG · 1080×1350';
    fila.appendChild(btn);
    fila.appendChild(dl);
    caja.appendChild(fila);
    caja.appendChild(info);
    if (op.contenedor) op.contenedor.appendChild(caja);

    if (!formato || !HTMLCanvasElement.prototype.captureStream) {
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

    function pintar() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      try { op.dibujar(ctx, W, H); } catch (e) { /* un cuadro suelto */ }
      if (pista && pista.requestFrame) pista.requestFrame();
    }

    function frame() { if (grabando) pintar(); }

    function bucle() {
      if (!grabando) return;
      pintar();
      raf = requestAnimationFrame(bucle);
    }

    function empezar() {
      if (url) { URL.revokeObjectURL(url); url = null; }
      dl.hidden = true;
      partes = [];
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
      rec.onstop = terminar;
      if (op.alIniciar) { try { op.alIniciar(); } catch (e) { /* nada */ } }
      grabando = true;
      pintar();
      rec.start(1000);
      t0 = performance.now();
      btn.classList.add('grabando', 'on');
      btn.textContent = '■ DETENER 00:00';
      info.textContent = 'grabando · 1080×1350';
      reloj = setInterval(function () { btn.textContent = '■ DETENER ' + tiempo(performance.now() - t0); }, 250);
      if (!op.manual) raf = requestAnimationFrame(bucle);
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
      if (rec && rec.state !== 'inactive') rec.stop();
    }

    function terminar() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      var dur = performance.now() - t0;
      var blob = new Blob(partes, { type: formato.mime.split(';')[0] });
      partes = [];
      if (!blob.size) { info.textContent = 'no se grabó nada, intenta de nuevo'; return; }
      url = URL.createObjectURL(blob);
      ultimoArchivo = (op.nombre || 'glam') + '-' + sello() + '.' + formato.ext;
      dl.hidden = false;
      info.textContent = 'listo · ' + tiempo(dur) + ' · ' + (blob.size / 1048576).toFixed(1) + ' MB · ' + formato.ext.toUpperCase();
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
