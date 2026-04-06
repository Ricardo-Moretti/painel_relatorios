/**
 * Service de Importação de Excel
 * Trata GLPI como caso especial (status = número = quantidade de chamados)
 * "FRACASSO" → Erro
 */
const XLSX = require('xlsx');
const rotinaRepository = require('../repositories/rotinaRepository');
const importacaoRepository = require('../repositories/importacaoRepository');
const glpiRepository = require('../repositories/glpiRepository');
const { db } = require('../config/database');

const importacaoService = {
  processar(filePath, nomeArquivo, usuarioId) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(sheet);

    if (!dados.length) {
      throw Object.assign(new Error('Planilha vazia ou formato inválido'), { statusCode: 400 });
    }

    const colunas = Object.keys(dados[0]);
    const mapa = this._mapearColunas(colunas);

    let inseridos = 0;
    let ignorados = 0;

    const transacao = db.transaction(() => {
      for (const linha of dados) {
        const nomeRotina = this._extrairValor(linha, mapa.rotina);
        const dataExecucao = this._extrairData(linha, mapa.data);
        const statusRaw = mapa.status ? linha[mapa.status] : null;
        const detalhes = mapa.detalhes ? (this._extrairValor(linha, mapa.detalhes) || '') : '';

        if (!nomeRotina || !dataExecucao) {
          ignorados++;
          continue;
        }

        // GLPI especial: status é número = quantidade de chamados
        if (nomeRotina.toUpperCase() === 'GLPI' && typeof statusRaw === 'number') {
          try {
            const insertGlpi = db.prepare('INSERT OR REPLACE INTO indicadores_glpi (data, quantidade) VALUES (?, ?)');
            insertGlpi.run(dataExecucao, statusRaw);

            // Também inserir como execução para aparecer na tabela
            const rotina = rotinaRepository.criarOuBuscar(nomeRotina);
            // Status do GLPI: baseado na quantidade
            const statusGlpi = statusRaw <= 30 ? 'Sucesso' : statusRaw <= 50 ? 'Parcial' : 'Erro';
            rotinaRepository.inserirExecucao({
              rotina_id: rotina.id,
              data_execucao: dataExecucao,
              status: statusGlpi,
              detalhes: detalhes || `${statusRaw} chamados`,
              origem_arquivo: nomeArquivo
            });

            inseridos++;
          } catch (e) {
            ignorados++;
          }
          continue;
        }

        // Rotinas normais
        const status = this._normalizarStatus(statusRaw?.toString());
        if (!status) {
          ignorados++;
          continue;
        }

        const rotina = rotinaRepository.criarOuBuscar(nomeRotina);
        const foiInserido = rotinaRepository.inserirExecucao({
          rotina_id: rotina.id,
          data_execucao: dataExecucao,
          status,
          detalhes,
          origem_arquivo: nomeArquivo
        });

        if (foiInserido) inseridos++;
        else ignorados++;
      }
    });

    transacao();

    importacaoRepository.registrar({
      nome_arquivo: nomeArquivo,
      registros_inseridos: inseridos,
      registros_ignorados: ignorados,
      usuario_id: usuarioId
    });

    return { inseridos, ignorados, total: dados.length };
  },

  _mapearColunas(colunas) {
    const lower = colunas.map(c => c.toLowerCase());
    const mapa = { rotina: null, data: null, status: null, detalhes: null };

    const padroes = {
      rotina: ['rotina', 'nome', 'tarefa', 'atividade', 'processo', 'routine', 'name'],
      data: ['data', 'date', 'dia', 'data_execucao', 'data execução', 'execução', 'execucao'],
      status: ['status', 'situação', 'situacao', 'resultado', 'state', 'estado'],
      detalhes: ['detalhe', 'detalhes', 'observação', 'observacao', 'obs', 'nota', 'details', 'descrição', 'descricao']
    };

    for (const [campo, termos] of Object.entries(padroes)) {
      for (let i = 0; i < lower.length; i++) {
        if (termos.some(t => lower[i].includes(t))) {
          mapa[campo] = colunas[i];
          break;
        }
      }
    }

    if (!mapa.rotina && colunas[0]) mapa.rotina = colunas[0];
    if (!mapa.data && colunas[1]) mapa.data = colunas[1];
    if (!mapa.status && colunas[2]) mapa.status = colunas[2];

    return mapa;
  },

  _extrairValor(linha, coluna) {
    if (!coluna) return null;
    return linha[coluna]?.toString().trim() || null;
  },

  _extrairData(linha, coluna) {
    const valor = this._extrairValor(linha, coluna);
    if (!valor) return null;

    if (!isNaN(valor)) {
      const data = XLSX.SSF.parse_date_code(Number(valor));
      if (data) {
        return `${data.y}-${String(data.m).padStart(2, '0')}-${String(data.d).padStart(2, '0')}`;
      }
    }

    const partes = valor.split(/[\/\-\.]/);
    if (partes.length === 3) {
      const [p1, p2, p3] = partes;
      if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }

    return valor;
  },

  _normalizarStatus(status) {
    if (!status) return null;
    const s = status.toLowerCase().trim();

    if (['sucesso', 'ok', 'success', 'completo', 'concluído', 'concluido', 'sim', 'yes', '1'].includes(s)) {
      return 'Sucesso';
    }
    if (['erro', 'error', 'falha', 'fail', 'failed', 'fracasso', 'não', 'nao', 'no', '0'].includes(s)) {
      return 'Erro';
    }
    if (['parcial', 'partial', 'incompleto', 'pendente', 'warning'].includes(s)) {
      return 'Parcial';
    }

    return 'Parcial';
  },

  historico() {
    return importacaoRepository.listarHistorico();
  }
};

module.exports = importacaoService;
