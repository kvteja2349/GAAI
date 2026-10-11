# GAAI Arcade Rules & Verification Specification

Every game in the GAAI Arcade runs responsive canvas physics or board logic in the browser, but **all rewards are validated server-side**. Forged results, client-side score editing, or manipulated balances cannot grant credits.

Each legitimate win awards **exactly 1 credit**.

---

## 1. Tic-Tac-Toe
- **Board**: Standard 3×3 grid.
- **Opponent**: Minimax algorithmic AI.
- **Rule**: Connect 3 `X` symbols in any row, column, or diagonal.
- **Verification**: Server checks entire move sequence for alternate turns, empty cell legality, and winning line.
- **Note**: Draws or losses award **0 credits**.

---

## 2. Eight-Ball Pool
- **Game**: 2D Canvas physics pool.
- **Ball Groups**: Player is assigned Solids (Balls 1-7).
- **Rules**: Pocket your assigned object balls, then legally sink the 8-Ball into any pocket.
- **Fouls**: Pocketing the Cue Ball (scratch) on the final 8-ball shot results in a foul/loss.
- **Verification**: Server checks shot events, minimum elapsed match duration (>10s), cleared object balls, and clean 8-ball sink.

---

## 3. Mini Chess
- **Game**: Full standard chess rules engine using `chess.js`.
- **Side**: Player plays as White; AI plays as Black.
- **Rules**: Defeat the AI opponent by achieving **Checkmate**.
- **Verification**: Server plays through the submitted SAN moves list against official FEN rules. Confirms final board position is Checkmate against Black.
- **Note**: Draws, stalemates, threefold repetition, and resignations award **0 credits**.

---

## 4. Carrom Championship
- **Game**: 2D Canvas board physics with striker baseline aiming.
- **Scoring**:
  - White Coin: 10 Points
  - Black Coin: 5 Points
  - Red Queen: 25 Points (must be covered)
- **Winning Condition**: Player must score at least **25 points** and outscore AI.
- **Verification**: Server validates strike events, coin positions, striker baseline boundaries, and final score.

---

## 5. Cornhole Classic
- **Game**: Perspective trajectory toss towards wooden target board.
- **Scoring**:
  - Bag in Hole: 3 Points
  - Bag on Board: 1 Point
  - Miss (Grass): 0 Points
- **Winning Condition**: Match to **21 points**. Human player must score at least 21 points and beat the AI opponent.
- **Verification**: Server recalculates throw coordinates, points consistency, and final match winner.

---

## 6. Six-Ball Cricket Batting Challenge
- **Challenge**: Player faces exactly **6 legal deliveries** from fast and spin bowlers (speeds 120-150 km/h).
- **Deliveries**: Fast, Yorker, Bouncer, Spin, Inswing, Outswing.
- **Shot Outcomes**:
  - Perfect timing: 6 Runs (Lofted) or 4 Runs (Drive/Pull)
  - Good timing: 1, 2, or 3 Runs
  - Poor timing on Yorkers/Bouncers: Wicket! (OUT)
- **MANDATORY WINNING CONDITION**:
  - **Player must score at least 25 runs from 6 deliveries to win!**
  - Score >= 25 runs: Eligible for 1 credit.
  - Score < 25 runs: No reward.
  - Wicket dismissal ends challenge early without reward.
- **Verification**: Server validates bowling seed, delivery parameters, batsman timing offsets, and verifies total runs >= 25.
