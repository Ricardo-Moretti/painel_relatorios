/**
 * Componente raiz da aplicação
 * Define rotas e proteção de autenticação
 */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './stores/authStore'
import useThemeStore from './stores/themeStore'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ImportacaoPage from './pages/ImportacaoPage'
import HistoricoPage from './pages/HistoricoPage'
import AlertasPage from './pages/AlertasPage'
import GlpiPage from './pages/GlpiPage'
import RegistroDiarioPage from './pages/RegistroDiarioPage'
import SlaDetalhadoPage from './pages/SlaDetalhadoPage'
import ExplorarChamadosPage from './pages/ExplorarChamadosPage'

/** Proteção de rota - redireciona para login se não autenticado */
function RotaPrivada({ children }) {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

/** Proteção de rota admin - redireciona para dashboard se não admin */
function RotaAdmin({ children }) {
  const usuario = useAuthStore((state) => state.usuario)
  if (usuario?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const { inicializar } = useThemeStore()

  // Inicializa tema ao carregar
  useEffect(() => {
    inicializar()
  }, [])

  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas privadas com layout */}
      <Route
        element={
          <RotaPrivada>
            <MainLayout />
          </RotaPrivada>
        }
      >
        {/* Todos os usuários */}
        <Route path="/" element={<DashboardPage />} />

        {/* Admin only */}
        <Route path="/registro" element={<RotaAdmin><RegistroDiarioPage /></RotaAdmin>} />
        <Route path="/importacao" element={<RotaAdmin><ImportacaoPage /></RotaAdmin>} />
        <Route path="/historico" element={<RotaAdmin><HistoricoPage /></RotaAdmin>} />
        <Route path="/alertas" element={<RotaAdmin><AlertasPage /></RotaAdmin>} />
        <Route path="/glpi" element={<RotaAdmin><GlpiPage /></RotaAdmin>} />
        <Route path="/sla" element={<RotaAdmin><SlaDetalhadoPage /></RotaAdmin>} />
        <Route path="/explorar" element={<RotaAdmin><ExplorarChamadosPage /></RotaAdmin>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
