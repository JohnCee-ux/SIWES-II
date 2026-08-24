import rateLimit from 'express-rate-limit';

export const publicRegisterLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 registration requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many registration requests from this IP. Please try again in a minute.',
  },
});
