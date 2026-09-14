import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import FloralisExperience from '@tools/floralis'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'floralis')

export default function Floralis() {
  return (
    <ToolSystemShell tool={tool}>
      <FloralisExperience />
    </ToolSystemShell>
  )
}
