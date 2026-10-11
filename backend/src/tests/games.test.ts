import test from 'node:test';
import assert from 'node:assert';
import { TicTacToeValidator } from '../games/ticTacToeValidator.js';
import { CricketValidator, CricketDelivery, CricketBattingShot } from '../games/cricketValidator.js';
import { ChessValidator } from '../games/chessValidator.js';
import { ArcadeManager } from '../games/arcadeManager.js';
import { db } from '../database/db.js';

test('TicTacToe: Validates legitimate human win', () => {
  // Human (X) wins top row: 0, 1, 2
  const winningMoves: any[] = [
    { player: 'X', cell: 0, timestamp: 100 },
    { player: 'O', cell: 3, timestamp: 200 },
    { player: 'X', cell: 1, timestamp: 300 },
    { player: 'O', cell: 4, timestamp: 400 },
    { player: 'X', cell: 2, timestamp: 500 }, // Win!
  ];

  const result = TicTacToeValidator.validateGame(winningMoves);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.won, true);
  assert.strictEqual(result.score, 100);
});

test('TicTacToe: Draw does not award credit', () => {
  const drawMoves: any[] = [
    { player: 'X', cell: 0, timestamp: 100 },
    { player: 'O', cell: 1, timestamp: 200 },
    { player: 'X', cell: 2, timestamp: 300 },
    { player: 'O', cell: 4, timestamp: 400 },
    { player: 'X', cell: 3, timestamp: 500 },
    { player: 'O', cell: 5, timestamp: 600 },
    { player: 'X', cell: 7, timestamp: 700 },
    { player: 'O', cell: 6, timestamp: 800 },
    { player: 'X', cell: 8, timestamp: 900 }
  ];

  const result = TicTacToeValidator.validateGame(drawMoves);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.won, false);
});

test('Cricket: Mandatory rule - score >= 25 runs from 6 balls wins credit', () => {
  const deliveries: CricketDelivery[] = [
    { ballNumber: 1, type: 'fast', speedKmph: 130 },
    { ballNumber: 2, type: 'fast', speedKmph: 130 },
    { ballNumber: 3, type: 'fast', speedKmph: 130 },
    { ballNumber: 4, type: 'fast', speedKmph: 130 },
    { ballNumber: 5, type: 'fast', speedKmph: 130 },
    { ballNumber: 6, type: 'fast', speedKmph: 130 }
  ];

  // 4 shots timed for 6, two timed for 4 -> Total = 32 runs (>= 25)
  const shots: CricketBattingShot[] = [
    { ballNumber: 1, shotType: 'loft', timingOffsetMs: 10 }, // 6 runs
    { ballNumber: 2, shotType: 'loft', timingOffsetMs: 15 }, // 6 runs
    { ballNumber: 3, shotType: 'loft', timingOffsetMs: 5 },  // 6 runs
    { ballNumber: 4, shotType: 'loft', timingOffsetMs: 10 }, // 6 runs
    { ballNumber: 5, shotType: 'drive', timingOffsetMs: 40 },// 4 runs
    { ballNumber: 6, shotType: 'drive', timingOffsetMs: 40 } // 4 runs
  ];

  const result = CricketValidator.validateChallenge(deliveries, shots);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.won, true);
  assert.strictEqual(result.totalRuns >= 25, true);
});

test('Cricket: Mandatory rule - score < 25 runs (e.g. 20 runs) does not win reward', () => {
  const deliveries: CricketDelivery[] = [
    { ballNumber: 1, type: 'fast', speedKmph: 130 },
    { ballNumber: 2, type: 'fast', speedKmph: 130 },
    { ballNumber: 3, type: 'fast', speedKmph: 130 },
    { ballNumber: 4, type: 'fast', speedKmph: 130 },
    { ballNumber: 5, type: 'fast', speedKmph: 130 },
    { ballNumber: 6, type: 'fast', speedKmph: 130 }
  ];

  // Singles and dots -> Total < 25
  const shots: CricketBattingShot[] = [
    { ballNumber: 1, shotType: 'defend', timingOffsetMs: 0 }, // 0
    { ballNumber: 2, shotType: 'drive', timingOffsetMs: 110 }, // 1
    { ballNumber: 3, shotType: 'drive', timingOffsetMs: 110 }, // 1
    { ballNumber: 4, shotType: 'drive', timingOffsetMs: 110 }, // 1
    { ballNumber: 5, shotType: 'drive', timingOffsetMs: 110 }, // 1
    { ballNumber: 6, shotType: 'drive', timingOffsetMs: 40 }   // 4
  ];

  const result = CricketValidator.validateChallenge(deliveries, shots);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.won, false);
  assert.strictEqual(result.totalRuns < 25, true);
});

test('Chess: Validates Scholar\'s Mate checkmate by White', () => {
  // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
  const scholarsMateMoves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'];

  const result = ChessValidator.validateGame(scholarsMateMoves);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.won, true);
  assert.strictEqual(result.message.includes('Checkmate'), true);
});

test('ArcadeManager: Prevents duplicate reward claims on the same session', async () => {
  const user = await db.createUser({
    email: `test_arcade_anti_abuse_${Date.now()}@gaai.local`,
    display_name: 'Anti-Abuse Tester',
    auth_provider: 'email',
    welcome_granted: true
  });

  const session = await ArcadeManager.startSession(user.id, 'tictactoe');

  const winningMoves: any[] = [
    { player: 'X', cell: 0, timestamp: 100 },
    { player: 'O', cell: 3, timestamp: 200 },
    { player: 'X', cell: 1, timestamp: 300 },
    { player: 'O', cell: 4, timestamp: 400 },
    { player: 'X', cell: 2, timestamp: 500 }
  ];

  // First claim should succeed and award 1 credit
  const firstClaim = await ArcadeManager.submitAndVerifyResult(
    user.id,
    session.sessionId,
    session.sessionNonce,
    { moves: winningMoves }
  );
  assert.strictEqual(firstClaim.won, true);
  assert.strictEqual(firstClaim.creditAwarded, 1);

  // Second claim attempt with the same session must be rejected!
  const secondClaim = await ArcadeManager.submitAndVerifyResult(
    user.id,
    session.sessionId,
    session.sessionNonce,
    { moves: winningMoves }
  );
  assert.strictEqual(secondClaim.creditAwarded, 0);
  assert.strictEqual(secondClaim.message.includes('already completed') || secondClaim.message.includes('already granted'), true);
});
