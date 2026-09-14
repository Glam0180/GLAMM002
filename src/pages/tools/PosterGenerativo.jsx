import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'poster-generativo')

export default function PosterGenerativo() {
  return <ToolSystemShell tool={tool} />
}
