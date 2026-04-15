const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const d = await prisma.device.findFirst({ where: { id_nasabah: 'd576cd8d-56d8-4b7f-9c3e-d6521ca7c1f1' } });
    console.log('active:', d);
    const a = await prisma.device.findMany({ where: { status: 'online', id_nasabah: null } });
    console.log('avail:', a);
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
