import { GameValidationResult } from './gameTypes.js';

export interface TicTacToeMove {
  player: 'X' | 'O'; // X is human, O is AI
  cell: number; // 0-8
  timestamp: number;
}

export class TicTacToeValidator {
  private static readonly WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  public static validateGame(moves: TicTacToeMove[]): GameValidationResult {
    if (!moves || moves.length < 5) {
      return { valid: false, won: false, score: 0, message: 'Game too short to be a valid win.' };
    }

    const board: (string | null)[] = Array(9).fill(null);
    let expectedPlayer: 'X' | 'O' = 'X';

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (move.player !== expectedPlayer) {
        return { valid: false, won: false, score: 0, message: `Turn violation at move ${i + 1}. Expected ${expectedPlayer}.` };
      }
      if (move.cell < 0 || move.cell > 8 || board[move.cell] !== null) {
        return { valid: false, won: false, score: 0, message: `Illegal move into cell ${move.cell}.` };
      }

      board[move.cell] = move.player;

      // Check if someone won at this step
      const winner = this.checkWinner(board);
      if (winner) {
        if (i !== moves.length - 1) {
          return { valid: false, won: false, score: 0, message: 'Moves submitted after game was already decided.' };
        }
        if (winner === 'X') {
          return { valid: true, won: true, score: 100, message: 'Human player (X) won legitimately!' };
        } else {
          return { valid: true, won: false, score: 0, message: 'AI (O) won. No reward.' };
        }
      }

      expectedPlayer = expectedPlayer === 'X' ? 'O' : 'X';
    }

    return { valid: true, won: false, score: 0, message: 'Game was a draw. Draws do not award credits.' };
  }

  private static checkWinner(board: (string | null)[]): 'X' | 'O' | null {
    for (const [a, b, c] of this.WINNING_COMBOS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as 'X' | 'O';
      }
    }
    return null;
  }
}
