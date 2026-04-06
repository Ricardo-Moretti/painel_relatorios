/**
 * Store de Tema (Zustand)
 * Gerencia dark mode com persistência + auto-detecção por horário
 */
import { create } from 'zustand'

function isNightTime() {
  const hour = new Date().getHours()
  return hour >= 18 || hour < 7
}

const useThemeStore = create((set, get) => ({
  tema: localStorage.getItem('tema') || 'light',
  manualOverride: false,
  _autoInterval: null,

  /** Alterna entre light e dark mode (manual — desliga auto para esta sessão) */
  alternarTema: () => set((state) => {
    const novoTema = state.tema === 'light' ? 'dark' : 'light'
    localStorage.setItem('tema', novoTema)
    document.documentElement.classList.toggle('dark', novoTema === 'dark')
    return { tema: novoTema, manualOverride: true }
  }),

  /** Aplica tema baseado no horário (só se não houve toggle manual) */
  _aplicarAuto: () => {
    const { manualOverride } = get()
    if (manualOverride) return
    const novoTema = isNightTime() ? 'dark' : 'light'
    const { tema } = get()
    if (novoTema !== tema) {
      localStorage.setItem('tema', novoTema)
      document.documentElement.classList.toggle('dark', novoTema === 'dark')
      set({ tema: novoTema })
    }
  },

  /** Inicializa tema salvo + inicia auto-detecção a cada 1 minuto */
  inicializar: () => {
    const temaSalvo = localStorage.getItem('tema') || (isNightTime() ? 'dark' : 'light')
    localStorage.setItem('tema', temaSalvo)
    document.documentElement.classList.toggle('dark', temaSalvo === 'dark')
    set({ tema: temaSalvo, manualOverride: false })

    // Limpa intervalo anterior se houver
    const prev = get()._autoInterval
    if (prev) clearInterval(prev)

    // Checa a cada 60 segundos
    const interval = setInterval(() => {
      get()._aplicarAuto()
    }, 60000)
    set({ _autoInterval: interval })
  },
}))

export default useThemeStore
