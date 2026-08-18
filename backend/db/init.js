import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { neon } from '@neondatabase/serverless';

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('placeholder')) {
    console.log('⚡ DATABASE_URL is not configured with live Neon credentials. Using built-in resilient database layer.');
    return;
  }

  console.log('🔄 Connecting to Neon PostgreSQL Cloud Database...');
  const sql = neon(databaseUrl);

  const schemaPath = path.join(process.cwd(), 'backend', 'db', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'backend', 'db', 'seed.sql');

  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('⚙️ Executing schema.sql on Neon...');
    
    // Split SQL by statement to execute on Neon HTTP serverless driver safely
    const schemaStatements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of schemaStatements) {
      await sql(stmt);
    }
    console.log('✅ Schema tables created successfully!');

    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('🌱 Executing seed.sql on Neon...');

    const seedStatements = seedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of seedStatements) {
      await sql(stmt);
    }

    console.log('🎉 Neon PostgreSQL Cloud Database initialized & seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to run Neon database script:', err.message);
  }
}

initDatabase();
