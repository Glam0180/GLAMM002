// Controles del sketch, conectados a las ventanas de propiedades de GLAM.
let uiText = "25 YEARS OF PROCESSING";
let sliderState = 0;
let debug = false;
const STATE_COUNT = 7;
const STATE_NAMES = ['aro', 'pila', 'resorte', 'jarrón', 'monedas', 'cebolla', 'nido'];
let debugToggle = null;
let inputFocused = false;
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
  document.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', () => { st.value = b.dataset.state; updState(); }));
}

const REBUILD_DELAY = 250;
let rebuildTimer = null;
function updateDebugHud() {}
function readUI() { return sliderState; }
