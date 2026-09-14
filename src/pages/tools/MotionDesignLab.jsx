import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'motion-design-lab')

export default function MotionDesignLab() {
  return <ToolSystemShell tool={tool} />
}
