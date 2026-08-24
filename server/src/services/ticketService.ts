import crypto from 'crypto';
import { Attendee } from '../models/Attendee.js';

// Base32 Crockford character set (excluding I, L, O, U to avoid ambiguity)
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const generateRandomBase32 = (length: number = 8): string => {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CROCKFORD_CHARS[bytes[i] % CROCKFORD_CHARS.length];
  }
  return result;
};

export const generateSecureTicketCode = (prefix: string): string => {
  const cleanPrefix = (prefix || 'TKT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const part1 = generateRandomBase32(4);
  const part2 = generateRandomBase32(4);
  return `${cleanPrefix}-${part1}-${part2}`;
};

export const generateOpaqueQRToken = (): string => {
  // 192-bit cryptographically secure random token (48 hex characters)
  return crypto.randomBytes(24).toString('hex');
};

export const createUniqueTicketCredentials = async (
  eventId: string,
  prefix: string,
  maxAttempts: number = 5
): Promise<{ ticketCode: string; qrToken: string }> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ticketCode = generateSecureTicketCode(prefix);
    const qrToken = generateOpaqueQRToken();

    // Check if code or token already exists for this event
    const existing = await Attendee.findOne({
      eventId,
      $or: [{ ticketCode }, { qrToken }],
    });

    if (!existing) {
      return { ticketCode, qrToken };
    }
  }

  // Fallback with extra timestamp entropy if collisions occur
  const ticketCode = `${prefix.toUpperCase()}-${generateRandomBase32(5)}-${Date.now().toString(36).toUpperCase()}`;
  const qrToken = crypto.randomBytes(32).toString('hex');
  return { ticketCode, qrToken };
};
