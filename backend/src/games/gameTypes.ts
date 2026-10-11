export type GameType = 'tictactoe' | 'pool' | 'chess' | 'carrom' | 'cornhole' | 'cricket';

export interface GameValidationResult {
  valid: boolean;
  won: boolean;
  score: number;
  message: string;
}

export interface GameSessionChallenge {
  sessionId: string;
  nonce: string;
  gameType: GameType;
  challengeSeed: string;
  initialState: Record<string, any>;
  expiresAt: number;
}
