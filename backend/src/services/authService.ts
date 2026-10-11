import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import { creditManager } from '../credits/creditManager.js';
import { User } from '../database/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gaai-production-super-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  public static async register(email: string, password: string, displayName: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.createUser({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      display_name: displayName.trim(),
      auth_provider: 'email',
      welcome_granted: false
    });

    // Grant 5 initial welcome credits
    await creditManager.grantWelcomeCredits(newUser.id);
    // Check daily grant for today
    await creditManager.processDailyGrant(newUser.id);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { password_hash, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  public static async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const user = await db.getUserByEmail(email);
    if (!user || !user.password_hash) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Ensure daily credits are granted if not already granted today
    await creditManager.processDailyGrant(user.id);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public static async loginWithGoogle(email: string, displayName: string, avatarUrl?: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    let user = await db.getUserByEmail(email);

    if (!user) {
      user = await db.createUser({
        email: email.toLowerCase().trim(),
        display_name: displayName || email.split('@')[0],
        avatar_url: avatarUrl,
        auth_provider: 'google',
        welcome_granted: false
      });

      // Grant welcome credits
      await creditManager.grantWelcomeCredits(user.id);
    }

    // Process daily credits
    await creditManager.processDailyGrant(user.id);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public static verifyToken(token: string): { userId: string; email: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    } catch {
      throw new Error('Invalid or expired authentication token.');
    }
  }

  public static async resetPassword(email: string): Promise<{ message: string }> {
    const user = await db.getUserByEmail(email);
    if (!user) {
      // Return success message anyway to prevent user enumeration
      return { message: 'If this email exists, a password reset link has been dispatched.' };
    }
    // In production with Supabase / SMTP, email is sent
    return { message: 'If this email exists, a password reset link has been dispatched.' };
  }
}
