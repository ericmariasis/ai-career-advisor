import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// IP-based rate limiting for OpenAI endpoints
export const aiEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for AI endpoints
  message: {
    error: 'Too many AI requests from this IP, please try again in 15 minutes.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from rate limiting count
  skipSuccessfulRequests: false,
  // Skip failed requests from rate limiting count  
  skipFailedRequests: true,
  // Custom key generator to include user agent for better tracking
  keyGenerator: (req: Request): string => {
    return `${req.ip}_${req.get('User-Agent')?.slice(0, 50) || 'unknown'}`;
  },
});

// More restrictive rate limiting for feedback endpoint (most expensive)
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 feedback requests per hour per IP
  message: {
    error: 'Resume feedback limit reached. Please try again in 1 hour.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs for general endpoints
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Burst protection for search endpoints
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    error: 'Search rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
