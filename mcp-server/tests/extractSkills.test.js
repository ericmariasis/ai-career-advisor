"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/extractSkills.test.ts
const extractSkills_1 = require("../src/utils/extractSkills");
it('pulls skills', () => {
    const txt = 'Experienced in Python, SQL & AWS with strong communication';
    expect((0, extractSkills_1.extractSkills)(txt)).toEqual(['python', 'sql', 'aws', 'communication']);
});
