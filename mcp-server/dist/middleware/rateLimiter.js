"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLimiter = exports.generalApiLimiter = exports.feedbackLimiter = exports.aiEndpointLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
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
        const ip = (0, express_rate_limit_1.ipKeyGenerator)(req.ip || 'unknown');
        return `${ip}_${((_a = req.get('User-Agent')) === null || _a === void 0 ? void 0 : _a.slice(0, 50)) || 'unknown'}`;
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
