"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_SKILLS = void 0;
exports.extractSkills = extractSkills;
/**
 * utils/extractSkills
 * ------------------------------------------------------------
 * Very-naïve keyword-matcher that maps free-text → known skills.
 *   • “known skills” comes from a constant list you control
 *     (the same list you used when seeding Algolia).
 *   • Returns them in lower-case, *deduplicated*, and in the
 *     original order of appearance.
 *
 * You can later:
 *   – read the list from a JSON file or DB
 *   – replace the RegExp with an LLM call (track-2 work)
 */
exports.KNOWN_SKILLS = [
    'python', 'sql', 'pandas', 'excel', 'spark',
    'communication', 'project management',
    'node.js', 'typescript', 'aws', 'kubernetes',
    'machine learning', 'deep learning',
    // …add as many as you like
];
const WORD_BOUNDARY = '\\b';
/**
 * extractSkills
 * @param text free-form text to analyse
 * @returns array of matched skills (lower-case)
 */
function extractSkills(text) {
    const lower = text.toLowerCase();
    const found = [];
    for (const skill of exports.KNOWN_SKILLS) {
        const pattern = new RegExp(`${WORD_BOUNDARY}${skill.replace('.', '\\.')}${WORD_BOUNDARY}`, 'i');
        const match = pattern.exec(text);
        if (match) {
            found.push({ skill, pos: match.index });
        }
    }
    // sort by first appearance
    found.sort((a, b) => a.pos - b.pos);
    return found.map((f) => f.skill);
}
