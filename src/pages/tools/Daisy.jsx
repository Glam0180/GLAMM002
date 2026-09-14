import React from 'react'
import DaisyExperience from '@tools/daisy' // Usamos el alias @tools

export default function Daisy() {
  // Igual que Canicas3D: retornamos directamente la experiencia
  // para que ocupe todo el espacio (sin ToolPageShell).
  return <DaisyExperience />
}
