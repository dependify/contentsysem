
import { db } from '../execution/db_client';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  try {
    await db.initializeSchema();

    const email = 'admin@contentsys.com';
    const password = 'admin'; // In production, this should be a strong env var
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if admin exists
    const existing = await db.queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (existing) {
      console.log('Admin user already exists.');
      return;
    }

    await db.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')`,
      [email, passwordHash]
    );

    console.log('Default admin created: admin@contentsys.com / admin');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  seedAdmin();
}
