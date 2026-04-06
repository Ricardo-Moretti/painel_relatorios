/**
 * Serviço DPM — Verifica se o arquivo DPM foi gerado
 * Acessa pasta de rede compartilhada (somente leitura)
 * Nunca modifica/cria/deleta arquivos no servidor
 */
const fs = require('fs');
const path = require('path');
const rotinaRepository = require('../repositories/rotinaRepository');
const { pool } = require('../config/database');

// Configuracao
const DPM_PATH = '//192.168.109.228/dtf/dpmext/salva';
const DPM_PATTERN = 'DLR2JD_DPMEXT_D_201077_'; // Prefixo do arquivo diario

// Resolve the canonical base path for traversal checks
const DPM_BASE_RESOLVED = path.resolve(DPM_PATH);

/**
 * Valida que um caminho de arquivo esta dentro do diretorio DPM esperado
 * Previne path traversal attacks (../ etc)
 * @param {string} filename - nome do arquivo a validar
 * @returns {boolean}
 */
function isPathSafe(filename) {
  if (!filename) return false;
  // Block any path traversal characters
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
  // Validate resolved path stays within DPM_BASE
  const resolved = path.resolve(DPM_PATH, filename);
  return resolved.startsWith(DPM_BASE_RESOLVED);
}

const dpmService = {

  /**
   * Verifica se o DPM foi gerado para uma data específica
   * @param {string} data - formato YYYYMMDD (ex: '20260330')
   * @returns {object} { encontrado, arquivos, detalhes }
   */
  verificarArquivo(data) {
    try {
      // Validate input: data must be digits only (YYYYMMDD format)
      if (!data || !/^\d{8}$/.test(data)) {
        return {
          encontrado: false,
          arquivo: null,
          totalArquivos: 0,
          horarioGeracao: null,
          detalhes: 'Formato de data invalido (esperado YYYYMMDD)',
        };
      }

      const files = fs.readdirSync(DPM_PATH);
      const encontrados = files.filter(f => {
        // Validate each filename is safe (no path traversal)
        if (!isPathSafe(f)) return false;
        return f.startsWith(DPM_PATTERN) && f.includes(data);
      });

      if (encontrados.length > 0) {
        // Pegar o mais recente (ultimo horario)
        const ultimo = encontrados.sort().pop();
        // Extrair horario do nome: ...YYYYMMDD_HHMMSS.DPM
        const horario = ultimo.match(/_(\d{6})\.DPM$/);
        const horaStr = horario ? `${horario[1].slice(0,2)}:${horario[1].slice(2,4)}:${horario[1].slice(4,6)}` : '';

        return {
          encontrado: true,
          arquivo: ultimo,
          totalArquivos: encontrados.length,
          horarioGeracao: horaStr,
          detalhes: `Arquivo DPM gerado as ${horaStr} (${encontrados.length} arquivo(s) no dia)`,
        };
      }

      return {
        encontrado: false,
        arquivo: null,
        totalArquivos: 0,
        horarioGeracao: null,
        detalhes: `Arquivo DPM NAO encontrado para a data ${data}`,
      };
    } catch (e) {
      // Don't expose full file paths in error messages
      const safeMessage = e.code === 'ENOENT' ? 'Pasta DPM inacessivel' :
                          e.code === 'EACCES' ? 'Sem permissao para acessar pasta DPM' :
                          'Erro ao acessar pasta DPM';
      return {
        encontrado: false,
        arquivo: null,
        erro: safeMessage,
        detalhes: `Erro ao acessar pasta DPM: ${safeMessage}`,
      };
    }
  },

  /**
   * Executa a verificação diária e registra no Painel
   * Verifica o dia anterior (DPM roda às 23h, verificamos no dia seguinte)
   */
  async verificacaoDiaria() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dataStr = ontem.toISOString().split('T')[0]; // YYYY-MM-DD
    const dataArquivo = dataStr.replace(/-/g, ''); // YYYYMMDD

    console.log(`[DPM] Verificando arquivo para ${dataStr}...`);

    const resultado = this.verificarArquivo(dataArquivo);

    // Registrar no Painel
    const rotina = await rotinaRepository.criarOuBuscar('DPM');
    const status = resultado.encontrado ? 'Sucesso' : 'Erro';

    await pool.execute('DELETE FROM execucoes WHERE rotina_id = ? AND data_execucao = ?', [rotina.id, dataStr]);
    await pool.execute(
      'INSERT INTO execucoes (rotina_id, data_execucao, status, detalhes) VALUES (?, ?, ?, ?)',
      [rotina.id, dataStr, status, resultado.detalhes]
    );

    console.log(`[DPM] ${dataStr}: ${status} — ${resultado.detalhes}`);

    return { data: dataStr, ...resultado, status };
  },

  /**
   * Verifica múltiplos dias (backfill)
   * Útil para preencher dias anteriores que não foram verificados
   */
  async verificarPeriodo(dias = 7) {
    const resultados = [];
    for (let i = 1; i <= dias; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dataStr = d.toISOString().split('T')[0];
      const dataArquivo = dataStr.replace(/-/g, '');

      const resultado = this.verificarArquivo(dataArquivo);
      const rotina = await rotinaRepository.criarOuBuscar('DPM');
      const status = resultado.encontrado ? 'Sucesso' : 'Erro';

      await pool.execute('DELETE FROM execucoes WHERE rotina_id = ? AND data_execucao = ?', [rotina.id, dataStr]);
      await pool.execute(
        'INSERT INTO execucoes (rotina_id, data_execucao, status, detalhes) VALUES (?, ?, ?, ?)',
        [rotina.id, dataStr, status, resultado.detalhes]
      );

      resultados.push({ data: dataStr, status, detalhes: resultado.detalhes });
    }
    return resultados;
  },

  /** Verifica se a pasta DPM esta acessivel */
  testarAcesso() {
    try {
      const files = fs.readdirSync(DPM_PATH);
      return { acessivel: true, totalArquivos: files.length };
    } catch (e) {
      // Don't expose full paths in error response
      const safeMessage = e.code === 'ENOENT' ? 'Pasta nao encontrada' :
                          e.code === 'EACCES' ? 'Sem permissao' :
                          'Erro de acesso';
      return { acessivel: false, erro: safeMessage };
    }
  },
};

module.exports = dpmService;
