import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import CanicasExperience from '@tools/canicas-3d' // Usamos el alias @tools
import { TOOLS } from '@constants/tools'

// Buscamos la herramienta por su ID (asegúrate de que en tools.js sea '002' o 'canicas-3d')
const tool = TOOLS.find(t => t.id === '002')

export default function Canicas3D() {
  // Ya no usamos ToolPageShell ni buscamos la constante TOOLS
  // Retornamos directamente la experiencia para que ocupe todo el espacio
  return <CanicasExperience />
}