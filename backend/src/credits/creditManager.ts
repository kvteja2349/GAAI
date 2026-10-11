import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { LineCounter } from './lineCounter.js';
import { CreditBalances, CreditLedgerEntry } from '../database/types.js';

interface PendingReservation {
  id: string;
  userId: string;
  creditsReserved: number;
  createdAt: number;
  status: 'active' | 'committed' | 'released';
}

class CreditManager {
  private activeReservations: Map<string, PendingReservation> = new Map();

  /**
   * Grant initial welcome credits (5 credits) once per user
   */
  public async grantWelcomeCredits(userId: string): Promise<boolean> {
    const user = await db.getUserById(userId);
    if (!user || user.welcome_granted) {
      return false; // Already granted or invalid user
    }

    const idempotencyKey = `welcome_grant_${userId}`;
    const entry = await db.addLedgerEntry({
      user_id: userId,
      amount: 5,
      credit_type: 'welcome',
      category: 'grant',
      reason: 'Welcome balance grant',
      idempotency_key: idempotencyKey,
      metadata: { initial: true }
    });

    if (entry) {
      await db.updateUser(userId, { welcome_granted: true });
      return true;
    }
    return false;
  }

  /**
   * Check and grant daily credits (5 credits) if eligible for today
   */
  public async processDailyGrant(userId: string): Promise<boolean> {
    return await db.grantDailyCreditsIfEligible(userId);
  }

  /**
   * Grant 1 credit for a verified game win
   */
  public async grantGameReward(userId: string, gameType: string, sessionId: string): Promise<CreditLedgerEntry | null> {
    const idempotencyKey = `game_win_${sessionId}`;
    return await db.addLedgerEntry({
      user_id: userId,
      amount: 1,
      credit_type: 'game',
      category: 'grant',
      reason: `Reward for winning ${gameType}`,
      idempotency_key: idempotencyKey,
      metadata: { gameType, sessionId }
    });
  }

  /**
   * Check if user has at least `required` credits available (taking active reservations into account)
   */
  public async hasAvailableCredits(userId: string, required: number = 1): Promise<boolean> {
    const balances = await db.getBalances(userId);
    // Calculate total currently reserved by pending operations for this user
    let reservedCredits = 0;
    for (const res of this.activeReservations.values()) {
      if (res.userId === userId && res.status === 'active') {
        reservedCredits += res.creditsReserved;
      }
    }
    return (balances.total - reservedCredits) >= required;
  }

  /**
   * Reserve credits prior to AI generation
   */
  public async reserveCredits(userId: string, amount: number = 1): Promise<{ success: boolean; reservationId?: string; error?: string }> {
    const available = await this.hasAvailableCredits(userId, amount);
    if (!available) {
      return { success: false, error: "You're out of credits." };
    }

    const reservationId = uuidv4();
    this.activeReservations.set(reservationId, {
      id: reservationId,
      userId,
      creditsReserved: amount,
      createdAt: Date.now(),
      status: 'active'
    });

    return { success: true, reservationId };
  }

  /**
   * Commit debit for generated lines.
   * If lineCount <= 500, debits 1 credit.
   * If lineCount > 500, calculates credits = ceil(lineCount / 500).
   */
  public async commitGenerationDebit(
    userId: string,
    reservationId: string,
    linesGenerated: number,
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; creditsCharged: number; ledgerEntry?: CreditLedgerEntry | null }> {
    const reservation = this.activeReservations.get(reservationId);
    if (reservation) {
      reservation.status = 'committed';
      this.activeReservations.delete(reservationId);
    }

    // If zero lines were generated, release reservation and do not charge
    if (linesGenerated <= 0) {
      return { success: true, creditsCharged: 0 };
    }

    const creditsNeeded = Math.max(1, Math.ceil(linesGenerated / LineCounter.MAX_LINES_PER_CREDIT));
    const idempotencyKey = `debit_gen_${reservationId}_${Date.now()}`;

    // Record negative debit in ledger
    const entry = await db.addLedgerEntry({
      user_id: userId,
      amount: -creditsNeeded,
      credit_type: 'daily', // will be deducted according to ledger waterfall
      category: 'debit',
      reason: `AI generation (${linesGenerated} lines)`,
      idempotency_key: idempotencyKey,
      metadata: {
        ...metadata,
        linesGenerated,
        reservationId,
        creditsCharged: creditsNeeded
      }
    });

    return {
      success: !!entry,
      creditsCharged: creditsNeeded,
      ledgerEntry: entry
    };
  }

  /**
   * Release reservation in case of upstream failure or aborted generation
   */
  public releaseReservation(reservationId: string): void {
    const reservation = this.activeReservations.get(reservationId);
    if (reservation) {
      reservation.status = 'released';
      this.activeReservations.delete(reservationId);
    }
  }

  /**
   * Get full wallet breakdown
   */
  public async getWallet(userId: string): Promise<CreditBalances & { transactions: CreditLedgerEntry[] }> {
    // Automatically trigger daily grant check on wallet query
    await this.processDailyGrant(userId);
    const balances = await db.getBalances(userId);
    const transactions = await db.getTransactions(userId, 30);
    return {
      ...balances,
      transactions
    };
  }
}

export const creditManager = new CreditManager();
