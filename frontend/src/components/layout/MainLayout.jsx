import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ToastContainer from '../ui/Toast'
import ChatFlutuante from '../ai/ChatFlutuante'
import useSidebarStore from '../../stores/sidebarStore'

export default function MainLayout() {
  const desktopAberta = useSidebarStore(s => s.desktopAberta)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-page)' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        marginLeft: isMobile ? 0 : desktopAberta ? '240px' : 0,
        transition: 'margin-left 250ms ease',
      }}>
        <Outlet />
      </div>
      <ToastContainer />
      <ChatFlutuante />
    </div>
  )
}
