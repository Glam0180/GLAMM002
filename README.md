# NOTAS AMANO LAB — v0.2.0

> Laboratorio de diseño gráfico interactivo  
> Paleta: `#FF0100` · `#201213`

---

## Arrancar

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Build para producción

```bash
npm run build
# Genera carpeta /dist — arrástrala a Netlify o sube a Vercel
```

---

## Estructura

```
src/
├── components/
│   ├── layout/        Nav, Footer, Layout
│   ├── tools/         ToolPageShell (wrapper reutilizable)
│   └── ui/            Tag, ToolCard
├── constants/
│   └── tools.js       ← REGISTRO CENTRAL de herramientas
├── hooks/             useScrollPosition, useMediaQuery
├── pages/
│   ├── Home.jsx
│   ├── NotFound.jsx
│   └── tools/         Una página por herramienta
├── styles/
│   ├── reset.css
│   ├── tokens.css     ← Design tokens / variables CSS
│   └── global.css
├── tools/             Lógica interna de cada herramienta
│   └── floralis/      index.jsx + floralis.css
└── utils/             helpers.js
public/
└── tools/
    └── floralis.html  ← HTMLs independientes servidos estáticamente
```

---

## Añadir una herramienta nueva

1. `src/constants/tools.js` — agregar objeto al array `TOOLS`
2. `src/pages/tools/NombreHerramienta.jsx` — crear página
3. `src/tools/nombre/index.jsx` — lógica/experiencia real
4. `src/App.jsx` — agregar `<Route>`

Si la herramienta es un HTML independiente:
- Copiarla a `public/tools/nombre.html`
- Cargarla con `<iframe src="/tools/nombre.html" />`

---

## Herramientas

| # | Nombre | Estado | Tech |
|---|--------|--------|------|
| 001 | Floralis | ✅ Live | Canvas, MediaPipe |
| 002 | Tipografía Adaptativa | 🔧 WIP | Variable Fonts |
| 003 | Poster Generativo | 🔧 WIP | SVG, Algoritmos |
| 004 | Face Tracking | ⏳ Soon | MediaPipe, Three.js |
| 005 | Motion Design Lab | ⏳ Soon | GSAP, WebGL |
| 006 | Experimental | ⏳ Soon | TBD |
