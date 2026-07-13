export const TOOLS = [
  {
    id: 'floralis',
    slug: 'floralis',
    name: 'Floralis',
    description: 'Jardín generativo interactivo. Arrastra las flores con el mouse o usa tu mano con MediaPipe hand tracking.',
    category: 'interaction',
    status: 'live',
    tech: ['Canvas API', 'MediaPipe', 'Hand Tracking'],
    path: '/tools/floralis',
    index: '001',
  },
  {
    id: "002",
    name: "Canicas 3D",
    status: "live",
    tech: ['Three.js', 'MediaPipe'], // Usa array si Floralis lo usa
    path: '/tools/canicas-3d',      // <--- ASEGÚRATE DE QUE SE LLAME 'path'
    description: "Laboratorio de físicas y control gestual.",
    index: '002' // Si Floralis tiene index, agrégalo aquí también
  },
  {
    id: 'tipografia-adaptativa',
    slug: 'tipografia-adaptativa',
    name: 'Tipografía Adaptativa',
    description: 'Sistemas tipográficos que responden al contexto, tamaño y dispositivo en tiempo real.',
    category: 'typography',
    status: 'wip',
    tech: ['Canvas API', 'Variable Fonts'],
    path: '/tools/tipografia-adaptativa',
    index: '002',
  },
  {
    id: 'poster-generativo',
    slug: 'poster-generativo',
    name: 'Poster Generativo',
    description: 'Composición algorítmica de posters con lógica generativa y exportación de alta calidad.',
    category: 'generative',
    status: 'wip',
    tech: ['SVG', 'Algoritmos', 'Export'],
    path: '/tools/poster-generativo',
    index: '003',
  },
  {
    id: 'face-tracking',
    slug: 'face-tracking',
    name: 'Face Tracking',
    description: 'Detección de geometría facial en tiempo real para experiencias interactivas con la cámara.',
    category: 'interaction',
    status: 'soon',
    tech: ['MediaPipe', 'WebRTC', 'Three.js'],
    path: '/tools/face-tracking',
    index: '004',
  },
  {
    id: 'motion-design-lab',
    slug: 'motion-design-lab',
    name: 'Motion Design Lab',
    description: 'Laboratorio de animación y motion graphics con control de curvas y keyframes.',
    category: 'motion',
    status: 'soon',
    tech: ['GSAP', 'Three.js', 'WebGL'],
    path: '/tools/motion-design-lab',
    index: '005',
  },
  {
    id: 'experimental',
    slug: 'experimental',
    name: 'Experimental Tool',
    description: 'Zona de pruebas libre. Sin restricciones de categoría. Espacio para experimentos sin clasificar.',
    category: 'experimental',
    status: 'soon',
    tech: ['TBD'],
    path: '/tools/experimental',
    index: '006',
  },
]

export const TOOL_STATUS = {
  live: { label: 'Live', color: 'red' },
  wip: { label: 'En curso', color: 'amber' },
  soon: { label: 'Próximo', color: 'gray' },
}

export const LAB_META = {
  name: 'NOTAS AMANO LAB',
  shortName: 'NAL',
  tagline: 'Laboratorio de diseño gráfico interactivo',
  version: '0.2.0',
  year: '2025',
}
