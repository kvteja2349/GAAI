import test from 'node:test';
import assert from 'node:assert';
import { db } from '../database/db.js';
import { creditManager } from '../credits/creditManager.js';

test('Credit System: Welcome grant is granted exactly once (5 credits)', async () => {
  const user = await db.createUser({
    email: `test_welcome_${Date.now()}@gaai.local`,
    display_name: 'Test Welcome User',
    auth_provider: 'email',
    welcome_granted: false
  });

  // First grant should succeed
  const grantedFirst = await creditManager.grantWelcomeCredits(user.id);
  assert.strictEqual(grantedFirst, true);

  const balanceFirst = await db.getBalances(user.id);
  assert.strictEqual(balanceFirst.welcome, 5);
  assert.strictEqual(balanceFirst.total, 5);

  // Second grant attempt must be rejected (idempotency & welcome_granted flag)
  const grantedSecond = await creditManager.grantWelcomeCredits(user.id);
  assert.strictEqual(grantedSecond, false);

  const balanceSecond = await db.getBalances(user.id);
  assert.strictEqual(balanceSecond.welcome, 5);
  assert.strictEqual(balanceSecond.total, 5);
});

test('Credit System: Daily credits granted only once per reset date', async () => {
  const user = await db.createUser({
    email: `test_daily_${Date.now()}@gaai.local`,
    display_name: 'Test Daily User',
    auth_provider: 'email',
    welcome_granted: true
  });

  const firstClaim = await creditManager.processDailyGrant(user.id);
  assert.strictEqual(firstClaim, true);

  const secondClaim = await creditManager.processDailyGrant(user.id);
  assert.strictEqual(secondClaim, false);

  const balances = await db.getBalances(user.id);
  assert.strictEqual(balances.daily, 5);
});

test('Credit System: Game-earned credits remain separate from daily credits', async () => {
  const user = await db.createUser({
    email: `test_game_cred_${Date.now()}@gaai.local`,
    display_name: 'Gamer',
    auth_provider: 'email',
    welcome_granted: true
  });

  // Grant 1 game reward
  const sessionId = `mock_session_${Date.now()}`;
  await creditManager.grantGameReward(user.id, 'cricket', sessionId);

  const balances = await db.getBalances(user.id);
  assert.strictEqual(balances.game, 1);
  assert.strictEqual(balances.daily, 0);
  assert.strictEqual(balances.total, 1);
});

test('Credit System: Duplicate request cannot award the same transaction twice (Idempotency)', async () => {
  const user = await db.createUser({
    email: `test_idempotent_${Date.now()}@gaai.local`,
    display_name: 'Idempotency Tester',
    auth_provider: 'email',
    welcome_granted: true
  });

  const duplicateKey = `test_key_unique_${Date.now()}`;

  const entry1 = await db.addLedgerEntry({
    user_id: user.id,
    amount: 1,
    credit_type: 'game',
    category: 'grant',
    reason: 'Test Reward',
    idempotency_key: duplicateKey
  });

  const entry2 = await db.addLedgerEntry({
    user_id: user.id,
    amount: 1,
    credit_type: 'game',
    category: 'grant',
    reason: 'Test Reward Duplicate Attempt',
    idempotency_key: duplicateKey
  });

  assert.strictEqual(entry1?.id, entry2?.id);

  const balances = await db.getBalances(user.id);
  assert.strictEqual(balances.game, 1);
});

test('Credit System: 500-line debit calculation', async () => {
  const user = await db.createUser({
    email: `test_debit_${Date.now()}@gaai.local`,
    display_name: 'Debit Tester',
    auth_provider: 'email',
    welcome_granted: false
  });

  await creditManager.grantWelcomeCredits(user.id); // 5 credits
  const reserve = await creditManager.reserveCredits(user.id, 1);
  assert.strictEqual(reserve.success, true);

  // Commit debit for 450 lines -> should cost 1 credit
  const debitRes = await creditManager.commitGenerationDebit(user.id, reserve.reservationId!, 450);
  assert.strictEqual(debitRes.creditsCharged, 1);

  const finalBalances = await db.getBalances(user.id);
  assert.strictEqual(finalBalances.total, 4);
});
