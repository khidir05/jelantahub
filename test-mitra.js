require('ts-node').register({ transpileOnly: true });
const { prisma } = require('./app/lib/prisma.ts');

async function main() {
  // Use a fake ID to see how it operates
  const id_mitra = '2b2cdbbd-8c3a-4b3f-ad89-8687f5ab0924';
  try {
    const device = await prisma.device.findFirst({
      where: { id_mitra: id_mitra },
      include: {
        jerigens: true, 
      }
    });
    console.log(device);
  } catch(e) {
    console.error('ERROR MITRA GET:', e.message);
  } finally {
    process.exit(0);
  }
}
main();
