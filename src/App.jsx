import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@components/layout/Layout'
import Home from '@pages/Home'
import Floralis from '@pages/tools/Floralis'
import Canicas3D from '@pages/tools/Canicas3D'
import TipografiaAdaptativa from '@pages/tools/TipografiaAdaptativa'
import PosterGenerativo from '@pages/tools/PosterGenerativo'
import FaceTracking from '@pages/tools/FaceTracking'
import MotionDesignLab from '@pages/tools/MotionDesignLab'
import ExperimentalTool from '@pages/tools/ExperimentalTool'
import NotFound from '@pages/NotFound'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="tools/canicas-3d" element={<Canicas3D />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tools/floralis" element={<Floralis />} />
          <Route path="tools/tipografia-adaptativa" element={<TipografiaAdaptativa />} />
          <Route path="tools/poster-generativo" element={<PosterGenerativo />} />
          <Route path="tools/face-tracking" element={<FaceTracking />} />
          <Route path="tools/motion-design-lab" element={<MotionDesignLab />} />
          <Route path="tools/experimental" element={<ExperimentalTool />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
