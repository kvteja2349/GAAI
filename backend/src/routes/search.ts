import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { WebSearchService } from '../providers/webSearchService.js';

const router = Router();

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(10).optional().default(5)
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { query, limit } = searchSchema.parse(req.body);
    const results = await WebSearchService.search(query, limit);
    res.json({ query, results });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Search failed' });
  }
});

export default router;
