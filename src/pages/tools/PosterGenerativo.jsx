import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'poster-generativo')

export default function PosterGenerativo() {
  return <ToolPageShell tool={tool} />
}
