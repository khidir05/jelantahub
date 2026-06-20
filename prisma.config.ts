import 'dotenv/config';
import { defineConfig } from '@prisma/config';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tidak ditemukan di file .env!");
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});