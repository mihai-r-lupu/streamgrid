import { writeFileSync } from 'fs';

const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];
const statuses = ['active', 'inactive'];
const emailDomains = ['example.com', 'mail.com', 'test.com', 'demo.org'];

const TOTAL_RECORDS = 300000;

const users = [];

for (let i = 1; i <= TOTAL_RECORDS; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];

    const name = `${firstName} ${lastName}`;

    const emailBase = lastName.toLowerCase();
    const randomNum = Math.floor(Math.random() * 1000);
    const email = `${emailBase}${randomNum}@${domain}`;

    users.push({
        id: i,
        name,
        email,
        status
    });
}

const db = { users };

writeFileSync('db.json', JSON.stringify(db, null, 2));

console.log('Generated db.json with', TOTAL_RECORDS, 'records.');
