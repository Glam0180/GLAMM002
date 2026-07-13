import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'tipografia-adaptativa')

export default function TipografiaAdaptativa() {
  return <ToolPageShell tool={tool} />
  /*
   * PRÓXIMA ITERACIÓN:
   * — Variable fonts (font-variation-settings)
   * — Controles de peso, ancho, óptica
   * — Respuesta al viewport y scroll
   * — Exportación SVG/PNG
   */
}
