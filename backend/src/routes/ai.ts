import { Router } from 'express';
import { aiRouter } from '../providers/aiRouter.js';

const router = Router();

// List all available models and capabilities
router.get('/models', (req, res) => {
  const models = aiRouter.listAllModels();
  res.json({ models });
});

// Check provider health and latency
router.get('/health', async (req, res) => {
  try {
    const health = await aiRouter.getHealthStatus();
    res.json({ health });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check health' });
  }
});

export default router;
