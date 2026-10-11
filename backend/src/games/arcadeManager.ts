import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { creditManager } from '../credits/creditManager.js';
import { GameType, GameValidationResult } from './gameTypes.js';
import { TicTacToeValidator } from './ticTacToeValidator.js';
import { ChessValidator } from './chessValidator.js';
import { CricketValidator } from './cricketValidator.js';
import { PoolValidator } from './poolValidator.js';
import { CarromValidator } from './carromValidator.js';
import { CornholeValidator } from './cornholeValidator.js';

export class ArcadeManager {
  /**
   * Generates a new server-issued game session with nonce & challenge seed
   */
  public static async startSession(userId: string, gameType: GameType) {
    const nonce = uuidv4();
    const seed = Math.floor(Math.random() * 1000000);

    let initialState: Record<string, any> = { seed };

    if (gameType === 'cricket') {
      const deliveries = CricketValidator.generateDeliveries(seed);
      initialState.deliveries = deliveries;
      initialState.totalBalls = 6;
      initialState.targetRuns = CricketValidator.REQUIRED_RUNS_TO_WIN;
    } else if (gameType === 'pool') {
      initialState.assignedGroup = 'solids'; // human plays solids
    } else if (gameType === 'cornhole') {
      initialState.targetScore = CornholeValidator.TARGET_SCORE;
    }

    const session = await db.createGameSession(userId, gameType, nonce, initialState);

    return {
      sessionId: session.id,
      sessionNonce: session.session_nonce,
      gameType: session.game_type,
      initialState: session.state_data,
      rules: this.getGameRulesSummary(gameType)
    };
  }

  /**
   * Validates game completion and awards 1 credit if legitimately won
   */
  public static async submitAndVerifyResult(
    userId: string,
    sessionId: string,
    sessionNonce: string,
    payload: any
  ) {
    const session = await db.getGameSession(sessionId, sessionNonce);

    if (!session) {
      return { valid: false, won: false, creditAwarded: 0, message: 'Invalid or expired game session.' };
    }

    if (session.user_id !== userId) {
      return { valid: false, won: false, creditAwarded: 0, message: 'Session does not belong to current user.' };
    }

    if (session.status !== 'active') {
      return { valid: false, won: false, creditAwarded: 0, message: 'Session already completed or closed.' };
    }

    if (session.reward_granted) {
      return { valid: false, won: false, creditAwarded: 0, message: 'Reward was already granted for this session.' };
    }

    let validation: GameValidationResult;

    switch (session.game_type) {
      case 'tictactoe':
        validation = TicTacToeValidator.validateGame(payload.moves || []);
        break;

      case 'chess':
        validation = ChessValidator.validateGame(payload.moves || []);
        break;

      case 'cricket':
        const deliveries = session.state_data.deliveries || CricketValidator.generateDeliveries(session.state_data.seed || 12345);
        validation = CricketValidator.validateChallenge(deliveries, payload.shots || []);
        break;

      case 'pool':
        validation = PoolValidator.validateMatch(payload.shots || [], session.state_data.assignedGroup || 'solids');
        break;

      case 'carrom':
        validation = CarromValidator.validateBoard(payload.strikes || []);
        break;

      case 'cornhole':
        validation = CornholeValidator.validateMatch(payload.throws || []);
        break;

      default:
        validation = { valid: false, won: false, score: 0, message: 'Unknown game type.' };
    }

    if (!validation.valid) {
      await db.completeGameSession(sessionId, false, 0, false);
      return {
        valid: false,
        won: false,
        creditAwarded: 0,
        message: validation.message
      };
    }

    let creditAwarded = 0;
    if (validation.won) {
      // Award exactly 1 credit for verified win
      const ledgerEntry = await creditManager.grantGameReward(userId, session.game_type, sessionId);
      creditAwarded = ledgerEntry ? 1 : 0;
    }

    await db.completeGameSession(sessionId, validation.won, validation.score, creditAwarded > 0);
    const updatedBalances = await db.getBalances(userId);

    return {
      valid: true,
      won: validation.won,
      score: validation.score,
      creditAwarded,
      message: validation.message,
      balances: updatedBalances
    };
  }

  public static getGameRulesSummary(gameType: GameType): string {
    switch (gameType) {
      case 'tictactoe':
        return 'Get 3 X symbols in a row, column, or diagonal before the AI. Draws award no credit.';
      case 'chess':
        return 'Checkmate the AI opponent to win. Draws, stalemates, or incomplete matches award no credit.';
      case 'cricket':
        return 'Face 6 legal deliveries. Score 25 or more runs to win 1 credit. Score under 25 or getting bowled awards no credit.';
      case 'pool':
        return 'Pocket all designated balls and legally sink the 8-ball without scratching.';
      case 'carrom':
        return 'Score 25+ points with white coins and cover the red Queen to defeat AI.';
      case 'cornhole':
        return 'Reach 21 or more points (3 pts for hole, 1 pt for board) and beat the AI opponent.';
    }
  }
}
