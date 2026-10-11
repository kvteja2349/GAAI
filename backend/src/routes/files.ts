import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const SUPPORTED_EXTENSIONS = [
  'txt', 'md', 'markdown', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx',
  'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'html', 'css', 'sql', 'yaml', 'yml', 'xml', 'log'
];

const fileUploadSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(1), // Base64 or plain text string
  isBase64: z.boolean().optional().default(false),
  size: z.number().max(5 * 1024 * 1024) // 5MB max
});

router.post('/parse', requireAuth, async (req, res) => {
  try {
    const { filename, content, isBase64, size } = fileUploadSchema.parse(req.body);

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext) && ext !== 'pdf' && ext !== 'docx') {
      res.status(400).json({
        error: `Unsupported file format '.${ext}'. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}, pdf, docx.`
      });
      return;
    }

    let extractedText = '';

    if (isBase64) {
      try {
        const buffer = Buffer.from(content, 'base64');
        extractedText = buffer.toString('utf8');
      } catch {
        res.status(400).json({ error: 'Failed to decode base64 file data.' });
        return;
      }
    } else {
      extractedText = content;
    }

    // Safety checks: strip null bytes and normalize
    extractedText = extractedText.replace(/\0/g, '').trim();

    if (!extractedText) {
      res.status(400).json({ error: 'The uploaded file appears to be empty or unreadable.' });
      return;
    }

    // Truncate if extremely long to protect context window (e.g., 50,000 chars)
    const MAX_CHARS = 50000;
    const truncated = extractedText.length > MAX_CHARS;
    const finalText = truncated ? extractedText.slice(0, MAX_CHARS) + '\n\n...[Content truncated for length]...' : extractedText;

    const lineCount = finalText.split('\n').length;

    res.json({
      filename,
      extension: ext,
      extractedText: finalText,
      charCount: finalText.length,
      lineCount,
      truncated
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'File parsing failed' });
  }
});

export default router;
