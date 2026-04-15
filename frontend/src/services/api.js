/**
 * Serviço de API centralizado
 * Gerencia todas as chamadas HTTP para o backend
 */
import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  timeout: 30000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

/** Serviços de Autenticação */
export const authAPI = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  registrar: (dados) => api.post('/auth/registrar', dados),
  perfil: () => api.get('/auth/perfil'),
}

/** Serviços do Dashboard */
export const dashboardAPI = {
  obterDados: (params) => api.get('/dashboard', { params }),
  obterAlertas: () => api.get('/dashboard/alertas'),
  obterHeatmap: (dias) => api.get('/dashboard/heatmap', { params: { dias } }),
  analiseMensal: () => api.get('/dashboard/mensal'),
  obterDadosAvancados: (dias) => api.get('/dashboard/avancado', { params: { dias } }),
  obterHistoricoRotina: (id, dias) => api.get('/dashboard/rotina/' + id + '/historico', { params: { dias } }),
  obterCalendarioHeatmap: (mes) => api.get('/dashboard/calendario', { params: { mes } }),
  obterGlpiTendencia: (dias) => api.get('/dashboard/glpi-tendencia', { params: { dias } }),
  obterGlpiEnvelhecimento: (dias) => api.get('/dashboard/glpi-envelhecimento', { params: { dias } }),
  obterComparacao: (dias) => api.get('/dashboard/comparacao', { params: { dias } }),
  obterResumoMultiPeriodo: (rotina) => api.get('/dashboard/resumo-multi', { params: { rotina } }),
}

/** Serviços de Importação */
export const importacaoAPI = {
  upload: (formData) => api.post('/importacao/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  historico: () => api.get('/importacao/historico'),
}

/** Serviços de Rotinas */
export const rotinasAPI = {
  listar: () => api.get('/rotinas'),
  buscar: (id) => api.get(`/rotinas/${id}`),
  criar: (dados) => api.post('/rotinas', dados),
  execucoes: (params) => api.get('/rotinas/execucoes', { params }),
  registroDiario: (dados) => api.post('/rotinas/registro-diario', dados),
}

/** Serviços de GLPI */
export const glpiAPI = {
  listar: (params) => api.get('/glpi', { params }),
  inserir: (dados) => api.post('/glpi', dados),
  estatisticas: (dias) => api.get('/glpi/estatisticas', { params: { dias } }),
  coletar: () => api.post('/glpi/coletar'),
  testarConexao: () => api.get('/glpi/testar'),
  obterBI: (dias) => api.get('/glpi/bi', { params: { dias } }),
  obterSLADetalhado: (dias) => api.get('/glpi/sla-detalhado', { params: { dias } }),
  explorar: (params) => api.get('/glpi/explorar', { params }),
  metricasCategorias: (dias) => api.get('/glpi/metricas-categorias', { params: { dias } }),
  listarFiltros: () => api.get('/glpi/filtros'),
  compararMeses: () => api.get('/glpi/comparar-meses'),
  statusIntegracao: () => api.get('/glpi/status-integracao'),
}

/** Serviços de IA */
export const aiAPI = {
  anomalias: () => api.get('/ai/anomalias'),
  chat: (pergunta) => api.post('/ai/chat', { pergunta }, { timeout: 90000 }),
  resumoChamados: () => api.get('/ai/resumo-chamados'),
  previsao: () => api.get('/ai/previsao'),
}

export default api
