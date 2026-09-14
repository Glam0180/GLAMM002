import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'tipografia-adaptativa')

export default function TipografiaAdaptativa() {
  return <ToolSystemShell tool={tool} />
  /*
   * PRÓXIMA ITERACIÓN:
   * — Variable fonts (font-variation-settings)
   * — Controles de peso, ancho, óptica
   * — Respuesta al viewport y scroll
   * — Exportación SVG/PNG
   */
}
