import React from 'react'
import ToolPageShell from '@components/tools/ToolPageShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'face-tracking')

export default function FaceTracking() {
  return <ToolPageShell tool={tool} />
}
