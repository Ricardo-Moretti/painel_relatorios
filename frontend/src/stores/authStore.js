/**
 * Store de Autenticação (Zustand)
 * Gerencia estado global do usuário autenticado
 */
import { create } from 'zustand'
import { authAPI } from '../services/api'

const useAuthStore = create((set) => ({
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  token: localStorage.getItem('token'),
  carregando: false,
  erro: null,

  /** Realiza login */
  login: async (email, senha) => {
    set({ carregando: true, erro: null })
    try {
      const { data } = await authAPI.login(email, senha)
      const { token, usuario } = data.dados
      localStorage.setItem('token', token)
      localStorage.setItem('usuario', JSON.stringify(usuario))
      set({ usuario, token, carregando: false })
      return true
    } catch (error) {
      const mensagem = error.response?.data?.mensagem || 'Erro ao fazer login'
      set({ erro: mensagem, carregando: false })
      return false
    }
  },

  /** Realiza logout */
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    set({ usuario: null, token: null })
  },

  /** Limpa mensagem de erro */
  limparErro: () => set({ erro: null }),
}))

export default useAuthStore
