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
  const mitra = await prisma.user.upsert({
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

  // 6. Seed Perangkat (Device)
  const device = await prisma.device.upsert({
    where: { device_code: 'DEV-001-SB' },
    update: {},
    create: {
      device_code: 'DEV-001-SB',
      location_name: 'Mitra Sudirman',
      address: 'Jl. Jend. Sudirman No. 123, Surabaya',
      status: 'online',
      process: 'disconnect',
      id_mitra: mitra.id_user,
    },
  });

  // 7. Seed Jerigen
  await prisma.jerigen.upsert({
    where: { jerigen_code: 'JG-GOOD-01' },
    update: {},
    create: {
      jerigen_code: 'JG-GOOD-01',
      id_device: device.id_device,
      max_capacity: 100,
      current_volume: 0,
      status: 'empty',
    },
  });

  await prisma.jerigen.upsert({
    where: { jerigen_code: 'JG-BAD-01' },
    update: {},
    create: {
      jerigen_code: 'JG-BAD-01',
      id_device: device.id_device,
      max_capacity: 100,
      current_volume: 0,
      status: 'empty',
    },
  });

  // 8. Seed Point Rules
  await prisma.pointRule.upsert({
    where: { id_rule: 1 },
    update: {},
    create: {
      id_rule: 1,
      quality: 'good',
      point_per_liter: 50,
      is_active: true,
    },
  });

  await prisma.pointRule.upsert({
    where: { id_rule: 2 },
    update: {},
    create: {
      id_rule: 2,
      quality: 'bad',
      point_per_liter: 10,
      is_active: true,
    },
  });

  console.log('✅ Seeding database berhasil! Data user, device, jerigen, dan point rules telah dibuat.');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });