"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUniqueTicketCredentials = exports.generateOpaqueQRToken = exports.generateSecureTicketCode = exports.generateRandomBase32 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Attendee_js_1 = require("../models/Attendee.js");
// Base32 Crockford character set (excluding I, L, O, U to avoid ambiguity)
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const generateRandomBase32 = (length = 8) => {
    const bytes = crypto_1.default.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += CROCKFORD_CHARS[bytes[i] % CROCKFORD_CHARS.length];
    }
    return result;
};
exports.generateRandomBase32 = generateRandomBase32;
const generateSecureTicketCode = (prefix) => {
    const cleanPrefix = (prefix || 'TKT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const part1 = (0, exports.generateRandomBase32)(4);
    const part2 = (0, exports.generateRandomBase32)(4);
    return `${cleanPrefix}-${part1}-${part2}`;
};
exports.generateSecureTicketCode = generateSecureTicketCode;
const generateOpaqueQRToken = () => {
    // 192-bit cryptographically secure random token (48 hex characters)
    return crypto_1.default.randomBytes(24).toString('hex');
};
exports.generateOpaqueQRToken = generateOpaqueQRToken;
const createUniqueTicketCredentials = async (eventId, prefix, maxAttempts = 5) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const ticketCode = (0, exports.generateSecureTicketCode)(prefix);
        const qrToken = (0, exports.generateOpaqueQRToken)();
        // Check if code or token already exists for this event
        const existing = await Attendee_js_1.Attendee.findOne({
            eventId,
            $or: [{ ticketCode }, { qrToken }],
        });
        if (!existing) {
            return { ticketCode, qrToken };
        }
    }
    // Fallback with extra timestamp entropy if collisions occur
    const ticketCode = `${prefix.toUpperCase()}-${(0, exports.generateRandomBase32)(5)}-${Date.now().toString(36).toUpperCase()}`;
    const qrToken = crypto_1.default.randomBytes(32).toString('hex');
    return { ticketCode, qrToken };
};
exports.createUniqueTicketCredentials = createUniqueTicketCredentials;
