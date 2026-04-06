/**
 * Controller de Importação de Excel
 * Upload e processamento de planilhas
 */
const importacaoService = require('../services/importacaoService');
const fs = require('fs');

const importacaoController = {
  /** POST /api/importacao/upload */
  upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nenhum arquivo enviado' });
      }

      const resultado = importacaoService.processar(
        req.file.path,
        req.file.originalname,
        req.usuario.id
      );

      // Remove arquivo temporário após processamento
      fs.unlinkSync(req.file.path);

      res.json({
        sucesso: true,
        mensagem: `Importação concluída: ${resultado.inseridos} inseridos, ${resultado.ignorados} ignorados`,
        dados: resultado
      });
    } catch (error) {
      // Remove arquivo temporário em caso de erro
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  },

  /** GET /api/importacao/historico */
  historico(req, res, next) {
    try {
      const dados = importacaoService.historico();
      res.json({ sucesso: true, dados });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = importacaoController;
