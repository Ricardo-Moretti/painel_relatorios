/**
 * Explorar Chamados — Pesquisa avançada com filtros interativos
 */
import { useState, useEffect } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight, Calendar, Users, Tag, AlertTriangle, User, Save, Trash2, ChevronDown } from 'lucide-react'
import Header from '../components/layout/Header'
import { glpiAPI } from '../services/api'
import useAuthStore from '../stores/authStore'

const STATUS = { 1:'Novo', 2:'Atribuído', 3:'Planejado', 4:'Pendente', 5:'Solucionado', 6:'Fechado' }
const STATUS_COR = { 1:'#94a3b8', 2:'#16a34a', 3:'#f59e0b', 4:'#f97316', 5:'#017efa', 6:'#64748b' }
const PRIO = { 1:'Muito baixa', 2:'Baixa', 3:'Média', 4:'Alta', 5:'Muito alta', 6:'Crítica' }
const PRIO_COR = { 1:'#94a3b8', 2:'#16a34a', 3:'#f59e0b', 4:'#f97316', 5:'#ef4444', 6:'#a855f7' }

export default function ExplorarChamadosPage() {
  const [chamados, setChamados] = useState([])
  const [total, setTotal] = useState(0)
  const [filtros, setFiltros] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [meusChamados, setMeusChamados] = useState(false)
  const [filtrosSalvos, setFiltrosSalvos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glpi_saved_filters') || '[]') } catch { return [] }
  })
  const [showSalvarFiltro, setShowSalvarFiltro] = useState(false)
  const [nomeFiltro, setNomeFiltro] = useState('')
  const [showDropdownFiltros, setShowDropdownFiltros] = useState(false)
  const usuario = useAuthStore(s => s.usuario)

  const [f, setF] = useState({ dias: 90, categoria: '', atendente: '', status: '', urgencia: '', prioridade: '', busca: '', ordenar: 'recentes' })

  useEffect(() => { carregarFiltros() }, [])
  useEffect(() => { buscar() }, [f, pagina])

  // Toggle meus chamados
  const toggleMeusChamados = () => {
    if (meusChamados) {
      setMeusChamados(false)
      atualizar('atendente', '')
    } else {
      setMeusChamados(true)
      atualizar('atendente', usuario?.nome || usuario?.name || '')
    }
  }

  // Saved filters helpers
  const salvarFiltroAtual = () => {
    if (!nomeFiltro.trim()) return
    const novo = { nome: nomeFiltro.trim(), filtros: { ...f } }
    const atualizado = [...filtrosSalvos, novo]
    setFiltrosSalvos(atualizado)
    localStorage.setItem('glpi_saved_filters', JSON.stringify(atualizado))
    setNomeFiltro('')
    setShowSalvarFiltro(false)
  }

  const aplicarFiltroSalvo = (filtroSalvo) => {
    setF(filtroSalvo.filtros)
    setPagina(0)
    setShowDropdownFiltros(false)
    setMeusChamados(false)
  }

  const removerFiltroSalvo = (index) => {
    const atualizado = filtrosSalvos.filter((_, i) => i !== index)
    setFiltrosSalvos(atualizado)
    localStorage.setItem('glpi_saved_filters', JSON.stringify(atualizado))
  }

  const carregarFiltros = async () => {
    try { const { data } = await glpiAPI.listarFiltros(); setFiltros(data.dados) } catch (e) { console.error(e) }
  }

  const buscar = async () => {
    setLoading(true)
    try {
      const { data } = await glpiAPI.explorar({ ...f, pagina, limite: 30 })
      setChamados(data.dados.chamados || [])
      setTotal(data.dados.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const atualizar = (campo, valor) => { setF(prev => ({ ...prev, [campo]: valor })); setPagina(0) }
  const totalPaginas = Math.ceil(total / 30)

  const sel = { padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-heading)', cursor: 'pointer', outline: 'none' }

  return (
    <>
      <Header titulo="Explorar Chamados" subtitulo={`${total} chamados encontrados`} />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '1600px', margin: '0 auto' }}>

          {/* Barra de busca */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar por título ou ID do chamado..." value={f.busca}
                onChange={(e) => atualizar('busca', e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 44px', borderRadius: '12px', fontSize: '14px', border: '1px solid var(--border-glow)', backgroundColor: 'var(--bg-card)', color: 'var(--text-heading)', outline: 'none', boxShadow: 'var(--shadow-xs)' }} />
            </div>
            <select value={f.ordenar} onChange={(e) => atualizar('ordenar', e.target.value)} style={sel}>
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="prioridade">Maior prioridade</option>
              <option value="urgencia">Maior urgência</option>
              <option value="sem_interacao">Sem interação</option>
            </select>
            <select value={f.dias} onChange={(e) => atualizar('dias', e.target.value)} style={sel}>
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">1 ano</option>
            </select>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <select value={f.status} onChange={(e) => atualizar('status', e.target.value)} style={sel}>
              <option value="">Todos status</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={f.urgencia} onChange={(e) => atualizar('urgencia', e.target.value)} style={sel}>
              <option value="">Todas urgências</option>
              {Object.entries(PRIO).filter(([k]) => k <= 5).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={f.prioridade} onChange={(e) => atualizar('prioridade', e.target.value)} style={sel}>
              <option value="">Todas prioridades</option>
              {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={f.categoria} onChange={(e) => atualizar('categoria', e.target.value)} style={sel}>
              <option value="">Todas categorias</option>
              {(filtros?.categorias || []).map(c => <option key={c.nome} value={c.nomeCompleto}>{c.nome} ({c.qtd})</option>)}
            </select>
            <select value={f.atendente} onChange={(e) => atualizar('atendente', e.target.value)} style={sel}>
              <option value="">Todos atendentes</option>
              {(filtros?.atendentes || []).map(a => <option key={a.nome} value={a.nome}>{a.nome} ({a.qtd})</option>)}
            </select>
            {/* Meus chamados toggle */}
            <button onClick={toggleMeusChamados}
              style={{ ...sel, backgroundColor: meusChamados ? '#017efa' : 'var(--bg-card)', color: meusChamados ? '#fff' : 'var(--text-heading)', border: meusChamados ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User style={{ width: '14px', height: '14px' }} /> Meus chamados
            </button>

            {(f.status || f.urgencia || f.prioridade || f.categoria || f.atendente || f.busca) && (
              <button onClick={() => { setF({ dias: f.dias, categoria: '', atendente: '', status: '', urgencia: '', prioridade: '', busca: '', ordenar: 'recentes' }); setMeusChamados(false) }}
                style={{ ...sel, backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>Limpar filtros</button>
            )}

            {/* Salvar filtro */}
            <div style={{ position: 'relative' }}>
              {showSalvarFiltro ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="text" placeholder="Nome do filtro..." value={nomeFiltro} onChange={(e) => setNomeFiltro(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && salvarFiltroAtual()}
                    style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-heading)', outline: 'none', width: '160px' }} />
                  <button onClick={salvarFiltroAtual}
                    style={{ ...sel, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px' }}>Salvar</button>
                  <button onClick={() => { setShowSalvarFiltro(false); setNomeFiltro('') }}
                    style={{ ...sel, backgroundColor: 'var(--bg-card)', padding: '8px 10px' }}>X</button>
                </div>
              ) : (
                <button onClick={() => setShowSalvarFiltro(true)}
                  style={{ ...sel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save style={{ width: '14px', height: '14px' }} /> Salvar filtro
                </button>
              )}
            </div>

            {/* Filtros salvos dropdown */}
            {filtrosSalvos.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowDropdownFiltros(!showDropdownFiltros)}
                  style={{ ...sel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter style={{ width: '14px', height: '14px' }} /> Filtros salvos <ChevronDown style={{ width: '12px', height: '12px' }} />
                </button>
                {showDropdownFiltros && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 50, minWidth: '220px', padding: '6px', overflow: 'hidden' }}>
                    {filtrosSalvos.map((fs, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 100ms' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <span onClick={() => aplicarFiltroSalvo(fs)} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)', flex: 1 }}>{fs.nome}</span>
                        <button onClick={(e) => { e.stopPropagation(); removerFiltroSalvo(i) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          <Trash2 style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rankings rápidos */}
          {filtros?.rankings && !f.busca && !f.categoria && !f.atendente && (
            <div className="grid-1-1" style={{ marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm), var(--glow-card)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '14px' }}>📋 Categorias mais requisitadas (90d)</h3>
                {filtros.rankings.maisRequisitadas.slice(0, 8).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                    onClick={() => atualizar('categoria', c.categoria)}>
                    <span style={{ fontSize: '13px', color: 'var(--text-heading)' }}>{c.categoria}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.mediaHoras}h média</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#017efa' }}>{c.total}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm), var(--glow-card)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '14px' }}>🏆 Atendentes com mais chamados (90d)</h3>
                {filtros.rankings.maisAtendimentos.slice(0, 8).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                    onClick={() => atualizar('atendente', a.atendente)}>
                    <span style={{ fontSize: '13px', color: 'var(--text-heading)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {a.atendente}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#16a34a' }}>{a.solucionados} resolvidos</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#017efa' }}>{a.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de chamados */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: '14px', boxShadow: 'var(--shadow-sm), var(--glow-card)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-inset)', borderBottom: '2px solid var(--border)' }}>
                  {['ID', 'Título', 'Status', 'Prioridade', 'Atendente', 'Categoria', 'Idade', 'SLA'].map(c => (
                    <th key={c} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '60px', textAlign: 'center' }}>
                    <div className="animate-spin" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', margin: '0 auto' }} />
                  </td></tr>
                ) : chamados.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Nenhum chamado encontrado</td></tr>
                ) : chamados.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent', transition: 'background 100ms' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'var(--bg-inset)' : 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#017efa' }}>#{c.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-heading)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.titulo}>{c.titulo}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, backgroundColor: `${STATUS_COR[c.status]}15`, border: `1px solid ${STATUS_COR[c.status]}30`, color: STATUS_COR[c.status] }}>
                        {c.status_icone} {c.status_nome}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: PRIO_COR[c.priority] }}>{c.prioridade_nome}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{c.atendente}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.categoria}>{c.categoria?.split(' > ').pop()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: c.idade_dias > 90 ? '#ef4444' : c.idade_dias > 45 ? '#f59e0b' : 'var(--text-heading)' }}>{c.idade_dias === 0 ? 'Hoje' : c.idade_dias + 'd'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.sla_excedido ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef2f2', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>FORA</span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#f0fdf4', border: '1px solid rgba(22,163,74,0.25)', color: '#16a34a' }}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Página {pagina + 1} de {totalPaginas} ({total} resultados)</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setPagina(Math.max(0, pagina - 1))} disabled={pagina === 0}
                    style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: pagina === 0 ? 'default' : 'pointer', opacity: pagina === 0 ? 0.4 : 1 }}>
                    <ChevronLeft style={{ width: '14px', height: '14px' }} /> Anterior
                  </button>
                  <button onClick={() => setPagina(Math.min(totalPaginas - 1, pagina + 1))} disabled={pagina >= totalPaginas - 1}
                    style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: pagina >= totalPaginas - 1 ? 'default' : 'pointer', opacity: pagina >= totalPaginas - 1 ? 0.4 : 1 }}>
                    Próxima <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  )
}
