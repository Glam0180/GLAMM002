import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'experimental')

export default function ExperimentalTool() {
  return <ToolSystemShell tool={tool} />
}
