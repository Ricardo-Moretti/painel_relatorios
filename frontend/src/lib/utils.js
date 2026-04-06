import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina classes CSS com suporte a condicional e merge de Tailwind */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Formata data para exibição (DD/MM/YYYY) */
export function formatarData(data) {
  if (!data) return '-'
  const d = new Date(data + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

/** Formata número com vírgula decimal */
export function formatarNumero(num) {
  return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** Retorna cor CSS para cada status */
export function corStatus(status) {
  const cores = {
    'Sucesso': 'var(--green)',
    'Erro': 'var(--red)',
    'Parcial': 'var(--amber)',
  }
  return cores[status] || 'var(--text-muted)'
}

/** Retorna cor de tendência */
export function corTendencia(tendencia) {
  const cores = {
    'melhorando': 'var(--green)',
    'piorando': 'var(--red)',
    'estavel': 'var(--text-muted)',
  }
  return cores[tendencia] || 'var(--text-muted)'
}
