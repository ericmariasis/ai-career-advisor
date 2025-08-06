"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLimiter = exports.generalApiLimiter = exports.feedbackLimiter = exports.aiEndpointLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// IP-based rate limiting for OpenAI endpoints
exports.aiEndpointLimiter = (0, express_rate_limit_1.default)({
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
    keyGenerator: (req) => {
        var _a;
        return `${req.ip}_${((_a = req.get('User-Agent')) === null || _a === void 0 ? void 0 : _a.slice(0, 50)) || 'unknown'}`;
    },
});
// More restrictive rate limiting for feedback endpoint (most expensive)
exports.feedbackLimiter = (0, express_rate_limit_1.default)({
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
exports.generalApiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs for general endpoints
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Burst protection for search endpoints
exports.searchLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
        error: 'Search rate limit exceeded. Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
