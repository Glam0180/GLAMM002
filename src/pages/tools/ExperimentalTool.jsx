import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'experimental')

export default function ExperimentalTool() {
  return <ToolPageShell tool={tool} />
}
