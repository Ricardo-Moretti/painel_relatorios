/**
 * Controller de Rotinas
 * CRUD e consultas de rotinas e execuções
 */
const rotinaRepository = require('../repositories/rotinaRepository');
// const dpmService = require('../services/dpmService'); // DPM desativado temporariamente

const rotinaController = {
  /** GET /api/rotinas */
  listar(req, res, next) {
    try {
      const rotinas = rotinaRepository.listarTodas();
      res.json({ sucesso: true, dados: rotinas });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/rotinas/:id */
  buscar(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID invalido' });
      }
      const rotina = rotinaRepository.buscarPorId(id);
      if (!rotina) {
        return res.status(404).json({ sucesso: false, mensagem: 'Rotina nao encontrada' });
      }
      res.json({ sucesso: true, dados: rotina });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/rotinas */
  criar(req, res, next) {
    try {
      const { nome, frequencia } = req.body;
      if (!nome || typeof nome !== 'string') {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e obrigatorio' });
      }
      if (nome.length > 100) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome deve ter no maximo 100 caracteres' });
      }
      if (/[;'"\\`\-\-]|DROP|SELECT|INSERT|DELETE|UPDATE|UNION|ALTER|CREATE|EXEC/i.test(nome)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome contem caracteres nao permitidos' });
      }
      if (frequencia && (typeof frequencia !== 'string' || frequencia.length > 50)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Frequencia invalida' });
      }
      const rotina = rotinaRepository.criar({ nome: nome.trim(), frequencia: frequencia ? frequencia.trim() : 'Diaria' });
      res.status(201).json({ sucesso: true, dados: rotina });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rotinas/webhook — endpoint para n8n/automações externas
   * Recebe: { rotina, data, status, detalhes }
   * Exemplo n8n: se arquivo DPM existe → status=Sucesso, senão → status=Erro
   */
  webhook(req, res, next) {
    try {
      const { rotina, data, status, detalhes } = req.body;
      if (!rotina || !status) {
        return res.status(400).json({ sucesso: false, mensagem: 'rotina e status são obrigatórios' });
      }

      // Validação de entrada — bloqueia SQL injection, caracteres especiais
      if (typeof rotina !== 'string' || rotina.length > 100) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome da rotina deve ter no máximo 100 caracteres' });
      }
      if (/[;'"\\`\-\-]|DROP|SELECT|INSERT|DELETE|UPDATE|UNION|ALTER|CREATE|EXEC/i.test(rotina)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome da rotina contém caracteres não permitidos' });
      }
      if (detalhes && (typeof detalhes !== 'string' || detalhes.length > 1000)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Detalhes deve ter no máximo 1000 caracteres' });
      }
      if (!['Sucesso', 'Erro', 'Parcial'].includes(status)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Status deve ser Sucesso, Erro ou Parcial' });
      }
      if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Data deve estar no formato YYYY-MM-DD' });
      }

      const dataExec = data || new Date().toISOString().split('T')[0];
      const statusNorm = ['Sucesso', 'Erro', 'Parcial'].includes(status) ? status : 'Parcial';

      const rotinaObj = rotinaRepository.criarOuBuscar(rotina);

      // DELETE + INSERT para permitir atualização
      const { db } = require('../config/database');
      db.prepare('DELETE FROM execucoes WHERE rotina_id = ? AND data_execucao = ?').run(rotinaObj.id, dataExec);
      db.prepare('INSERT INTO execucoes (rotina_id, data_execucao, status, detalhes) VALUES (?, ?, ?, ?)').run(rotinaObj.id, dataExec, statusNorm, detalhes || '');

      console.log(`[Webhook] ${rotina} | ${dataExec} | ${statusNorm} | ${detalhes || ''}`);
      res.json({ sucesso: true, mensagem: `${rotina} registrado como ${statusNorm}`, dados: { rotina, data: dataExec, status: statusNorm } });
    } catch (error) { next(error); }
  },

  /** POST /api/rotinas/registro-diario — preenchimento manual de todas as rotinas */
  registroDiario(req, res, next) {
    try {
      const { data, registros } = req.body;
      if (!data || !registros || !Array.isArray(registros)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Data e registros são obrigatórios' });
      }

      // Validação de entrada
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Data deve estar no formato YYYY-MM-DD' });
      }
      if (registros.length > 100) {
        return res.status(400).json({ sucesso: false, mensagem: 'Maximo de 100 registros por requisicao' });
      }
      for (const reg of registros) {
        if (reg.rotina_id && (typeof reg.rotina_id !== 'number' || !Number.isInteger(reg.rotina_id) || reg.rotina_id < 1)) {
          return res.status(400).json({ sucesso: false, mensagem: 'rotina_id deve ser um inteiro positivo' });
        }
        if (reg.detalhes && (typeof reg.detalhes !== 'string' || reg.detalhes.length > 1000)) {
          return res.status(400).json({ sucesso: false, mensagem: 'Detalhes deve ter no maximo 1000 caracteres' });
        }
        if (reg.status && !['Sucesso', 'Erro', 'Parcial'].includes(reg.status)) {
          return res.status(400).json({ sucesso: false, mensagem: 'Status deve ser Sucesso, Erro ou Parcial' });
        }
        if (reg.quantidade != null && (typeof reg.quantidade !== 'number' || reg.quantidade < 0 || reg.quantidade > 100000)) {
          return res.status(400).json({ sucesso: false, mensagem: 'Quantidade deve ser entre 0 e 100000' });
        }
      }

      const { db } = require('../config/database');
      const glpiRepository = require('../repositories/glpiRepository');
      let inseridos = 0, atualizados = 0;

      const transacao = db.transaction(() => {
        for (const reg of registros) {
          if (!reg.rotina_id) continue;

          const rotina = rotinaRepository.buscarPorId(reg.rotina_id);
          if (!rotina) continue;

          // GLPI especial — quantidade numérica
          if (rotina.nome.toUpperCase() === 'GLPI' && reg.quantidade != null) {
            glpiRepository.upsert({ data, quantidade: parseInt(reg.quantidade) });
            const statusGlpi = reg.quantidade <= 50 ? 'Sucesso' : reg.quantidade <= 60 ? 'Parcial' : 'Erro';
            // DELETE + INSERT para permitir atualização
            db.prepare('DELETE FROM execucoes WHERE rotina_id = ? AND data_execucao = ?').run(reg.rotina_id, data);
            db.prepare('INSERT INTO execucoes (rotina_id, data_execucao, status, detalhes) VALUES (?, ?, ?, ?)').run(reg.rotina_id, data, statusGlpi, reg.detalhes || `${reg.quantidade} chamados`);
            inseridos++;
            continue;
          }

          // Rotinas normais
          if (!reg.status) continue;
          // DELETE + INSERT para permitir atualização
          db.prepare('DELETE FROM execucoes WHERE rotina_id = ? AND data_execucao = ?').run(reg.rotina_id, data);
          db.prepare('INSERT INTO execucoes (rotina_id, data_execucao, status, detalhes) VALUES (?, ?, ?, ?)').run(reg.rotina_id, data, reg.status, reg.detalhes || '');
          inseridos++;
        }
      });

      transacao();
      res.json({ sucesso: true, dados: { inseridos }, mensagem: `${inseridos} registro(s) salvos` });
    } catch (error) { next(error); }
  },

  // === DPM DESATIVADO TEMPORARIAMENTE ===
  // /** POST /api/rotinas/dpm/verificar — verifica DPM do dia anterior */
  // verificarDPM(req, res, next) {
  //   try {
  //     const resultado = dpmService.verificacaoDiaria();
  //     res.json({ sucesso: true, dados: resultado });
  //   } catch (error) { next(error); }
  // },
  //
  // /** POST /api/rotinas/dpm/backfill — preenche últimos N dias */
  // backfillDPM(req, res, next) {
  //   try {
  //     const dias = Math.min(req.query.dias ? parseInt(req.query.dias) : 7, 365);
  //     const resultados = dpmService.verificarPeriodo(dias);
  //     res.json({ sucesso: true, dados: resultados });
  //   } catch (error) { next(error); }
  // },
  //
  // /** GET /api/rotinas/dpm/testar — testa acesso à pasta DPM */
  // testarDPM(req, res) {
  //   const resultado = dpmService.testarAcesso();
  //   res.json({ sucesso: true, dados: resultado });
  // },
  // === FIM DPM DESATIVADO ===

  /** GET /api/rotinas/execucoes */
  execucoes(req, res, next) {
    try {
      const { dataInicio, dataFim, rotinaId } = req.query;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dataInicio && !dateRegex.test(dataInicio)) {
        return res.status(400).json({ sucesso: false, mensagem: 'dataInicio deve estar no formato YYYY-MM-DD' });
      }
      if (dataFim && !dateRegex.test(dataFim)) {
        return res.status(400).json({ sucesso: false, mensagem: 'dataFim deve estar no formato YYYY-MM-DD' });
      }
      const parsedRotinaId = rotinaId ? parseInt(rotinaId) : undefined;
      if (rotinaId && (isNaN(parsedRotinaId) || parsedRotinaId < 1)) {
        return res.status(400).json({ sucesso: false, mensagem: 'rotinaId invalido' });
      }
      const dados = rotinaRepository.buscarExecucoes({ dataInicio, dataFim, rotinaId: parsedRotinaId });
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = rotinaController;
