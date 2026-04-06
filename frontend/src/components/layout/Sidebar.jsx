/**
 * Sidebar — Toggle via Zustand (desktop + mobile)
 */
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Upload, History, AlertTriangle, Monitor, Activity, Menu, ChevronLeft, ClipboardEdit, Shield, Search } from 'lucide-react'
import useSidebarStore from '../../stores/sidebarStore'
import useAuthStore from '../../stores/authStore'
import { useState, useEffect } from 'react'

// Itens visíveis para todos
const menuBase = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
]

// Itens visíveis apenas para admin
const menuAdmin = [
  { path: '/registro', icon: ClipboardEdit, label: 'Registro Diario' },
  { path: '/importacao', icon: Upload, label: 'Importacao' },
  { path: '/historico', icon: History, label: 'Historico' },
  { path: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { path: '/glpi', icon: Monitor, label: 'GLPI' },
  { path: '/sla', icon: Shield, label: 'SLA Detalhado' },
  { path: '/explorar', icon: Search, label: 'Explorar Chamados' },
]

export default function Sidebar() {
  const location = useLocation()
  const { aberta, toggle, fechar, desktopAberta, toggleDesktop } = useSidebarStore()
  const usuario = useAuthStore(s => s.usuario)
  const isAdmin = usuario?.role === 'admin'
  const menuItems = isAdmin ? [...menuBase, ...menuAdmin] : menuBase
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const sidebarVisivel = isMobile ? aberta : desktopAberta

  const handleFechar = () => { if (isMobile) fechar(); else toggleDesktop() }
  const handleAbrir = () => { if (isMobile) toggle(); else toggleDesktop() }

  return (
    <>
      {/* Botão abrir — pequeno, canto superior esquerdo */}
      {!sidebarVisivel && (
        <button onClick={handleAbrir} style={{
          position: 'fixed', top: '14px', left: '14px', zIndex: 60,
          width: '36px', height: '36px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#081a51', border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer', color: '#8ba3c7',
          transition: 'all 150ms',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#8ba3c7'}>
          <Menu style={{ width: '18px', height: '18px' }} />
        </button>
      )}

      {/* Backdrop mobile */}
      {isMobile && sidebarVisivel && (
        <div onClick={handleFechar} style={{
          position: 'fixed', inset: 0, zIndex: 40,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: '240px', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#081a51',
        transition: 'transform 250ms ease',
        transform: sidebarVisivel ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: '2px 0 20px rgba(0,0,0,0.15)',
      }}>
        {/* Logo + fechar */}
        <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #017efa, #6342ff)' }}>
              <Activity style={{ width: '18px', height: '18px', color: '#fff' }} strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Painel</h1>
              <p style={{ fontSize: '10px', color: '#51cbff', fontWeight: 500 }}>Gestao Operacional</p>
            </div>
          </div>
          <button onClick={handleFechar} style={{
            color: '#64748b', background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '8px', transition: 'all 150ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'transparent' }}>
            <ChevronLeft style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Menu label */}
        <div style={{ padding: '24px 20px 10px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#4a6fa5' }}>Menu Principal</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', overflow: 'auto' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <NavLink key={item.path} to={item.path} onClick={() => { if (isMobile) handleFechar() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 14px', borderRadius: '10px', marginBottom: '4px',
                  fontSize: '14px', textDecoration: 'none',
                  transition: 'all 150ms',
                  color: isActive ? '#ffffff' : '#8ba3c7',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#017efa' : 'transparent',
                  boxShadow: isActive ? '0 4px 12px rgba(1,126,250,0.3)' : 'none',
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8ba3c7' } }}>
                <item.icon style={{ width: '18px', height: '18px' }} strokeWidth={isActive ? 2.2 : 1.7} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(1,126,250,0.08)', border: '1px solid rgba(1,126,250,0.15)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#51cbff' }}>Dica</p>
            <p style={{ fontSize: '11px', color: '#8ba3c7', marginTop: '4px', lineHeight: 1.5 }}>Importe dados atualizados diariamente.</p>
          </div>
        </div>
      </aside>
    </>
  )
}
