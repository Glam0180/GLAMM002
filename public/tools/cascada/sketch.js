/* ═══════════════════════════════════════════════════════════
   CASCADA — kinetic type en p5.js

   Dos cascadas de texto convergen al centro vertical del lienzo:
   la de arriba baja (MOTION) y la de abajo sube (EMOTION). Cada fila
   entra grande y abierta por el borde y, a medida que se acerca al
   punto de fuga, se encoge, se estrecha y se pierde en sombra.

   Cada letra deja un eco (copias que viajan hacia el punto de fuga)
   con degradé de color y un halo de dos colores alrededor de la masa
   de ecos.

   El loop es exacto: renderCascada(fase) con fase en [0, 1) y la fase
   1 es idéntica a la 0, así el MP4 exportado cierra sin salto.

   p5 maneja el lienzo y el bucle; el dibujo de las letras va directo
   sobre el contexto 2D (setTransform + fillText con una sola fuente
   fija), que es lo que permite miles de glifos por cuadro a 60 fps.
   ═══════════════════════════════════════════════════════════ */

const BW = 1080, BH = 1440;     // tamaño de diseño (el export sale a este tamaño)
const FS = 200;                 // tamaño fijo de la fuente; se escala con la matriz
const TAU = Math.PI * 2;

/* ── parámetros (los sliders del panel escriben aquí) ── */
const P = {
  arriba: 'MOTION',
  abajo: 'EMOTION',
  fuente: 'Archivo Black',

  filas: 11,          // filas por cascada
  duracion: 8,        // segundos que tarda una fila en ir del borde al centro (= loop)
  desfase: 0.5,       // corrimiento entre la cascada de arriba y la de abajo (en filas)
  escalon: 0.5,       // corre las filas impares media letra: rompe las columnas
  ondas: 0,           // ondulación de las letras dentro de la fila (px)

  persp: 1.5,         // aceleración de perspectiva: >1 = las filas se apiñan cerca del centro
  entrada: 120,       // cuánto por fuera del cuadro nace cada fila (px)
  tamEntrada: 150,    // tamaño de letra al entrar
  tamCentro: 26,      // tamaño de letra al llegar al centro
  abEntrada: 1450,    // ancho de la fila al entrar
  abCentro: 420,      // ancho de la fila en el centro
  curvaAbertura: 1.1, // qué tan rápido se cierra la fila (curva del ancho)
  estrechez: 0.55,    // ancho de cada letra al llegar al centro (1 = sin estrechar)
  anchoLetra: 1.15,   // ancho general de las letras
  curvatura: 130,     // las letras de las puntas se alejan del centro (fila en arco)
  giro: 0.5,          // giro radial: las letras se orientan hacia afuera del punto de fuga

  ecoCapas: 80,       // copias máximas por letra (las letras lejanas usan menos)
  ecoPaso: 5,         // distancia entre copias (px): menos = eco más liso
  ecoProf: 0.55,      // qué fracción del camino al punto de fuga recorre el eco
  ecoEncoge: 0.5,     // cuánto se encoge el eco al alejarse

  haloExt: 54,        // desenfoque del halo exterior (px)
  haloInt: 14,        // desenfoque del halo interior (px)
  haloFuerza: 1.15,   // intensidad de los halos

  fadeIn: 0.05,       // fundido al entrar (fracción del recorrido)
  fadeIni: 0.78,      // dónde empieza a perderse la fila (fracción del recorrido)
  sombra: 0.8,        // oscuridad del centro sobre las letras y el eco
  sombraFondo: 0.55,  // oscuridad del centro sobre el fondo (el hueco al que se van)
  radioSombra: 380,   // radio de la sombra central
  fugaX: 0, fugaY: 0, // corrimiento del punto de fuga
  mouse: false,       // el punto de fuga sigue al mouse (solo vista previa)

  fondoA: '#7CF0FF',  // fondo, centro
  fondoB: '#33F2B8',  // fondo, borde
  letra: '#FFFFFF',
  ecoCerca: '#1D4F55',
  ecoLejos: '#0E2F33',
  cHaloInt: '#FF2E1F',
  cHaloExt: '#FF6FD8',
  cSombra: '#0A1F22',
};

const PRESETS = {
  acido: { fondoA: '#7CF0FF', fondoB: '#33F2B8', letra: '#FFFFFF', ecoCerca: '#1D4F55', ecoLejos: '#0E2F33', cHaloInt: '#FF2E1F', cHaloExt: '#FF6FD8', cSombra: '#0A1F22' },
  glam: { fondoA: '#3A1214', fondoB: '#000000', letra: '#FF0100', ecoCerca: '#4A0B0C', ecoLejos: '#1A0607', cHaloInt: '#FF0100', cHaloExt: '#FF7A00', cSombra: '#000000' },
  noche: { fondoA: '#2A0F5C', fondoB: '#07051A', letra: '#F3EEFF', ecoCerca: '#3B22A0', ecoLejos: '#120A38', cHaloInt: '#FF3BD4', cHaloExt: '#3BE3FF', cSombra: '#04020E' },
  papel: { fondoA: '#F6F2E8', fondoB: '#E4DCCA', letra: '#141414', ecoCerca: '#C8BEA8', ecoLejos: '#A99D84', cHaloInt: '#FF5A1F', cHaloExt: '#FFC9AE', cSombra: '#F6F2E8' },
};

/* ── utilidades ── */
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const lerpN = (a, b, t) => a + (b - a) * t;
const frac = x => x - Math.floor(x);
function suave(a, b, x) { if (b <= a) return x >= b ? 1 : 0; const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mezcla(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${Math.round(lerpN(A[0], B[0], t))},${Math.round(lerpN(A[1], B[1], t))},${Math.round(lerpN(A[2], B[2], t))})`;
}
function rgba(h, a) { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const palabras = s => { const w = String(s || '').toUpperCase().split(',').map(x => x.trim()).filter(Boolean); return w.length ? w : [' ']; };

const FILTRO_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();

/* centrado óptico de la mayúscula: se mide una vez por fuente */
let capMedia = FS * 0.36;
function medirFuente() {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${FS}px "${P.fuente}"`;
  const m = c.measureText('H');
  capMedia = (m.actualBoundingBoxAscent || FS * 0.72) / 2;
}

/* ── renderer: lienzos de trabajo para un tamaño dado ── */
function crearRenderer(W, H) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const eco = mk(), front = mk(), tmp = mk();
  return { W, H, eco, front, tmp, ecoX: eco.getContext('2d'), frontX: front.getContext('2d'), tmpX: tmp.getContext('2d') };
}

/* Calcula las letras visibles en esta fase. Devuelve [{x,y,sc,sx,rot,ch,a,p}]
   ordenadas de la más profunda (centro) a la más cercana (borde). */
function letras(fase, W, H, cx, cy, k) {
  const out = [];
  const N = Math.max(1, Math.round(P.filas));
  const mitades = [
    { w: palabras(P.arriba), dir: -1, off: 0 },
    { w: palabras(P.abajo), dir: 1, off: P.desfase },
  ];
  const alcance = H / 2 / k + P.entrada;     // distancia del centro al nacer (en unidades de diseño)
  for (const m of mitades) {
    for (let i = 0; i < N; i++) {
      const t = frac((i + m.off) / N + fase);        // 0 = entra por el borde · 1 = llega al centro
      // al entrar no se usa opacidad (los ecos semitransparentes se rayan):
      // el eco crece desde cero. Al llegar al centro sí se desvanece.
      const ein = suave(0, P.fadeIn, t);
      const a = 1 - suave(P.fadeIni, 1, t);
      if (a <= 0.004) continue;
      const p = Math.pow(1 - t, P.persp);              // 1 en el borde → 0 en el centro
      const pal = m.w[i % m.w.length];
      const n = pal.length;
      const d = p * alcance;
      const tam = lerpN(P.tamCentro, P.tamEntrada, p);
      const ancho = lerpN(P.abCentro, P.abEntrada, Math.pow(p, P.curvaAbertura));
      const sx = P.anchoLetra * lerpN(P.estrechez, 1, p);
      // cada fila se corre una fracción distinta de letra (razón áurea):
      // así las letras no se apilan en columnas
      const corr = n > 1 ? (frac(i * 0.618034) - 0.5) * P.escalon * 2 / (n - 1) : 0;
      for (let j = 0; j < n; j++) {
        const ch = pal[j];
        if (ch === ' ') continue;
        const u = (n > 1 ? (j / (n - 1)) * 2 - 1 : 0) + corr;
        let y = d + P.curvatura * p * u * u;
        if (P.ondas) y += P.ondas * p * Math.sin(TAU * (fase * 2 + j / n + i / N));
        const x = cx + u * ancho / 2 * k;
        const yy = cy + m.dir * y * k;
        const rot = -m.dir * P.giro * Math.atan2(x - cx, Math.abs(yy - cy) + 1e-3);
        out.push({ x, y: yy, sc: tam * k / FS, sx, rot, ch, a, p, ein });
      }
    }
  }
  out.sort((A, B) => A.p - B.p);
  return out;
}

/* Sprites del eco: cada letra pre-renderizada una vez por tono. Pintar
   miles de imágenes transformadas es mucho más barato en GPU que miles de
   fillText (las letras grandes se rasterizan como trazados). Se rehacen
   solo si cambia la fuente, el texto o los colores del eco. */
const FSS = 150, NT = 24;
let spr = { clave: '', mapa: new Map() };
function sprites(texto, tonos) {
  const clave = P.fuente + '|' + texto + '|' + tonos.join();
  if (clave === spr.clave) return spr.mapa;
  const mapa = new Map();
  const m = document.createElement('canvas').getContext('2d');
  m.font = `${FSS}px "${P.fuente}"`;
  const off = capMedia * FSS / FS;
  for (const ch of new Set(texto)) {
    if (ch === ' ' || ch === ',') continue;
    const w = Math.ceil(m.measureText(ch).width + FSS * 0.3), h = Math.ceil(FSS * 1.15);
    const arr = tonos.map(t => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.font = m.font; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = t;
      x.fillText(ch, w / 2, h / 2 + off);
      return c;
    });
    mapa.set(ch, arr);
  }
  spr = { clave, mapa };
  return mapa;
}

function glifo(c, L, px, py, sc) {
  const co = Math.cos(L.rot), si = Math.sin(L.rot);
  c.setTransform(co * sc * L.sx, si * sc * L.sx, -si * sc, co * sc, px, py);
  c.fillText(L.ch, 0, capMedia);
}

function sombraCentro(c, W, H, cx, cy, k) {
  if (P.sombra <= 0) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-atop';
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, P.radioSombra * k));
  g.addColorStop(0, rgba(P.cSombra, P.sombra));
  g.addColorStop(0.55, rgba(P.cSombra, P.sombra * 0.45));
  g.addColorStop(1, rgba(P.cSombra, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
}

function halo(R, ctx, blur, color, fuerza) {
  if (blur <= 0 || fuerza <= 0) return;
  const t = R.tmpX;
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalCompositeOperation = 'source-over';
  t.globalAlpha = 1;
  t.clearRect(0, 0, R.W, R.H);
  if (FILTRO_OK) t.filter = `blur(${blur}px)`;
  t.drawImage(R.eco, 0, 0);
  t.drawImage(R.front, 0, 0);
  t.filter = 'none';
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = color;
  t.fillRect(0, 0, R.W, R.H);
  t.globalCompositeOperation = 'source-over';
  // fuerza > 1: se pinta otra vez con la parte sobrante
  let f = fuerza;
  while (f > 0) { ctx.globalAlpha = Math.min(1, f); ctx.drawImage(R.tmp, 0, 0); f -= 1; }
  ctx.globalAlpha = 1;
}

/* Pinta un cuadro completo en ctx (del tamaño R.W×R.H). */
function renderCascada(ctx, R, fase, fx = 0, fy = 0) {
  const W = R.W, H = R.H, k = W / BW;
  const cx = W / 2 + (P.fugaX + fx) * k;
  const cy = H / 2 + (P.fugaY + fy) * k;
  const fuente = `${FS}px "${P.fuente}"`;
  const L = letras(fase, W, H, cx, cy, k);

  /* 1 · eco: cada letra deja copias hacia el punto de fuga. La cantidad
     depende de lo lejos que viaja el eco (paso fijo en px), así las letras
     grandes del borde quedan lisas y las del centro no gastan de más.
     Todas las copias se pintan de la más profunda a la más cercana. */
  const e = R.ecoX;
  e.setTransform(1, 0, 0, 1, 0, 0);
  e.globalAlpha = 1;
  e.clearRect(0, 0, W, H);
  e.font = fuente; e.textAlign = 'center'; e.textBaseline = 'alphabetic';
  const KMAX = Math.round(P.ecoCapas);
  if (KMAX > 0 && P.ecoProf > 0) {
    const paso = Math.max(0.5, P.ecoPaso) * k;
    const tonos = [];
    for (let b = 0; b < NT; b++) tonos.push(mezcla(P.ecoCerca, P.ecoLejos, b / (NT - 1)));
    const SP = sprites(String(P.arriba + P.abajo).toUpperCase(), tonos);
    const esc = FS / FSS;
    const copias = [];                               // [r, índice de letra]
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      const dist = Math.hypot(cx - l.x, cy - l.y) * P.ecoProf * l.ein;
      const n = Math.max(1, Math.min(KMAX, Math.ceil(dist / paso)));
      for (let q = 1; q <= n; q++) copias.push(q / n, i);
    }
    // orden: r de mayor a menor (lo más profundo primero)
    const M = copias.length / 2;
    const idx = new Uint32Array(M);
    for (let m = 0; m < M; m++) idx[m] = m;
    idx.sort((A, B) => (copias[B * 2] - copias[A * 2]) || (L[copias[A * 2 + 1]].p - L[copias[B * 2 + 1]].p));
    let alfaAct = -1;
    for (let m = 0; m < M; m++) {
      const r = copias[idx[m] * 2], l = L[copias[idx[m] * 2 + 1]];
      const arr = SP.get(l.ch);
      if (!arr) continue;
      const img = arr[Math.round(r * (NT - 1))];
      if (l.a !== alfaAct) { e.globalAlpha = l.a; alfaAct = l.a; }
      const f = r * P.ecoProf * l.ein;
      const s = l.sc * esc * (1 - f * P.ecoEncoge);
      const co = Math.cos(l.rot), si = Math.sin(l.rot);
      e.setTransform(co * s * l.sx, si * s * l.sx, -si * s, co * s, l.x + (cx - l.x) * f, l.y + (cy - l.y) * f);
      e.drawImage(img, -img.width / 2, -img.height / 2);
    }
  }
  sombraCentro(e, W, H, cx, cy, k);

  /* 2 · letras de frente */
  const fr = R.frontX;
  fr.setTransform(1, 0, 0, 1, 0, 0);
  fr.globalAlpha = 1;
  fr.clearRect(0, 0, W, H);
  fr.font = fuente; fr.textAlign = 'center'; fr.textBaseline = 'alphabetic';
  fr.fillStyle = P.letra;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    fr.globalAlpha = l.a;
    glifo(fr, l, l.x, l.y, l.sc);
  }
  sombraCentro(fr, W, H, cx, cy, k);

  /* 3 · composición: fondo, halos, eco, frente */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.55);
  g.addColorStop(0, P.fondoA);
  g.addColorStop(1, P.fondoB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  halo(R, ctx, P.haloExt * k, P.cHaloExt, P.haloFuerza);
  halo(R, ctx, P.haloInt * k, P.cHaloInt, P.haloFuerza);
  if (P.sombraFondo > 0) {
    const s = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, P.radioSombra * 1.3 * k));
    s.addColorStop(0, rgba(P.cSombra, P.sombraFondo));
    s.addColorStop(0.5, rgba(P.cSombra, P.sombraFondo * 0.4));
    s.addColorStop(1, rgba(P.cSombra, 0));
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(R.eco, 0, 0);
  ctx.drawImage(R.front, 0, 0);
}

/* ═════════════════════ p5 ═════════════════════ */
let R = null;           // renderer de la vista previa
let calidad = 1;        // escala de la vista previa (1 = 1080×1440)
let fase = 0;
let corriendo = true;
let fugaMouse = { x: 0, y: 0 };
let listo = false;

function setup() {
  pixelDensity(1);
  const cnv = createCanvas(Math.round(BW * calidad), Math.round(BH * calidad));
  cnv.parent('sketch-holder');
  R = crearRenderer(width, height);
  frameRate(60);
  cargarFuente(P.fuente).then(() => { listo = true; });
}

function cargarFuente(nombre) {
  P.fuente = nombre;
  return document.fonts.load(`${FS}px "${nombre}"`).catch(() => {}).then(() => medirFuente());
}

function cambiarCalidad(q) {
  calidad = q;
  resizeCanvas(Math.round(BW * q), Math.round(BH * q));
  R = crearRenderer(width, height);
}

function draw() {
  if (corriendo) fase = frac(fase + (deltaTime / 1000) / Math.max(0.5, P.duracion));
  if (P.mouse && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    const tx = (mouseX / width - 0.5) * 360, ty = (mouseY / height - 0.5) * 480;
    fugaMouse.x += (tx - fugaMouse.x) * 0.08;
    fugaMouse.y += (ty - fugaMouse.y) * 0.08;
  } else {
    fugaMouse.x *= 0.92; fugaMouse.y *= 0.92;
  }
  if (!listo) { background(0); return; }
  renderCascada(drawingContext, R, fase, fugaMouse.x, fugaMouse.y);
}

/* API para el panel */
window.Cascada = {
  P, PRESETS, BW, BH,
  cargarFuente, cambiarCalidad, crearRenderer, renderCascada,
  get fase() { return fase; },
  set fase(v) { fase = frac(v); },
  get corriendo() { return corriendo; },
  set corriendo(v) { corriendo = !!v; },
};
