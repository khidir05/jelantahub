// app/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:myamlabar@localhost:5432/jelanta?schema=public";

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
  pgPool: Pool;
};

// Reuse database connection pool in development to prevent connection leaks
const pool = globalForPrisma.pgPool || new Pool({ 
  connectionString,
  max: 10, // batasi maksimum koneksi pool agar efisien
  idleTimeoutMillis: 30000 
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.pgPool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;