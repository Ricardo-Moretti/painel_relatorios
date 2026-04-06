/**
 * Importacao — 100% CSS inline
 */
import { useState, useEffect, useCallback } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock, Info } from 'lucide-react'
import Header from '../components/layout/Header'
import { importacaoAPI } from '../services/api'

export default function ImportacaoPage() {
  const [drag, setDrag] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [hist, setHist] = useState([])
  const [erro, setErro] = useState(null)

  useEffect(() => { loadHist() }, [])
  const loadHist = async () => { try { const { data } = await importacaoAPI.historico(); setHist(data.dados || []) } catch (e) { console.error(e) } }

  const process = async (f) => {
    if (!f) return
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) { setErro('Use .xlsx, .xls ou .csv'); return }
    setSending(true); setErro(null); setResult(null)
    const fd = new FormData(); fd.append('arquivo', f)
    try { const { data } = await importacaoAPI.upload(fd); setResult(data.dados); loadHist() }
    catch (e) { setErro(e.response?.data?.mensagem || 'Erro ao processar') }
    finally { setSending(false) }
  }

  const onDrop = useCallback((e) => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files[0]) }, [])

  const box = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glow)', boxShadow: 'var(--shadow-sm), var(--glow-card)', borderRadius: '12px', padding: '24px' }

  return (
    <>
      <Header titulo="Importacao" subtitulo="Upload de dados" />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        <div className="page-content" style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Upload */}
          <div style={{ ...box, marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)' }}>Upload de Dados</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '20px' }}>Arraste um arquivo ou clique para selecionar</p>

            <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              onClick={() => document.getElementById('fi').click()}
              style={{
                borderRadius: '12px', padding: '56px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 200ms',
                border: `2px dashed ${drag ? 'var(--blue)' : 'var(--border)'}`,
                backgroundColor: drag ? 'var(--blue-subtle)' : 'var(--bg-inset)',
              }}>
              <input id="fi" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { process(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />
              {sending ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue)' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Processando arquivo...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--blue-subtle)', border: '1px solid var(--blue-border)' }}>
                    <Upload style={{ width: '24px', height: '24px', color: 'var(--blue)' }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-heading)' }}>Arraste ou clique para selecionar</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>.xlsx, .xls, .csv — max 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div style={{ marginTop: '20px', padding: '20px', borderRadius: '12px', backgroundColor: 'var(--green-subtle)', border: '1px solid var(--green-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CheckCircle2 style={{ width: '20px', height: '20px', color: 'var(--green)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>Importacao concluida!</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                  {[{ l: 'Total', v: result.total, c: 'var(--text-heading)' }, { l: 'Inseridos', v: result.inseridos, c: 'var(--green)' }, { l: 'Ignorados', v: result.ignorados, c: 'var(--amber)' }].map(({ l, v, c }) => (
                    <div key={l}>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: c }}>{v}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {erro && (
              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--red-subtle)', border: '1px solid var(--red-border)' }}>
                <XCircle style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--red)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--red)' }}>{erro}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ ...box, marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'var(--blue-subtle)', border: '1px solid var(--blue-border)' }}>
                <Info style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>Formato esperado</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.6 }}>
                  Colunas: <strong>Rotina | Data | Status | Detalhes</strong> (opcional). Duplicatas sao ignoradas automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Historico */}
          <div style={{ ...box, padding: 0 }}>
            <div style={{ padding: '20px 24px 12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)' }}>Historico de Importacoes</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Ultimos uploads realizados</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-inset)', borderBottom: '1px solid var(--border)' }}>
                    {['Arquivo', 'Data', 'Inseridos', 'Ignorados', 'Usuario'].map((c) => (
                      <th key={c} style={{ textAlign: 'left', padding: '12px 20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hist.map((h, i) => (
                    <tr key={h.id}
                      style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: i % 2 === 1 ? 'var(--bg-inset)' : 'transparent', transition: 'background 100ms' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 1 ? 'var(--bg-inset)' : 'transparent'}>
                      <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet style={{ width: '16px', height: '16px', color: 'var(--green)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-heading)' }}>{h.nome_arquivo}</span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />{new Date(h.data_importacao).toLocaleString('pt-BR')}</span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>{h.registros_inseridos}</td>
                      <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{h.registros_ignorados}</td>
                      <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>{h.usuario_nome || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hist.length === 0 && <div style={{ textAlign: 'center', padding: '56px 16px' }}><p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nenhuma importacao realizada.</p></div>}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
