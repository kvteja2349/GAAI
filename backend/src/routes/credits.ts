import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { creditManager } from '../credits/creditManager.js';
import { db } from '../database/db.js';

const router = Router();

// Get full wallet overview
router.get('/wallet', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const wallet = await creditManager.getWallet(userId);
    res.json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve wallet information' });
  }
});

// Get fast balance
router.get('/balance', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const balances = await db.getBalances(userId);
    res.json(balances);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve balances' });
  }
});

// Trigger daily grant manually if eligible
router.post('/daily', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const granted = await creditManager.processDailyGrant(userId);
    const balances = await db.getBalances(userId);
    res.json({
      granted,
      message: granted ? 'Daily grant of 5 credits added successfully!' : 'Daily credits already claimed for today.',
      balances
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process daily credits' });
  }
});

export default router;
