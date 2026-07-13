import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import FloralisExperience from '@tools/floralis'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'floralis')

export default function Floralis() {
  return (
    <ToolPageShell tool={tool}>
      <FloralisExperience />
    </ToolPageShell>
  )
}
