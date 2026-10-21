// Ajustes por dispositivo: en el celular, menos segmentos y texturas más chicas.
const MOBILE = (() => {
  const phone = Math.min(screen.width, screen.height) < 700 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  return phone ? { density: 1, segments: 96, capScale: 0.6 } : { density: 0, segments: 160, capScale: 1 };
})();
