/**
 * Generates a small test-db.json fixture for E2E tests.
 * Produces 50 users with all fields required by the test page grids
 * (name, email, status, department, city).
 *
 * Usage: node generate-test-db.js
 * Output: test-db.json in the project root
 */
import { writeFileSync } from 'fs';

const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'];
const lastNames  = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];
const statuses   = ['active', 'inactive'];
const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
const cities      = ['London', 'Berlin', 'Paris', 'Madrid', 'Rome'];
const emailProviders = ['example.com', 'mail.com', 'test.com'];

const TOTAL = 50;

const users = Array.from({ length: TOTAL }, (_, i) => {
    const n   = i + 1;
    const first = firstNames[i % firstNames.length];
    const last  = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    return {
        id:         n,
        name:       `${first} ${last}`,
        email:      `${first.toLowerCase()}.${last.toLowerCase()}${n}@${emailProviders[n % emailProviders.length]}`,
        status:     statuses[n % 2],
        department: departments[n % departments.length],
        city:       cities[n % cities.length],
    };
});

writeFileSync('test-db.json', JSON.stringify({ users }, null, 2));
console.log(`Generated test-db.json with ${TOTAL} records.`);
