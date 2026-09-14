import React from 'react'
import ToolSystemShell from '@components/tools/ToolSystemShell'
import { TOOLS } from '@constants/tools'

const tool = TOOLS.find(t => t.id === 'face-tracking')

export default function FaceTracking() {
  return <ToolSystemShell tool={tool} />
}
