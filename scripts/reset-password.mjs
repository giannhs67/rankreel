// Resets the owner account's password for this RankReel instance.
// Usage: npm run reset-password -- <email> <newPassword>
// (or set OWNER_EMAIL / OWNER_PASSWORD in .env.local and omit the args)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] || process.env.OWNER_EMAIL;
const newPassword = process.argv[3] || process.env.OWNER_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local.",
  );
  process.exit(1);
}

if (!email || !newPassword) {
  console.error(
    "Usage: npm run reset-password -- <email> <newPassword>\n" +
      "(or set OWNER_EMAIL / OWNER_PASSWORD in .env.local and omit the args)",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error("Failed to look up users:", listError.message);
  process.exit(1);
}

const user = existing.users.find((u) => u.email === email);
if (!user) {
  console.error(`No user found with email ${email}. Use "npm run create-owner" first.`);
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword,
});

if (error) {
  console.error("Failed to reset password:", error.message);
  process.exit(1);
}

console.log(`Password updated for ${email}.`);
