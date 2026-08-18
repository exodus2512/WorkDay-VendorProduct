import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { query } from "../db/db.js";

async function migrate() {
  console.log("[Migration] Creating timer_sessions table...");

  await query(`
    CREATE TABLE IF NOT EXISTS timer_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      milestone_id INT NULL REFERENCES milestones(id) ON DELETE SET NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_resumed_at TIMESTAMPTZ,
      total_seconds_accumulated INT DEFAULT 0,
      status TEXT CHECK (status IN ('RUNNING', 'PAUSED', 'STOPPED')) DEFAULT 'RUNNING',
      timesheet_entry_id INT NULL REFERENCES timesheet_entries(id) ON DELETE SET NULL,
      notes TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_status
      ON timer_sessions(user_id, status);
  `);

  console.log("[Migration] timer_sessions table created successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[Migration] Failed:", err);
  process.exit(1);
});
