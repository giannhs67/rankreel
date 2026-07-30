// Creates the single owner account for this RankReel instance.
// Usage: npm run create-owner -- <email> <password>
// (or set OWNER_EMAIL / OWNER_PASSWORD in .env.local and omit the args)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] || process.env.OWNER_EMAIL;
const password = process.argv[3] || process.env.OWNER_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local.",
  );
  process.exit(1);
}

if (!email || !password) {
  console.error(
    "Usage: npm run create-owner -- <email> <password>\n" +
      "(or set OWNER_EMAIL / OWNER_PASSWORD in .env.local and omit the args)",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error("Failed to check existing users:", listError.message);
  process.exit(1);
}

if (existing.users.some((u) => u.email === email)) {
  console.error(
    `A user with email ${email} already exists. Use "npm run reset-password -- ${email} <newPassword>" instead.`,
  );
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create owner account:", error.message);
  process.exit(1);
}

console.log(`Owner account created: ${data.user.email} (${data.user.id})`);
console.log(
  "Now disable public signups: Supabase Dashboard → Authentication → Sign In / Providers → Email → turn off 'Allow new users to sign up'.",
);
