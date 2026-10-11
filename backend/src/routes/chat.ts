import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { aiRouter } from '../providers/aiRouter.js';
import { creditManager } from '../credits/creditManager.js';

const router = Router();

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1)
    })
  ).min(1),
  modelId: z.string().optional(),
  webSearch: z.boolean().optional()
});

router.post('/stream', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid chat request structure', details: parseResult.error.format() });
      return;
    }

    const { messages, modelId, webSearch } = parseResult.data;
    const userId = req.user!.id;

    // Check credits upfront
    const hasCredits = await creditManager.hasAvailableCredits(userId, 1);
    if (!hasCredits) {
      res.status(402).json({
        error: "You're out of credits.",
        code: 'OUT_OF_CREDITS',
        message: "You're out of credits. Play in the Arcade to earn more!"
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (eventData: Record<string, any>) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    try {
      const result = await aiRouter.streamChatWithCredits(
        userId,
        messages,
        modelId,
        !!webSearch,
        (delta: string) => {
          sendEvent({ type: 'chunk', delta });
        }
      );

      sendEvent({
        type: 'done',
        modelUsed: result.modelUsed,
        linesGenerated: result.linesGenerated,
        creditsCharged: result.creditsCharged,
        citations: result.citations
      });
      res.end();
    } catch (err: any) {
      sendEvent({
        type: 'error',
        error: err.message || 'Generation failed',
        isCreditError: err.message?.includes('credits')
      });
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Stream initiation failed' });
    }
  }
});

// Non-streaming chat generate endpoint
router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid chat request structure' });
      return;
    }

    const { messages, modelId, webSearch } = parseResult.data;
    const userId = req.user!.id;

    const result = await aiRouter.streamChatWithCredits(
      userId,
      messages,
      modelId,
      !!webSearch
    );

    res.json(result);
  } catch (err: any) {
    const isCredit = err.message?.includes('credits');
    res.status(isCredit ? 402 : 500).json({ error: err.message || 'Generation error' });
  }
});

export default router;
