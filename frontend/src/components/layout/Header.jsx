/**
 * Header — Estilo dashboard referência (limpo, branco, sombra sutil)
 * + Relógio em tempo real + Indicador GLPI online/offline
 */
import { Moon, Sun, Bell, LogOut, Search } from 'lucide-react'
import useThemeStore from '../../stores/themeStore'
import useAuthStore from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { dashboardAPI, glpiAPI } from '../../services/api'
import useSidebarStore from '../../stores/sidebarStore'

export default function Header({ titulo, subtitulo }) {
  const { tema, alternarTema } = useThemeStore()
  const { usuario, logout } = useAuthStore()
  const desktopAberta = useSidebarStore(s => s.desktopAberta)
  const navigate = useNavigate()
  const [alertas, setAlertas] = useState([])
  const [mostrarPerfil, setMostrarPerfil] = useState(false)
  const perfilRef = useRef(null)

  // Relógio em tempo real
  const [agora, setAgora] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dataFormatada = agora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

  // GLPI status indicator
  const [glpiOnline, setGlpiOnline] = useState(null)
  const [glpiHover, setGlpiHover] = useState(false)
  useEffect(() => {
    const checkGlpi = () => {
      glpiAPI.statusIntegracao()
        .then(() => setGlpiOnline(true))
        .catch(() => setGlpiOnline(false))
    }
    checkGlpi()
    const interval = setInterval(checkGlpi, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { dashboardAPI.obterAlertas().then(({ data }) => setAlertas(data.dados || [])).catch(() => {}) }, [])
  useEffect(() => {
    const h = (e) => { if (perfilRef.current && !perfilRef.current.contains(e.target)) setMostrarPerfil(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const btnStyle = { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 150ms' }

  return (
    <header style={{
      height: '52px', minHeight: '52px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: desktopAberta ? '0 36px' : '0 36px 0 64px',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-card)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      zIndex: 20,
    }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.2 }}>{titulo}</h2>
        {subtitulo && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitulo}</p>}
      </div>

      {/* Relógio + Data — centro */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '6px 16px', borderRadius: '999px',
        backgroundColor: 'var(--bg-inset)',
        border: '1px solid var(--border-light)',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)', textTransform: 'capitalize' }}>
          {dataFormatada}
        </span>
        <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border)' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>
          {horaFormatada}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* GLPI Status Indicator */}
        {glpiOnline !== null && (
          <div
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', cursor: 'default' }}
            onMouseEnter={() => setGlpiHover(true)}
            onMouseLeave={() => setGlpiHover(false)}
          >
            <span style={{
              display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: glpiOnline ? '#16a34a' : '#ef4444',
              boxShadow: glpiOnline ? '0 0 6px rgba(22,163,74,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
            }} />
            {glpiHover && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                padding: '6px 12px', borderRadius: '8px', whiteSpace: 'nowrap',
                backgroundColor: 'var(--text-heading)', color: 'var(--bg-card)',
                fontSize: '11px', fontWeight: 600, zIndex: 100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                GLPI: {glpiOnline ? 'Online' : 'Offline'}
              </div>
            )}
          </div>
        )}

        <button onClick={() => navigate('/alertas')} style={{ ...btnStyle, position: 'relative' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-inset)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Bell style={{ width: '18px', height: '18px' }} strokeWidth={1.7} />
          {alertas.length > 0 && <span style={{ position: 'absolute', top: '8px', right: '8px', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: 'var(--red)', border: '2px solid var(--bg-card)' }} />}
        </button>

        <button onClick={alternarTema} style={btnStyle}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-inset)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          {tema === 'light' ? <Moon style={{ width: '18px', height: '18px' }} strokeWidth={1.7} /> : <Sun style={{ width: '18px', height: '18px' }} strokeWidth={1.7} />}
        </button>

        <div style={{ width: '1px', height: '24px', margin: '0 10px', backgroundColor: 'var(--border)' }} />

        <div style={{ position: 'relative' }} ref={perfilRef}>
          <button onClick={() => setMostrarPerfil(!mostrarPerfil)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 14px 5px 5px', borderRadius: '10px', border: '1px solid var(--border-card)', background: 'var(--bg-card)', cursor: 'pointer', transition: 'all 150ms', boxShadow: 'var(--shadow-xs)' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, background: 'linear-gradient(135deg, #017efa, #6342ff)' }}>
              {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{usuario?.nome || 'Usuario'}</span>
          </button>

          {mostrarPerfil && (
            <div className="animate-slide-down" style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '220px',
              borderRadius: '12px', padding: '6px 0', zIndex: 50,
              backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-card)',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>{usuario?.nome}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{usuario?.email}</p>
              </div>
              <button onClick={() => { logout(); navigate('/login') }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 18px', fontSize: '13px', fontWeight: 500, color: 'var(--red)', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 150ms' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <LogOut style={{ width: '16px', height: '16px' }} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
