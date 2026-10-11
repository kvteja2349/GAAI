import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(50)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const googleAuthSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().optional()
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data.email, data.password, data.displayName);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const data = googleAuthSchema.parse(req.body);
    const result = await AuthService.loginWithGoogle(data.email, data.displayName, data.avatarUrl);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Google authentication failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const result = await AuthService.resetPassword(email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process request' });
  }
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
