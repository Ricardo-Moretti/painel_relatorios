/**
 * Rotas de Importacao de Excel
 * Seguranca: validacao de tipo de arquivo por extensao + magic bytes
 */
const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const importacaoController = require('../controllers/importacaoController');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = Router();

// Configuracao do Multer para upload
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Magic bytes for allowed file types
const MAGIC_BYTES = {
  xlsx: [0x50, 0x4B, 0x03, 0x04], // ZIP (OOXML)
  xls:  [0xD0, 0xCF, 0x11, 0xE0], // OLE2 Compound Document
  // CSV has no magic bytes — validated by extension only
};

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extensoesPermitidas = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (extensoesPermitidas.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo nao suportado. Use .xlsx, .xls ou .csv'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (reduced from 10MB)
    files: 1, // Max 1 file per request
  }
});

/**
 * Middleware para validar magic bytes apos upload
 * Garante que o conteudo do arquivo corresponde a extensao declarada
 */
function validateMagicBytes(req, res, next) {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filePath = req.file.path;

  // CSV has no standard magic bytes — skip validation
  if (ext === '.csv') return next();

  const expectedMagic = ext === '.xlsx' ? MAGIC_BYTES.xlsx :
                        ext === '.xls'  ? MAGIC_BYTES.xls  : null;

  if (!expectedMagic) return next();

  try {
    // Read only the first few bytes
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const matches = expectedMagic.every((byte, i) => buffer[i] === byte);
    if (!matches) {
      // Delete the suspicious file
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      console.warn(`[SECURITY] Magic bytes mismatch for uploaded file: ${req.file.originalname} from IP ${req.ip}`);
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Conteudo do arquivo nao corresponde ao formato declarado'
      });
    }
  } catch (e) {
    // If we can't read the file, reject it
    try { fs.unlinkSync(filePath); } catch (e2) { /* ignore */ }
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Erro ao validar arquivo'
    });
  }

  next();
}

router.post('/upload', autenticar, apenasAdmin, upload.single('arquivo'), validateMagicBytes, importacaoController.upload);
router.get('/historico', autenticar, apenasAdmin, importacaoController.historico);

module.exports = router;
