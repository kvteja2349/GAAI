import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../database/db.js';

const router = Router();

const updateSettingsSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  default_model: z.string().optional(),
  routing_preference: z.string().optional(),
  voice_enabled: z.boolean().optional()
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const settings = await db.getSettings(userId);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get settings' });
  }
});

router.put('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const updates = updateSettingsSchema.parse(req.body);
    const settings = await db.updateSettings(userId, updates);
    res.json(settings);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update settings' });
  }
});

export default router;
