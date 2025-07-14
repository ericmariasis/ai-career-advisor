/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker/locale/en_US'; // ← NO .js at the end!

// 1️⃣  Load source files
const BASE = path.resolve('scripts/datasets');
const companies = JSON.parse(
  fs.readFileSync(path.join(BASE, 'inc5000', 'inc5000.json'))
);
const people = JSON.parse(
  fs.readFileSync(path.join(BASE, 'contacts', 'contacts.json'))
);

// 2️⃣  Quick map: company → possible contacts
const byCompany = people.reduce((acc, p) => {
  const key = p.company?.trim();
  if (!key) return acc;
  (acc[key] ??= []).push(p);
  return acc;
}, {});

// 3️⃣  Helper to sample
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 4️⃣  Define a small skills dictionary per industry
const SKILLS = {
  Software: ['python', 'node.js', 'aws', 'typescript', 'kubernetes'],
  Health: ['clinical research', 'biostatistics', 'python', 'sql'],
  Education: ['curriculum design', 'data analysis', 'spark', 'nlp'],
  // fallback
  default: ['communication', 'project management', 'excel'],
};

// 5️⃣  Build job objects
const jobs = [];
let id = 1;

for (const c of companies) {
  // pick 1-3 titles per company
  const titles = faker.helpers.arrayElements(
    [
      'Senior Data Scientist',
      'Machine Learning Engineer',
      'Analytics Engineer',
      'Data Engineer',
      'Product Data Scientist',
    ],
    faker.number.int({ min: 1, max: 3 })
  );

  for (const title of titles) {
    // find a matching contact, else make one
    const contact = pick(byCompany[c.name] ?? []);
    const contact_name = contact
      ? `${contact.first_name} ${contact.last_name}`
      : faker.person.fullName();
    const contact_email =
      contact?.email ?? faker.internet.email({ provider: c.domain ?? 'example.com' });

    const skills = faker.helpers.arrayElements(
      SKILLS[c.industry] ?? SKILLS.default,
      faker.number.int({ min: 3, max: 5 })
    );

    jobs.push({
      objectID: id++,
      title,
      company: c.name,
      industry: c.industry,
      location: `${c.city}, ${c.state}`,
      salary_estimate: faker.number.int({ min: 90000, max: 220000 }),
      skills,
      contact_name,
      contact_email,
      source: 'synthetic_inc5000_v1',
    });
  }
}

fs.writeFileSync('jobs_seed.json', JSON.stringify(jobs, null, 2));
console.log(`✅  Wrote jobs_seed.json with ${jobs.length} records`);
