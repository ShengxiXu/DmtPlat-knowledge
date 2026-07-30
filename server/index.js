import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import { parsePPTX } from './parsers/pptx.js';
import { parseDOCX } from './parsers/docx.js';
import { parseXLSX } from './parsers/xlsx.js';
import { parsePDF } from './parsers/pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => {
      // multer 默认用 latin1 解码中文文件名，这里转回 utf8
      const originalName = Buffer.from(file.originalname, 'latin1').toString(
        'utf8'
      );
      const safeName = `${Date.now()}_${originalName}`.replace(
        /[^\w\-.\u4e00-\u9fa5]/g,
        '_'
      );
      cb(null, safeName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const MIME_MAP = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
};

app.post('/api/parse-template', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    // multer 默认用 latin1 解码中文文件名，统一转回 utf8
    const originalName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8'
    );
    const ext = path.extname(originalName).toLowerCase();
    const detectedType = MIME_MAP[file.mimetype] || ext.replace('.', '');
    const buffer = await fs.readFile(file.path);

    let result;
    switch (detectedType) {
      case 'pptx':
        result = await parsePPTX(buffer);
        break;
      case 'docx':
        result = await parseDOCX(buffer);
        break;
      case 'xlsx':
        result = parseXLSX(buffer);
        break;
      case 'pdf':
        result = await parsePDF(buffer);
        break;
      case 'txt':
      case 'md':
        result = { text: buffer.toString('utf8') };
        break;
      default:
        return res
          .status(400)
          .json({ error: `不支持的文件类型：${detectedType}` });
    }

    // 异步清理上传文件
    fs.unlink(file.path).catch(() => {});

    res.json({
      success: true,
      fileName: originalName,
      fileType: detectedType,
      ...result,
    });
  } catch (err) {
    console.error('解析失败:', err);
    res.status(500).json({ error: '文件解析失败', message: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Template parser server running on http://localhost:${PORT}`);
});
