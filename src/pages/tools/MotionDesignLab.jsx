import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'motion-design-lab')

export default function MotionDesignLab() {
  return <ToolPageShell tool={tool} />
}
