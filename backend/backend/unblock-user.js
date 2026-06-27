import { db } from "./database.js";

const EMAIL_TO_UNBLOCK = "rajjagtap2321@gmail.com";

const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

const user = db
  .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
  .get(EMAIL_TO_UNBLOCK);

if (!user) {
  console.log("User not found:", EMAIL_TO_UNBLOCK);
  process.exit(1);
}

db.prepare(
  `
  UPDATE login_strikes
  SET status = 'cleared',
      cleared_at = ?,
      cleared_reason = ?
  WHERE user_id = ?
    AND status = 'active'
`
).run(now, "Emergency local unblock", user.id);

db.prepare(
  `
  UPDATE users
  SET status = 'active',
      updated_at = ?
  WHERE id = ?
`
).run(now, user.id);

const updated = db
  .prepare("SELECT id, name, email, role, status FROM users WHERE id = ?")
  .get(user.id);

console.log("User unblocked successfully:");
console.log(updated);