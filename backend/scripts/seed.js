// Demo data matching the prototype: one workspace, four people, password "password1234".
import bcrypt from 'bcryptjs';
import { pool, tx } from '../src/db.js';

const people = [
  ['Alex', 'Balakirev', 'alex@projectflow.app', 'OWNER'],
  ['Sarah', 'Lee', 'sarah@acme.io', 'ADMIN'],
  ['John', 'Doe', 'john@acme.io', 'MANAGER'],
  ['Mia', 'Chen', 'mia@acme.io', 'MEMBER'],
];

const hash = await bcrypt.hash('password1234', 12);
await tx(async (db) => {
  if ((await db.query('SELECT 1 FROM users WHERE email = $1', [people[0][2]])).rowCount) {
    console.log('seed data already present'); return;
  }
  const ids = [];
  for (const [f, l, e] of people) {
    ids.push((await db.query('INSERT INTO users (first_name,last_name,email,password_hash,email_verified_at) VALUES ($1,$2,$3,$4,now()) RETURNING id', [f, l, e, hash])).rows[0].id);
  }
  const ws = (await db.query("INSERT INTO workspaces (name, owner_id) VALUES ('Acme Studio', $1) RETURNING id", [ids[0]])).rows[0].id;
  for (let i = 0; i < people.length; i++) {
    await db.query('INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,$3)', [ws, ids[i], people[i][3]]);
  }
  console.log('seeded Acme Studio with', people.length, 'users');
});
await pool.end();
