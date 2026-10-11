import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ArcadeManager } from '../games/arcadeManager.js';
import { GameType } from '../games/gameTypes.js';

const router = Router();

const gameTypesEnum = z.enum(['tictactoe', 'pool', 'chess', 'carrom', 'cornhole', 'cricket']);

// Get arcade games catalog
router.get('/games', (_req, res) => {
  res.json({
    games: [
      {
        id: 'tictactoe',
        title: 'Tic-Tac-Toe',
        category: 'Strategy & Logic',
        description: 'Classic 3x3 strategy against Minimax AI. Win 3-in-a-row for +1 Credit.',
        reward: '1 Credit per Win',
        rules: 'Draws or losses award no credits. Only human wins qualify.',
        accentColor: 'from-violet-500 to-indigo-600'
      },
      {
        id: 'pool',
        title: 'Eight-Ball Pool',
        category: 'Canvas Physics',
        description: 'Realistic billiards physics with cue ball spin, collision and pocket detection.',
        reward: '1 Credit per Win',
        rules: 'Clear your object balls and sink the 8-ball without scratching.',
        accentColor: 'from-emerald-500 to-teal-600'
      },
      {
        id: 'chess',
        title: 'Mini Chess',
        category: 'Grandmaster Logic',
        description: 'Play against an algorithmic AI opponent with strict chess legal move validation.',
        reward: '1 Credit per Win',
        rules: 'Full checkmate required. Draws or stalemates do not award credits.',
        accentColor: 'from-amber-500 to-orange-600'
      },
      {
        id: 'carrom',
        title: 'Carrom Championship',
        category: 'Board Physics',
        description: 'Striker angles, rebound geometry, coin physics and Queen cover mechanics.',
        reward: '1 Credit per Win',
        rules: 'Score at least 25 points and beat AI to claim the credit.',
        accentColor: 'from-cyan-500 to-blue-600'
      },
      {
        id: 'cornhole',
        title: 'Cornhole Classic',
        category: 'Precision Toss',
        description: 'Trajectory simulation with pitch angle, throw velocity, board slide, and hole-in-one.',
        reward: '1 Credit per Win',
        rules: 'Score 21+ points and beat the opponent to earn +1 Credit.',
        accentColor: 'from-pink-500 to-rose-600'
      },
      {
        id: 'cricket',
        title: 'Six-Ball Cricket Challenge',
        category: 'Batting Skill',
        description: 'Face 6 legal deliveries. Score 25+ runs to win +1 Credit. Do not get bowled out!',
        reward: '1 Credit per Win',
        rules: 'MANDATORY: Minimum 25 runs scored from 6 deliveries. Wickets end challenge.',
        accentColor: 'from-yellow-500 to-amber-600'
      }
    ]
  });
});

// Start a game session
router.post('/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { gameType } = z.object({ gameType: gameTypesEnum }).parse(req.body);
    const userId = req.user!.id;
    const session = await ArcadeManager.startSession(userId, gameType as GameType);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to start game session' });
  }
});

// Submit game result for server-side verification and reward grant
router.post('/rewards', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const bodySchema = z.object({
      sessionId: z.string().uuid(),
      sessionNonce: z.string().min(5),
      payload: z.record(z.any())
    });

    const { sessionId, sessionNonce, payload } = bodySchema.parse(req.body);
    const userId = req.user!.id;

    const result = await ArcadeManager.submitAndVerifyResult(userId, sessionId, sessionNonce, payload);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Reward verification failed' });
  }
});

export default router;
