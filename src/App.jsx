import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@components/layout/Layout'
import Home from '@pages/Home'
import Floralis from '@pages/tools/Floralis'
import Canicas3D from '@pages/tools/Canicas3D'
import Daisy from '@pages/tools/Daisy'
import WeDontBelong from '@pages/tools/WeDontBelong'
import Yummy from '@pages/tools/Yummy'
import Wall from '@pages/tools/Wall'
import Hoops from '@pages/tools/Hoops'
import Justice from '@pages/tools/Justice'
import Holocloth from '@pages/tools/Holocloth'
import Ticker3D from '@pages/tools/Ticker3D'
import TrackingCuadros from '@pages/tools/TrackingCuadros'
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
        <Route path="tools/daisy" element={<Daisy />} />
        <Route path="tools/we-dont-belong" element={<WeDontBelong />} />
        <Route path="tools/yummy" element={<Yummy />} />
        <Route path="tools/wall" element={<Wall />} />
        <Route path="tools/hoops" element={<Hoops />} />
        <Route path="tools/justice" element={<Justice />} />
        <Route path="tools/holocloth" element={<Holocloth />} />
        <Route path="tools/ticker-3d" element={<Ticker3D />} />
        <Route path="tools/tracking-cuadros" element={<TrackingCuadros />} />
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
