require('ts-node').register({ transpileOnly: true });
const { prisma } = require('./app/lib/prisma.ts');

async function main() {
  try {
    const idNasabah = 'd576cd8d-56d8-4b7f-9c3e-d6521ca7c1f1';
    
    console.log("Finding active device...");
    const activeDevice = await prisma.device.findFirst({
      where: { id_nasabah: idNasabah }
    });
    console.log("Active device:", activeDevice);
    
    console.log("Finding available devices...");
    const availableDevices = await prisma.device.findMany({
      where: { status: 'online', id_nasabah: null }
    });
    console.log("Available devices:", availableDevices);
    
  } catch(e) {
    console.error('TEST ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
