#!/usr/bin/env node
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const sql = postgres(
  process.env.DATABASE_URL ??
    "postgresql://implantolab:implantolab@localhost:5432/implantolab",
  { max: 1 },
);

try {
  const rows = await sql`
    select u.id, u.email, u.password_hash, p.role
      from public.users u
      join public.profiles p on p.id = u.id
     where u.email = 'admin@local.dev'
     limit 1
  `;
  if (!rows[0]) throw new Error("admin seed missing");
  const passwordOk = await bcrypt.compare(
    "ImplantolabDev1!",
    rows[0].password_hash,
  );
  if (!passwordOk) throw new Error("password mismatch");

  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  await sql`
    insert into public.sessions (user_id, token_hash, expires_at)
    values (${rows[0].id}, ${hash}, now() + interval '1 day')
  `;

  console.log("smoke-auth OK", {
    email: rows[0].email,
    role: rows[0].role,
    tokenPreview: `${token.slice(0, 12)}...`,
  });
} finally {
  await sql.end({ timeout: 5 });
}
