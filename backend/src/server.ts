import { app } from './app.js';
import { db } from './db.js';
import { seed } from './seed.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// Auto-seed if database is empty
const candidateCount = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM candidates;').get()?.count ?? 0;
if (candidateCount === 0) {
  console.log('Database empty. Seeding initial data...');
  seed(db);
}

app.listen(PORT, () => {
  console.log(`Recruiter-Bot server running at http://localhost:${PORT}`);
});
