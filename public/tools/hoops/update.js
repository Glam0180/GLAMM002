// Controles del sketch, conectados a las ventanas de propiedades de GLAM.
let uiText = "25 YEARS OF PROCESSING";
let sliderState = 0;
let debug = false;
const STATE_COUNT = 7;
const STATE_NAMES = ['aro', 'pila', 'resorte', 'jarrón', 'monedas', 'cebolla', 'nido'];
let debugToggle = null;
let inputFocused = false;
// inclinación por mouse (la lee draw)
const mouseTilt = { x: 0, y: 0, tx: 0, ty: 0 };
function uiIsActive() { return inputFocused; }

function buildUI() {
  const inp = document.getElementById('hText');
  const st = document.getElementById('hState');
  const out = document.getElementById('hStateOut');
  const spd = document.getElementById('hSpeed');
  const spdOut = document.getElementById('hSpeedOut');
  inp.value = uiText;
  inp.addEventListener('focus', () => inputFocused = true);
  inp.addEventListener('blur', () => inputFocused = false);
  inp.addEventListener('input', () => { uiText = inp.value; clearTimeout(rebuildTimer); rebuildTimer = setTimeout(rebuildTexture, REBUILD_DELAY); });
  const pintar = (el) => el.style.setProperty('--val', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
  const updState = () => { sliderState = +st.value; out.textContent = sliderState + ' · ' + STATE_NAMES[sliderState]; pintar(st); };
  st.addEventListener('input', updState); updState();
  const updSpd = () => { if (hoop) hoop.spinSpeed = 0.0005 * +spd.value; spdOut.textContent = (+spd.value).toFixed(2) + '×'; pintar(spd); };
  spd.addEventListener('input', updSpd); updSpd();

  // ── interacción ──
  const holder = document.getElementById('sketch-holder');
  // mouse: inclina la escena hacia donde está el cursor; al salir, vuelve al centro
  holder.addEventListener('pointermove', (e) => {
    const r = holder.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
    mouseTilt.ty = nx * 0.45; mouseTilt.tx = -ny * 0.3;
  });
  holder.addEventListener('pointerleave', () => { mouseTilt.tx = 0; mouseTilt.ty = 0; });
  // scroll: cada "golpe" de rueda pasa al estado siguiente o al anterior
  let acc = 0, lock = 0;
  holder.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    acc += e.deltaY;
    if (now < lock || Math.abs(acc) < 60) return;
    const next = Math.max(0, Math.min(STATE_COUNT - 1, sliderState + Math.sign(acc)));
    acc = 0; lock = now + 450;           // una pausa para no saltar varios estados de un solo gesto
    if (next !== sliderState) { st.value = next; updState(); }
  }, { passive: false });
  document.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', () => { st.value = b.dataset.state; updState(); }));
}

const REBUILD_DELAY = 250;
let rebuildTimer = null;
function updateDebugHud() {}
function readUI() { return sliderState; }
