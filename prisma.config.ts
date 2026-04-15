import { defineConfig } from '@prisma/config';

export default defineConfig({
  // Tambahkan URL database Anda di sini agar Prisma CLI bisa melakukan push
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:myamlabar@localhost:5432/jelanta?schema=public",
  },
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});