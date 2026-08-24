"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.JWT_SECRET = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Organizer_js_1 = require("../models/Organizer.js");
exports.JWT_SECRET = process.env.JWT_SECRET || 'gatekeeper-production-super-secret-key-2026';
const authMiddleware = async (req, res, next) => {
    try {
        let token;
        // Check Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        else if (req.cookies && req.cookies.token) {
            // Check httpOnly cookie
            token = req.cookies.token;
        }
        if (!token) {
            res.status(401).json({ error: 'Authentication required. No valid token found.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        const organizer = await Organizer_js_1.Organizer.findById(decoded.id);
        if (!organizer) {
            res.status(401).json({ error: 'Organizer account not found.' });
            return;
        }
        req.organizer = organizer;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired authentication token.' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
