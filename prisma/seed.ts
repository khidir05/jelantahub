// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// 1. Ambil URL Database Anda
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:myamlabar@localhost:5432/jelanta?schema=public";

// 2. Buat koneksi Pool dan Adapter khusus Prisma 7
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 3. Masukkan adapter ke dalam PrismaClient
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Mulai proses seeding...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Seed Admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      password: defaultPassword,
      role: 'admin',
      is_active: true,
    },
  });

  // 2. Seed Nasabah
  const nasabah = await prisma.user.upsert({
    where: { username: 'nasabah1' },
    update: {},
    create: {
      name: 'Budi Nasabah',
      username: 'nasabah1',
      no_telp: '08123456789',
      password: defaultPassword,
      role: 'nasabah',
      is_active: true,
    },
  });

  // 3. Seed Mitra
  await prisma.user.upsert({
    where: { username: 'mitra1' },
    update: {},
    create: {
      name: 'Mitra Hub Sudirman',
      username: 'mitra1',
      password: defaultPassword,
      role: 'mitra',
      is_active: true,
    },
  });

  // 4. Seed Pengepul
  await prisma.user.upsert({
    where: { username: 'pengepul1' },
    update: {},
    create: {
      name: 'Joko Pengepul',
      username: 'pengepul1',
      password: defaultPassword,
      role: 'pengepul',
      is_active: true,
    },
  });

  // 5. Berikan Saldo Awal
  await prisma.point.upsert({
    where: { id_nasabah: nasabah.id_user },
    update: {},
    create: {
      id_nasabah: nasabah.id_user,
      balance: 0,
    },
  });

  console.log('✅ Seeding database berhasil! Data user telah dibuat.');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });