"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearchRequest = exports.validateResumeRequest = void 0;
// Validate resume text size and content
const validateResumeRequest = (req, res, next) => {
    const { resumeText } = req.body;
    if (!resumeText) {
        return res.status(400).json({ error: 'resumeText is required' });
    }
    const text = typeof resumeText === 'string' ? resumeText : String(resumeText);
    // Limit resume text size to prevent token abuse
    const MAX_RESUME_LENGTH = 10000; // ~2000 tokens max
    if (text.length > MAX_RESUME_LENGTH) {
        return res.status(400).json({
            error: `Resume text too long. Maximum ${MAX_RESUME_LENGTH} characters allowed.`,
            received: text.length
        });
    }
    // Basic spam detection
    const suspiciousPatterns = [
        /(.)\1{50,}/i, // Repeated characters (50+ times)
        /\b(test|spam|lorem ipsum)\b/gi, // Common spam words
        /[^\w\s.,;:!?()\-'"@#$%&*+=<>\/\\]{10,}/gi, // Excessive special chars
    ];
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
            return res.status(400).json({
                error: 'Invalid resume content detected'
            });
        }
    }
    next();
};
exports.validateResumeRequest = validateResumeRequest;
// Validate search queries
const validateSearchRequest = (req, res, next) => {
    const { q, text } = req.query;
    const query = q || text;
    if (query && typeof query === 'string') {
        // Limit search query length
        if (query.length > 200) {
            return res.status(400).json({
                error: 'Search query too long. Maximum 200 characters allowed.'
            });
        }
        // Block potentially malicious queries
        const maliciousPatterns = [
            /<script/i, // XSS attempts
            /javascript:/i, // JavaScript injections
            /data:text\/html/i, // Data URLs
            /\beval\s*\(/i, // Eval attempts
        ];
        for (const pattern of maliciousPatterns) {
            if (pattern.test(query)) {
                return res.status(400).json({
                    error: 'Invalid search query'
                });
            }
        }
    }
    next();
};
exports.validateSearchRequest = validateSearchRequest;
