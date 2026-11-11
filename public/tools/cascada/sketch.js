/* ═══════════════════════════════════════════════════════════
   CASCADA — kinetic type en p5.js + WebGL

   Dos cascadas de texto convergen al centro vertical del lienzo:
   la de arriba baja (MOTION) y la de abajo sube (EMOTION). Las filas
   viajan en profundidad real (Z lineal, tamaño 1/z): entran grandes y
   rápidas por el borde, se frenan y se encogen al meterse al fondo, y
   se pierden en niebla y sombra.

   Cada letra deja una estela fluida: la misma fila vista instantes
   antes se acumula en un campo de densidad que se derrite (desenfoque)
   y se colorea por densidad (borde exterior → borde interior → núcleo).

   Encima, una lente ojo de pez dobla y agranda las letras de los
   costados, con un toque de aberración cromática.

   Reparto del trabajo (para que no se trabe):
   · Canvas 2D: solo dibuja lo barato — la densidad (sprites blancos a
     baja resolución) y las letras de frente.
   · WebGL: desenfoque, mapa de color, fondo, sombra, lente y
     composición. Nada vuelve de la GPU a la CPU.

   Loop exacto: todo depende solo de la fase (0..1); la fase 1 = la 0.
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
  duracion: 8,        // segundos del loop (lo que tarda una fila en ir del borde al fondo)
  desfase: 0.5,       // corrimiento entre la cascada de arriba y la de abajo (en filas)
  escalon: 0.5,       // corre cada fila una fracción de letra: rompe las columnas
  ondas: 0,           // ondulación de las letras dentro de la fila (px)

  profundidad: 7,     // qué tan lejos queda el fondo: más = se mete más y se frena más
  entrada: 120,       // cuánto por fuera del cuadro nace cada fila (px)
  tamEntrada: 175,    // tamaño de letra al entrar
  tamCentro: 22,      // tamaño de letra en el fondo
  abEntrada: 1450,    // ancho de la fila al entrar
  abCentro: 360,      // ancho de la fila en el fondo
  curvaAbertura: 1,   // qué tan rápido se cierra la fila (curva del ancho)
  estrechez: 0.55,    // ancho de cada letra en el fondo (1 = sin estrechar)
  anchoLetra: 1.15,   // ancho general de las letras
  curvatura: 120,     // las letras de las puntas se alejan del centro (fila en arco)
  giro: 0.5,          // giro radial: las letras se orientan hacia afuera del punto de fuga
  niebla: 0.45,       // las letras lejanas se apagan hacia el color de sombra

  estelaLargo: 0.2,   // largo de la estela (fracción del recorrido). Negativo = hacia el centro
  estelaMuestras: 22, // muestras de la estela: más = más continua
  estelaCaida: 2.2,   // cómo se apaga la estela hacia la cola
  fluidez: 22,        // desenfoque del fluido (px): lo que lo derrite
  grosor: 0.45,       // cuánto engorda la mancha
  ondaFluido: 34,     // ondulación de la estela (px)
  velOnda: 1,         // vueltas de la ondulación por loop (entero = loop exacto)

  fadeIni: 0.8,       // dónde empieza a perderse la fila (fracción del recorrido)
  sombra: 0.75,       // oscuridad del centro sobre letras y fluido
  sombraFondo: 0,     // oscuridad del centro sobre el fondo
  radioSombra: 380,   // radio de la sombra central
  fugaX: 0, fugaY: 0, // corrimiento del punto de fuga
  mouse: false,       // el punto de fuga sigue al mouse (solo vista previa)

  ojo: 0.7,           // lente ojo de pez: agranda y dobla los bordes, comprime el centro
  lateral: 0.55,      // concentra la lente en los costados (0 = pareja en todas direcciones)
  aberracion: 0.3,    // separación de color en los bordes de la lente

  fondoA: '#7CF0FF',  // fondo, centro
  fondoB: '#33F2B8',  // fondo, borde
  letra: '#FFFFFF',
  ecoCerca: '#1D4F55',  // núcleo
  ecoLejos: '#0E2F33',  // núcleo profundo
  cHaloInt: '#FF2E1F',  // borde interior
  cHaloExt: '#FF6FD8',  // borde exterior
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
const rgb01 = h => hexRgb(h).map(v => v / 255);
function mezcla(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${Math.round(lerpN(A[0], B[0], t))},${Math.round(lerpN(A[1], B[1], t))},${Math.round(lerpN(A[2], B[2], t))})`;
}
const palabras = s => { const w = String(s || '').toUpperCase().split(',').map(x => x.trim()).filter(Boolean); return w.length ? w : [' ']; };

/* centrado óptico de la mayúscula: se mide una vez por fuente */
let capMedia = FS * 0.36;
function medirFuente() {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${FS}px "${P.fuente}"`;
  const m = c.measureText('H');
  capMedia = (m.actualBoundingBoxAscent || FS * 0.72) / 2;
}

/* ═════════ GEOMETRÍA ═════════ */

/* Perspectiva real: la fila viaja en Z de 1 (borde) a «profundidad»
   (fondo) a velocidad constante; su tamaño en pantalla es 1/z. Así
   entra rápida y grande y se frena al meterse, como en un túnel.
   Devuelve p: 1 en el borde → 0 en el fondo. */
function proyeccion(t) {
  const Z = Math.max(1.05, P.profundidad);
  const z = 1 + (Z - 1) * t;
  return (1 / z - 1 / Z) / (1 - 1 / Z);
}

/* Letras visibles en esta fase. «atras» mira la misma fila un poco antes
   (estela detrás) o después (negativo: estela hacia el centro), sin dar la
   vuelta, así la estela nunca salta de un extremo al otro.
   Devuelve [{x,y,sc,sx,rot,ch,a,p}] de la más profunda a la más cercana. */
function letras(fase, W, H, cx, cy, k, atras = 0) {
  const out = [];
  const N = Math.max(1, Math.round(P.filas));
  const mitades = [
    { w: palabras(P.arriba), dir: -1, off: 0 },
    { w: palabras(P.abajo), dir: 1, off: P.desfase },
  ];
  const alcance = H / 2 / k + P.entrada;     // distancia del centro al nacer (en unidades de diseño)
  for (const m of mitades) {
    for (let i = 0; i < N; i++) {
      const t = frac((i + m.off) / N + fase) - atras;
      if (t < 0 || t >= 1) continue;
      const a = 1 - suave(P.fadeIni, 1, t);
      if (a <= 0.004) continue;
      const p = proyeccion(t);
      const pal = m.w[i % m.w.length];
      const n = pal.length;
      const d = p * alcance;
      const tam = lerpN(P.tamCentro, P.tamEntrada, p);
      const ancho = lerpN(P.abCentro, P.abEntrada, Math.pow(p, P.curvaAbertura));
      const sx = P.anchoLetra * lerpN(P.estrechez, 1, p);
      // cada fila se corre una fracción distinta de letra (razón áurea)
      const corr = n > 1 ? (frac(i * 0.618034) - 0.5) * P.escalon * 2 / (n - 1) : 0;
      for (let j = 0; j < n; j++) {
        const ch = pal[j];
        if (ch === ' ') continue;
        const u = (n > 1 ? (j / (n - 1)) * 2 - 1 : 0) + corr;
        let y = d + P.curvatura * p * u * u;
        if (P.ondas) y += P.ondas * p * Math.sin(TAU * ((fase - atras) * 2 + j / n + i / N));
        const x = cx + u * ancho / 2 * k;
        const yy = cy + m.dir * y * k;
        const rot = -m.dir * P.giro * Math.atan2(x - cx, Math.abs(yy - cy) + 1e-3);
        out.push({ x, y: yy, sc: tam * k / FS, sx, rot, ch, a, p });
      }
    }
  }
  out.sort((A, B) => A.p - B.p);
  return out;
}

/* Sprites blancos de cada letra para el campo de densidad: pintar
   imágenes transformadas es mucho más barato que fillText. */
const FSS = 110;
let spr = { clave: '', mapa: new Map() };
function sprites() {
  const texto = String(P.arriba + P.abajo).toUpperCase();
  const clave = P.fuente + '|' + texto + '|' + capMedia;
  if (clave === spr.clave) return spr.mapa;
  const mapa = new Map();
  const m = document.createElement('canvas').getContext('2d');
  m.font = `${FSS}px "${P.fuente}"`;
  const off = capMedia * FSS / FS;
  for (const ch of new Set(texto)) {
    if (ch === ' ' || ch === ',') continue;
    const w = Math.ceil(m.measureText(ch).width + FSS * 0.3), h = Math.ceil(FSS * 1.15);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.font = m.font; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff';
    x.fillText(ch, w / 2, h / 2 + off);
    mapa.set(ch, c);
  }
  spr = { clave, mapa };
  return mapa;
}

/* ═════════ WEBGL ═════════ */
const VS = `attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;

// desenfoque gaussiano separable (25 tomas) sobre el canal rojo
const FS_BLUR = `precision highp float;
uniform sampler2D u_t;uniform vec2 u_d;varying vec2 v;
void main(){float s=0.,w=0.;
for(int i=-12;i<=12;i++){float x=float(i);float g=exp(-x*x/72.);s+=texture2D(u_t,v+u_d*x).r*g;w+=g;}
gl_FragColor=vec4(vec3(s/w),1.);}`;

// composición final: lente → fondo + sombra → fluido (mapa de color) → letras
const FS_FINAL = `precision highp float;
uniform sampler2D u_f,u_l,u_lut;
uniform vec2 u_res,u_c;
uniform vec3 u_bgA,u_bgB,u_sh;
uniform float u_bgR,u_shF,u_shL,u_shR,u_gan,u_ojo,u_lat,u_ab;
varying vec2 v;
vec2 lente(vec2 uv,float k){
  vec2 c=u_c*u_res;vec2 d=uv*u_res-c;float r=length(d);
  if(r<1e-3||u_ojo<=0.)return uv;
  vec2 dir=d/r;
  float tx=dir.x>1e-4?(u_res.x-c.x)/dir.x:(dir.x<-1e-4?c.x/-dir.x:1e9);
  float ty=dir.y>1e-4?(u_res.y-c.y)/dir.y:(dir.y<-1e-4?c.y/-dir.y:1e9);
  float R=min(tx,ty);float x=clamp(r/R,0.,1.);
  float a=clamp(u_ojo*mix(1.,abs(dir.x),u_lat)*k,0.,.97);
  // agranda toda la franja exterior (no solo el filo) y comprime el centro
  float g=(1.-a)*x+a*(.5*sin(x*1.5707963)+.5*pow(x,.6));
  return (c+dir*R*g)/u_res;
}
vec3 escena(vec2 uv){
  vec2 px=uv*u_res;float d=distance(px,u_c*u_res);
  vec3 col=mix(u_bgA,u_bgB,clamp(d/u_bgR,0.,1.));
  col=mix(col,u_sh,u_shF*pow(1.-clamp(d/(u_shR*1.3),0.,1.),1.6));
  float sh=u_shL*pow(1.-clamp(d/u_shR,0.,1.),1.4);
  float dens=clamp(texture2D(u_f,uv).r*u_gan,0.,1.);
  vec4 fl=texture2D(u_lut,vec2(dens*(255./256.)+.5/256.,.5));
  col=mix(col,mix(fl.rgb,u_sh,sh),fl.a);
  vec4 L=texture2D(u_l,uv);
  col=mix(col,mix(L.rgb,u_sh,sh),L.a);
  return col;
}
void main(){
  float ab=u_ab*.09;
  float r=escena(lente(v,1.+ab)).r;
  float g=escena(lente(v,1.)).g;
  float b=escena(lente(v,1.-ab)).b;
  gl_FragColor=vec4(r,g,b,1.);
}`;

function compilar(gl, fs) {
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(pr, 0, 'a');
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  const u = {};
  const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(pr, i).name; u[nm] = gl.getUniformLocation(pr, nm); }
  return { pr, u };
}
function textura(gl, w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return t;
}

/* ── renderer: lienzos y contexto WebGL para un tamaño dado ── */
function crearRenderer(W, H, escCampo = 0.25) {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // campo de densidad a baja resolución (va desenfocado); escCampo es relativo a 1080
  const fw = Math.max(32, Math.round(BW * escCampo)), fh = Math.max(32, Math.round(BH * escCampo));
  const campo = mk(fw, fh), front = mk(W, H), glc = mk(W, H);
  const gl = glc.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false, alpha: false });
  if (!gl) throw new Error('WebGL no disponible');
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tCampo = textura(gl), tFront = textura(gl), tLut = textura(gl);
  const tA = textura(gl, fw, fh), tB = textura(gl, fw, fh);
  const fbA = gl.createFramebuffer(), fbB = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbA); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tA, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tB, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {
    W, H, fw, fh, campo, front, glc, gl,
    campoX: campo.getContext('2d'), frontX: front.getContext('2d'),
    blur: compilar(gl, FS_BLUR), fin: compilar(gl, FS_FINAL),
    tCampo, tFront, tLut, tA, tB, fbA, fbB, lutClave: '',
  };
}

/* mapa de color por densidad: casi nada = fondo · poco = borde exterior ·
   medio = borde interior · mucho = núcleo */
function subirLut(R) {
  const clave = [P.cHaloExt, P.cHaloInt, P.ecoCerca, P.ecoLejos].join();
  if (clave === R.lutClave) return;
  const paradas = [
    [0.00, P.cHaloExt, 0], [0.04, P.cHaloExt, 0], [0.17, P.cHaloExt, 1],
    [0.27, P.cHaloExt, 1], [0.40, P.cHaloInt, 1], [0.52, P.cHaloInt, 1],
    [0.66, P.ecoCerca, 1], [1.00, P.ecoLejos, 1],
  ].map(([v, c, al]) => [v, hexRgb(c), al]);
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let q = 0;
    while (q < paradas.length - 2 && v > paradas[q + 1][0]) q++;
    const A = paradas[q], B = paradas[q + 1];
    const t = clamp01((v - A[0]) / Math.max(1e-6, B[0] - A[0]));
    const tt = t * t * (3 - 2 * t);
    for (let c = 0; c < 3; c++) lut[i * 4 + c] = Math.round(lerpN(A[1][c], B[1][c], tt));
    lut[i * 4 + 3] = Math.round(255 * lerpN(A[2], B[2], tt));
  }
  const gl = R.gl;
  gl.bindTexture(gl.TEXTURE_2D, R.tLut);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
  R.lutClave = clave;
}

/* Pinta un cuadro completo en ctx (del tamaño R.W×R.H). */
function renderCascada(ctx, R, fase, fx = 0, fy = 0) {
  const W = R.W, H = R.H, k = W / BW;
  const cx = W / 2 + (P.fugaX + fx) * k;
  const cy = H / 2 + (P.fugaY + fy) * k;

  /* 1 · densidad de la estela (2D, baja resolución, sprites blancos) */
  const c = R.campoX, fw = R.fw, fh = R.fh, e = fw / W;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.fillStyle = '#000';
  c.fillRect(0, 0, fw, fh);
  const SP = sprites(), esc = FS / FSS;
  const J = Math.max(1, Math.round(P.estelaMuestras));
  const ciclo = Math.round(P.velOnda);
  for (let j = J; j >= 0; j--) {
    const r = j / J;
    const L = letras(fase, W, H, cx, cy, k, r * P.estelaLargo);
    const w = Math.pow(1 - r * 0.97, P.estelaCaida);
    const A = P.ondaFluido * r * k;
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      const img = SP.get(l.ch);
      if (!img) continue;
      // la cola ondula como un líquido; la letra (r = 0) queda quieta
      const dx = A * Math.sin(TAU * (l.y / (430 * k) + fase * ciclo) + l.x / (210 * k));
      const dy = A * 0.6 * Math.cos(TAU * (l.x / (390 * k) - fase * ciclo) + l.y / (260 * k));
      // la niebla también adelgaza la estela de las filas lejanas
      c.globalAlpha = w * l.a * (1 - P.niebla * 0.5 * Math.pow(1 - l.p, 2));
      const s = l.sc * esc * e, co = Math.cos(l.rot), si = Math.sin(l.rot);
      c.setTransform(co * s * l.sx, si * s * l.sx, -si * s, co * s, (l.x + dx) * e, (l.y + dy) * e);
      c.drawImage(img, -img.width / 2, -img.height / 2);
    }
  }

  /* 2 · letras de frente (2D, resolución completa), con niebla por profundidad */
  const f = R.frontX;
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.globalAlpha = 1;
  f.clearRect(0, 0, W, H);
  f.font = `${FS}px "${P.fuente}"`; f.textAlign = 'center'; f.textBaseline = 'alphabetic';
  const L = letras(fase, W, H, cx, cy, k, 0);
  let tono = '';
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    const q = Math.round(P.niebla * Math.pow(1 - l.p, 2.2) * 24) / 24;
    const tn = q > 0 ? mezcla(P.letra, P.cSombra, q) : P.letra;
    if (tn !== tono) { f.fillStyle = tn; tono = tn; }
    f.globalAlpha = l.a;
    const co = Math.cos(l.rot), si = Math.sin(l.rot);
    f.setTransform(co * l.sc * l.sx, si * l.sc * l.sx, -si * l.sc, co * l.sc, l.x, l.y);
    f.fillText(l.ch, 0, capMedia);
  }

  /* 3 · WebGL: desenfoque → mapa de color → lente → composición */
  const gl = R.gl;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, R.tCampo);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, R.campo);
  gl.bindTexture(gl.TEXTURE_2D, R.tFront);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, R.front);
  subirLut(R);

  const sigma = P.fluidez * fw / BW * 0.6;      // en píxeles del campo
  const paso = Math.max(0, sigma / 6);
  gl.useProgram(R.blur.pr);
  gl.uniform1i(R.blur.u.u_t, 0);
  gl.viewport(0, 0, fw, fh);
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.fbA);
  gl.bindTexture(gl.TEXTURE_2D, R.tCampo);
  gl.uniform2f(R.blur.u.u_d, paso / fw, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.fbB);
  gl.bindTexture(gl.TEXTURE_2D, R.tA);
  gl.uniform2f(R.blur.u.u_d, 0, paso / fh);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  const F = R.fin, u = F.u;
  gl.useProgram(F.pr);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.tB);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.tFront);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, R.tLut);
  gl.uniform1i(u.u_f, 0); gl.uniform1i(u.u_l, 1); gl.uniform1i(u.u_lut, 2);
  gl.uniform2f(u.u_res, W, H);
  gl.uniform2f(u.u_c, cx / W, 1 - cy / H);
  gl.uniform3fv(u.u_bgA, rgb01(P.fondoA));
  gl.uniform3fv(u.u_bgB, rgb01(P.fondoB));
  gl.uniform3fv(u.u_sh, rgb01(P.cSombra));
  gl.uniform1f(u.u_bgR, Math.hypot(W, H) * 0.55);
  gl.uniform1f(u.u_shF, P.sombraFondo);
  gl.uniform1f(u.u_shL, P.sombra);
  gl.uniform1f(u.u_shR, Math.max(1, P.radioSombra * k));
  gl.uniform1f(u.u_gan, lerpN(0.7, 3.2, P.grosor));
  gl.uniform1f(u.u_ojo, P.ojo);
  gl.uniform1f(u.u_lat, P.lateral);
  gl.uniform1f(u.u_ab, P.aberracion);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(R.glc, 0, 0, W, H);
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
  const gl = R && R.gl;
  R = crearRenderer(width, height);
  if (gl) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
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
