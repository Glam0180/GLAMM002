import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'motion-design-lab')

export default function MotionDesignLab() {
  return (
    <ToolSystemShell
      tool={tool}
      whatItDoes="herramienta en desarrollo — todavía no tiene funcionalidad activa."
      steps={[
        'por ahora este es solo el esqueleto visual',
        'pronto vas a poder interactuar con ella',
        'vuelve más adelante para probarla',
      ]}
    />
  )
}
