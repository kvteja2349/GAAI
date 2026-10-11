import { Chess } from 'chess.js';
import { GameValidationResult } from './gameTypes.js';

export class ChessValidator {
  public static validateGame(moves: string[]): GameValidationResult {
    if (!moves || moves.length < 2) {
      return { valid: false, won: false, score: 0, message: 'Game too short to be a valid win.' };
    }

    const chess = new Chess();

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      try {
        const result = chess.move(move);
        if (!result) {
          return { valid: false, won: false, score: 0, message: `Illegal chess move at step ${i + 1}: ${move}` };
        }
      } catch (err: any) {
        return { valid: false, won: false, score: 0, message: `Invalid move execution: ${move}` };
      }
    }

    if (chess.isCheckmate()) {
      // The side whose turn it is now was checkmated!
      // If it's black's turn ('b'), white (human) checkmated black!
      if (chess.turn() === 'b') {
        return {
          valid: true,
          won: true,
          score: 1000,
          message: 'Checkmate! Human player (White) defeated AI.'
        };
      } else {
        return {
          valid: true,
          won: false,
          score: 0,
          message: 'Checkmate against Human player. AI won.'
        };
      }
    }

    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return {
        valid: true,
        won: false,
        score: 50,
        message: 'Game ended in a draw. Draws do not award credits.'
      };
    }

    // If opponent resigned or forfeited position with massive material advantage (>15 pts)
    return {
      valid: false,
      won: false,
      score: 0,
      message: 'Chess match incomplete. Only checkmate wins are awarded credits.'
    };
  }
}
