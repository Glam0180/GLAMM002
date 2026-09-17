import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import FloralisExperience from '@tools/floralis'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'floralis')

export default function Floralis() {
  return (
    <ToolSystemShell
      tool={tool}
      whatItDoes="jardín generativo: arrastra las flores con el mouse o controla con gestos de tu mano frente a la cámara."
      steps={[
        'arrastra cualquier flor con el mouse para moverla',
        "activa 'mano' arriba a la izquierda para usar la cámara",
        'cierra el pinch (pulgar + índice) sobre una flor para agarrarla',
        'ajusta color, grosor y tamaño desde el panel de propiedades',
        'carga una imagen para reemplazar la punta de una flor',
      ]}
    >
      <FloralisExperience />
    </ToolSystemShell>
  )
}
