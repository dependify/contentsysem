import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for auth
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for password reset
export const passwordResetRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
        success: false,
        error: 'Too many password reset attempts. Please try again after 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter (more lenient)
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        error: 'Too many requests. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for expensive operations (AI generation, etc.)
export const strictRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Only 5 expensive operations per minute
    message: {
        success: false,
        error: 'Rate limit exceeded for this operation. Please wait a moment.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
