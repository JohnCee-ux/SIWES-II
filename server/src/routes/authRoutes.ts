import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Organizer } from '../models/Organizer.js';
import { authMiddleware, AuthenticatedRequest, JWT_SECRET } from '../middleware/authMiddleware.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const setAuthCookie = (res: Response, token: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
};

// Register Organizer
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const existing = await Organizer.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const organizer = await Organizer.create({
      name: validated.name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = jwt.sign(
      { id: organizer._id.toString(), email: organizer.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    setAuthCookie(res, token);

    res.status(201).json({
      token,
      organizer: {
        id: organizer._id.toString(),
        name: organizer.name,
        email: organizer.email,
        createdAt: organizer.createdAt,
        updatedAt: organizer.updatedAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login Organizer
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const organizer = await Organizer.findOne({ email: normalizedEmail });
    if (!organizer) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(validated.password, organizer.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: organizer._id.toString(), email: organizer.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    setAuthCookie(res, token);

    res.json({
      token,
      organizer: {
        id: organizer._id.toString(),
        name: organizer.name,
        email: organizer.email,
        createdAt: organizer.createdAt,
        updatedAt: organizer.updatedAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Logout Organizer
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get Current Logged-in Organizer
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const organizer = req.organizer!;
  res.json({
    organizer: {
      id: organizer._id.toString(),
      name: organizer.name,
      email: organizer.email,
      createdAt: organizer.createdAt,
      updatedAt: organizer.updatedAt,
    },
  });
});

export default router;
