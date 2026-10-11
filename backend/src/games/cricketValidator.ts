import { GameValidationResult } from './gameTypes.js';

export interface CricketDelivery {
  ballNumber: number; // 1 to 6
  type: 'fast' | 'yorker' | 'bouncer' | 'spin' | 'inswing' | 'outswing';
  speedKmph: number;
}

export interface CricketBattingShot {
  ballNumber: number;
  shotType: 'drive' | 'pull' | 'cut' | 'loft' | 'sweep' | 'defend';
  timingOffsetMs: number; // 0 is perfect sweet spot, -150 to +150
}

export interface CricketBallResult {
  ballNumber: number;
  runs: number;
  isWicket: boolean;
  commentary: string;
}

export class CricketValidator {
  public static readonly REQUIRED_RUNS_TO_WIN = 25;
  public static readonly TOTAL_BALLS = 6;

  public static generateDeliveries(seed: number): CricketDelivery[] {
    const types: CricketDelivery['type'][] = ['fast', 'yorker', 'bouncer', 'spin', 'inswing', 'outswing'];
    const deliveries: CricketDelivery[] = [];

    let currentSeed = seed;
    const random = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };

    for (let i = 1; i <= this.TOTAL_BALLS; i++) {
      const type = types[Math.floor(random() * types.length)];
      const speed = Math.floor(120 + random() * 30); // 120-150 km/h
      deliveries.push({
        ballNumber: i,
        type,
        speedKmph: speed
      });
    }

    return deliveries;
  }

  public static calculateShotOutcome(delivery: CricketDelivery, shot: CricketBattingShot): CricketBallResult {
    const absTiming = Math.abs(shot.timingOffsetMs);

    // Defense shot
    if (shot.shotType === 'defend') {
      return {
        ballNumber: delivery.ballNumber,
        runs: 0,
        isWicket: false,
        commentary: 'Solid forward defensive stroke. No run.'
      };
    }

    // High risk / high reward shots
    if (shot.shotType === 'loft') {
      if (absTiming <= 35) {
        return {
          ballNumber: delivery.ballNumber,
          runs: 6,
          isWicket: false,
          commentary: 'MAXIMUM! Tremendous hit sailed high over the boundary rope for SIX!'
        };
      } else if (absTiming <= 65) {
        return {
          ballNumber: delivery.ballNumber,
          runs: 4,
          isWicket: false,
          commentary: 'Cracking lofted shot, bounces inside the ropes for FOUR!'
        };
      } else if (absTiming > 110) {
        return {
          ballNumber: delivery.ballNumber,
          runs: 0,
          isWicket: true,
          commentary: 'WICKET! Mistimed in the air and taken cleanly in the deep!'
        };
      } else {
        return {
          ballNumber: delivery.ballNumber,
          runs: 1,
          isWicket: false,
          commentary: 'Mishit drops into the vacant gap, single taken.'
        };
      }
    }

    // Drive / Pull / Cut
    if (absTiming <= 30) {
      return {
        ballNumber: delivery.ballNumber,
        runs: 6,
        isWicket: false,
        commentary: 'Sweetly timed! Pure class sent all the way into the stands for SIX!'
      };
    } else if (absTiming <= 60) {
      return {
        ballNumber: delivery.ballNumber,
        runs: 4,
        isWicket: false,
        commentary: 'Glorious stroke racing across the turf for FOUR runs!'
      };
    } else if (absTiming <= 90) {
      return {
        ballNumber: delivery.ballNumber,
        runs: 2,
        isWicket: false,
        commentary: 'Pushed into the gap, quick running between the wickets gets TWO.'
      };
    } else if (absTiming <= 120) {
      return {
        ballNumber: delivery.ballNumber,
        runs: 1,
        isWicket: false,
        commentary: 'Scrambled single towards mid-on.'
      };
    } else {
      // Very poor timing
      if (delivery.type === 'yorker' || delivery.type === 'bouncer') {
        return {
          ballNumber: delivery.ballNumber,
          runs: 0,
          isWicket: true,
          commentary: 'WICKET! Beaten by pace and timber shattered!'
        };
      }
      return {
        ballNumber: delivery.ballNumber,
        runs: 0,
        isWicket: false,
        commentary: 'Beaten by the delivery. Dot ball.'
      };
    }
  }

  public static validateChallenge(
    deliveries: CricketDelivery[],
    shots: CricketBattingShot[]
  ): GameValidationResult & { ballResults: CricketBallResult[]; totalRuns: number } {
    if (!shots || shots.length === 0) {
      return {
        valid: false,
        won: false,
        score: 0,
        totalRuns: 0,
        ballResults: [],
        message: 'No batting shots submitted.'
      };
    }

    let totalRuns = 0;
    const results: CricketBallResult[] = [];

    for (let i = 0; i < shots.length; i++) {
      if (i >= this.TOTAL_BALLS) break;

      const delivery = deliveries[i];
      const shot = shots[i];

      const outcome = this.calculateShotOutcome(delivery, shot);
      results.push(outcome);

      if (outcome.isWicket) {
        return {
          valid: true,
          won: false,
          score: totalRuns,
          totalRuns,
          ballResults: results,
          message: `Challenge ended: Batsman dismissed on ball ${i + 1}. Total runs: ${totalRuns} (Target was ${this.REQUIRED_RUNS_TO_WIN}).`
        };
      }

      totalRuns += outcome.runs;
    }

    if (results.length < this.TOTAL_BALLS) {
      return {
        valid: false,
        won: false,
        score: totalRuns,
        totalRuns,
        ballResults: results,
        message: 'Incomplete match: You must face all 6 balls unless dismissed.'
      };
    }

    // MANDATORY WINNING CONDITION: score at least 25 runs from six balls to win
    const won = totalRuns >= this.REQUIRED_RUNS_TO_WIN;

    return {
      valid: true,
      won,
      score: totalRuns,
      totalRuns,
      ballResults: results,
      message: won
        ? `Sensational batting! You scored ${totalRuns} runs (needed 25+) and earned 1 GAAI credit!`
        : `Target missed. You scored ${totalRuns} runs from 6 balls. You need at least 25 runs to win.`
    };
  }
}
