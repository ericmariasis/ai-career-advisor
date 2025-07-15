// tests/extractSkills.test.ts
import { extractSkills } from '../src/utils/extractSkills';

it('pulls skills', () => {
  const txt = 'Experienced in Python, SQL & AWS with strong communication';
  expect(extractSkills(txt)).toEqual(['python', 'sql', 'aws', 'communication']);
});
