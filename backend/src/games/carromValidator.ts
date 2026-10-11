import { GameValidationResult } from './gameTypes.js';

export interface CarromStrikeEvent {
  strikeNumber: number;
  strikerX: number; // baseline position
  power: number; // 1-100
  angleRad: number;
  pocketedWhite: number;
  pocketedBlack: number;
  pocketedQueen: boolean;
  strikerFoul: boolean;
  timestamp: number;
}

export class CarromValidator {
  public static validateBoard(strikes: CarromStrikeEvent[]): GameValidationResult {
    if (!strikes || strikes.length < 3) {
      return { valid: false, won: false, score: 0, message: 'Too few strikes for a valid Carrom game.' };
    }

    const duration = strikes[strikes.length - 1].timestamp - strikes[0].timestamp;
    if (duration < 8000) {
      return { valid: false, won: false, score: 0, message: 'Game duration too short.' };
    }

    let playerScore = 0;
    let aiScore = 0;
    let totalWhitePocketed = 0;
    let queenPocketed = false;
    let queenCovered = false;

    for (let i = 0; i < strikes.length; i++) {
      const s = strikes[i];
      if (s.strikerFoul) {
        playerScore = Math.max(0, playerScore - 5);
      }

      totalWhitePocketed += s.pocketedWhite;
      playerScore += s.pocketedWhite * 10;
      aiScore += s.pocketedBlack * 5;

      if (s.pocketedQueen && !queenPocketed) {
        queenPocketed = true;
        // Check if covered in next strike
        if (i < strikes.length - 1 && strikes[i + 1].pocketedWhite > 0) {
          queenCovered = true;
          playerScore += 25;
        }
      }
    }

    // Win condition: Player scored at least 25 points and beat AI score
    const won = playerScore >= 25 && playerScore > aiScore;

    return {
      valid: true,
      won,
      score: playerScore,
      message: won
        ? `Victory on the Carrom board! Player score: ${playerScore} pts (AI: ${aiScore} pts). 1 credit awarded!`
        : `Defeat or draw. Player score: ${playerScore} pts (Target: 25+ pts and > AI).`
    };
  }
}
