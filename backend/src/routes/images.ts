import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ImageGenService } from '../providers/imageGenService.js';
import { creditManager } from '../credits/creditManager.js';

const router = Router();

const imageRequestSchema = z.object({
  prompt: z.string().min(2).max(500),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional().default('1:1')
});

router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, aspectRatio } = imageRequestSchema.parse(req.body);
    const userId = req.user!.id;

    // Reserve 1 credit for image synthesis
    const reservation = await creditManager.reserveCredits(userId, 1);
    if (!reservation.success) {
      res.status(402).json({ error: "You're out of credits. Play in the Arcade to earn more!" });
      return;
    }

    try {
      const result = await ImageGenService.generateImage({ prompt, aspectRatio });
      // Commit debit for image generation
      await creditManager.commitGenerationDebit(userId, reservation.reservationId!, 1, {
        type: 'image_generation',
        aspectRatio
      });
      res.json(result);
    } catch (err: any) {
      creditManager.releaseReservation(reservation.reservationId!);
      res.status(500).json({ error: err.message || 'Image generation failed' });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid image request' });
  }
});

export default router;
