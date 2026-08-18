import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('placeholder')) {
    console.log('⚡ DATABASE_URL is not configured with live Neon credentials. Using built-in resilient database layer.');
    return;
  }

  console.log('🔄 Connecting to Neon PostgreSQL...');
  const sql = neon(databaseUrl);

  const schemaPath = path.join(process.cwd(), 'backend', 'db', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'backend', 'db', 'seed.sql');

  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('⚙️ Executing schema.sql...');
    await sql.query(schemaSql);

    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('🌱 Executing seed.sql...');
    await sql.query(seedSql);

    console.log('✅ Neon PostgreSQL Database initialized & seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to run Neon database script:', err.message);
  }
}

initDatabase();
