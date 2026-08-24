"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const Organizer_js_1 = require("../models/Organizer.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const setAuthCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });
};
// Register Organizer
router.post('/register', async (req, res) => {
    try {
        const validated = registerSchema.parse(req.body);
        const normalizedEmail = validated.email.toLowerCase().trim();
        const existing = await Organizer_js_1.Organizer.findOne({ email: normalizedEmail });
        if (existing) {
            res.status(409).json({ error: 'An account with this email already exists.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(validated.password, salt);
        const organizer = await Organizer_js_1.Organizer.create({
            name: validated.name.trim(),
            email: normalizedEmail,
            passwordHash,
        });
        const token = jsonwebtoken_1.default.sign({ id: organizer._id.toString(), email: organizer.email }, authMiddleware_js_1.JWT_SECRET, { expiresIn: '8h' });
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
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: err.errors[0].message });
            return;
        }
        res.status(500).json({ error: err.message || 'Registration failed.' });
    }
});
// Login Organizer
router.post('/login', async (req, res) => {
    try {
        const validated = loginSchema.parse(req.body);
        const normalizedEmail = validated.email.toLowerCase().trim();
        const organizer = await Organizer_js_1.Organizer.findOne({ email: normalizedEmail });
        if (!organizer) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(validated.password, organizer.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: organizer._id.toString(), email: organizer.email }, authMiddleware_js_1.JWT_SECRET, { expiresIn: '8h' });
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
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: err.errors[0].message });
            return;
        }
        res.status(500).json({ error: err.message || 'Login failed.' });
    }
});
// Logout Organizer
router.post('/logout', (_req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});
// Get Current Logged-in Organizer
router.get('/me', authMiddleware_js_1.authMiddleware, async (req, res) => {
    const organizer = req.organizer;
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
exports.default = router;
