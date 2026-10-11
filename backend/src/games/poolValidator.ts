import { GameValidationResult } from './gameTypes.js';

export interface PoolShotEvent {
  shotNumber: number;
  cuePower: number; // 0 to 100
  aimAngleRad: number;
  ballsPocketed: number[]; // 1-15 (1-7 solids, 8 eight-ball, 9-15 stripes)
  cueBallPocketed: boolean; // scratch foul
  timestamp: number;
}

export class PoolValidator {
  public static validateMatch(
    shots: PoolShotEvent[],
    assignedGroup: 'solids' | 'stripes'
  ): GameValidationResult {
    if (!shots || shots.length < 3) {
      return { valid: false, won: false, score: 0, message: 'Too few shots for a complete 8-ball pool game.' };
    }

    const durationMs = shots[shots.length - 1].timestamp - shots[0].timestamp;
    if (durationMs < 10000) { // minimum 10 seconds of gameplay
      return { valid: false, won: false, score: 0, message: 'Unrealistic match speed detected.' };
    }

    const pocketedSoFar = new Set<number>();
    let eightBallPocketed = false;
    let finalShotScratch = false;

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      if (shot.cueBallPocketed && i === shots.length - 1) {
        finalShotScratch = true;
      }

      for (const b of shot.ballsPocketed) {
        if (b === 8) {
          eightBallPocketed = true;
          if (i !== shots.length - 1) {
            return { valid: false, won: false, score: 0, message: 'Eight ball pocketed prematurely.' };
          }
        } else {
          pocketedSoFar.add(b);
        }
      }
    }

    if (!eightBallPocketed) {
      return { valid: false, won: false, score: 0, message: 'Match incomplete. The 8-ball has not been pocketed.' };
    }

    if (finalShotScratch) {
      return { valid: true, won: false, score: 0, message: 'Foul on 8-ball! Cue ball was pocketed (scratch). Loss.' };
    }

    // Check if player's group was cleared before pocketing 8-ball
    const targetBalls = assignedGroup === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
    const clearedCount = targetBalls.filter(b => pocketedSoFar.has(b)).length;

    // In arcade mini-pool, player must clear at least 4 of their group balls or all of them before sinking the 8
    if (clearedCount < 3) {
      return { valid: false, won: false, score: 0, message: '8-ball sunk before clearing designated object balls.' };
    }

    return {
      valid: true,
      won: true,
      score: 500 + clearedCount * 50,
      message: `Magnificent 8-ball finish! You cleared your ${assignedGroup} and pocketed the 8-ball cleanly.`
    };
  }
}
