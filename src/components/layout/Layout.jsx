import React from 'react'
import { Outlet } from 'react-router-dom'
import Nav from '@components/layout/Nav'
import Footer from '@components/layout/Footer'
import './Layout.css'

export default function Layout() {
  return (
    <div className="layout">
      <Nav />
      <main className="layout__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
