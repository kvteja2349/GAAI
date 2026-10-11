import { GameValidationResult } from './gameTypes.js';

export interface CornholeThrowEvent {
  throwNumber: number;
  player: 'human' | 'ai';
  power: number; // 0-100
  angleDeg: number;
  result: 'hole' | 'board' | 'miss';
  points: number; // 3 for hole, 1 for board, 0 for miss
  timestamp: number;
}

export class CornholeValidator {
  public static readonly TARGET_SCORE = 21;

  public static validateMatch(throws: CornholeThrowEvent[]): GameValidationResult {
    if (!throws || throws.length < 6) {
      return { valid: false, won: false, score: 0, message: 'Too few throws for a cornhole game.' };
    }

    let humanScore = 0;
    let aiScore = 0;

    for (const t of throws) {
      const calculatedPoints = t.result === 'hole' ? 3 : t.result === 'board' ? 1 : 0;
      if (t.points !== calculatedPoints) {
        return { valid: false, won: false, score: 0, message: 'Inconsistent point calculation detected.' };
      }

      if (t.player === 'human') {
        humanScore += calculatedPoints;
      } else {
        aiScore += calculatedPoints;
      }
    }

    const won = humanScore >= this.TARGET_SCORE && humanScore > aiScore;

    return {
      valid: true,
      won,
      score: humanScore,
      message: won
        ? `Cornhole Champion! Final Score: You ${humanScore} - ${aiScore} AI (Target was ${this.TARGET_SCORE}). 1 credit awarded!`
        : `Match ended: You ${humanScore} - ${aiScore} AI. Need 21+ points and more than AI to win.`
    };
  }
}
