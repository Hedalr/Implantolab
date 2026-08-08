#!/usr/bin/env node
/**
 * Seed fictif local. Mot de passe commun : ImplantolabDev1!
 * Usage: node db/seed.mjs
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://implantolab:implantolab@localhost:5432/implantolab";
const DEV_PASSWORD = "ImplantolabDev1!";

const sql = postgres(databaseUrl, { max: 1 });

const accounts = [
  {
    id: "22222222-2222-2222-2222-222222222201",
    email: "admin@local.dev",
    full_name: "Admin Local",
    role: "admin",
    sector_id: null,
    leave_balance_days: 0,
  },
  {
    id: "22222222-2222-2222-2222-222222222202",
    email: "praticien@local.dev",
    full_name: "Dr. Demo Praticien",
    role: "practitioner",
    sector_id: null,
    leave_balance_days: 0,
  },
  {
    id: "22222222-2222-2222-2222-222222222203",
    email: "prothesiste@local.dev",
    full_name: "Prothésiste Numérique",
    role: "prosthetist",
    sector_id: "11111111-1111-1111-1111-111111111101",
    leave_balance_days: 25,
  },
  {
    id: "22222222-2222-2222-2222-222222222204",
    email: "chef@local.dev",
    full_name: "Chef Secteur Amovible",
    role: "chef_de_secteur",
    sector_id: "11111111-1111-1111-1111-111111111102",
    leave_balance_days: 25,
  },
];

try {
  const sectorsSql = await readFile(join(__dirname, "seed.sql"), "utf8");
  await sql.unsafe(sectorsSql);

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  for (const account of accounts) {
    await sql`
      insert into public.users (id, email, password_hash, email_confirmed_at)
      values (
        ${account.id}::uuid,
        ${account.email},
        ${passwordHash},
        now()
      )
      on conflict (email) do update
        set password_hash = excluded.password_hash,
            email_confirmed_at = coalesce(public.users.email_confirmed_at, now())
    `;

    await sql`
      update public.profiles
         set role = ${account.role},
             full_name = ${account.full_name},
             sector_id = ${account.sector_id}::uuid,
             leave_balance_days = ${account.leave_balance_days},
             deleted_at = null
       where id = ${account.id}::uuid
    `;
  }

  console.log("Seed OK — comptes fictifs :");
  for (const a of accounts) {
    console.log(`  ${a.email} / ${DEV_PASSWORD}  (${a.role})`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
