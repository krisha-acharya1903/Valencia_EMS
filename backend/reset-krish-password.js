import bcrypt from "bcryptjs";
import { db } from "./database.js";

const email = "krish@valencia.com";
const password = "87654321";

const user = db
  .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
  .get(email);

const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

const hash = await bcrypt.hash(password, 10);

if (user) {
  db.prepare(
    `
    UPDATE users
    SET password_hash = ?,
        role = ?,
        status = ?,
        updated_at = ?
    WHERE id = ?
  `
  ).run(hash, "admin", "active", now, user.id);

  db.prepare(
    `
    UPDATE login_strikes
    SET status = 'cleared'
    WHERE user_id = ?
      AND status = 'active'
  `
  ).run(user.id);

  console.log("ADMIN RESET DONE");
  console.log("Email:", email);
  console.log("Password:", password);
} else {
  db.prepare(
    `
    INSERT INTO users (
      name,
      email,
      phone,
      password_hash,
      role,
      department,
      designation,
      status,
      profile_image,
      office_location,
      created_at,
      updated_at,
      last_login_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    "Krish",
    email,
    "9999999999",
    hash,
    "admin",
    "Software Team",
    "Admin",
    "active",
    "",
    "Main Campus",
    now,
    now,
    now
  );

  console.log("ADMIN CREATED");
  console.log("Email:", email);
  console.log("Password:", password);
}