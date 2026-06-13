import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkId = searchParams.get('check_id');
  const idNasabah = searchParams.get('id_nasabah');
  
  try {
    if (checkId) {
      const device = await prisma.device.findUnique({
        where: { id_device: checkId },
        select: { process: true }
      });
      if (!device) return NextResponse.json({ message: 'Device not found' }, { status: 404 });
      return NextResponse.json({ process: device.process });
    }
    
    if (idNasabah) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.device.updateMany({
        where: {
          process: { in: ['standby', 'load'] },
          updated_at: { lt: tenMinutesAgo }
        },
        data: {
          process: 'disconnect',
          id_nasabah: null
        }
      });

      const activeDevice = await prisma.device.findFirst({
        where: { id_nasabah: idNasabah }
      });
      
      const availableDevices = await prisma.device.findMany({
        where: { status: 'online', id_nasabah: null }
      });
      
      return NextResponse.json({
        activeDevice,
        availableDevices
      });
    }

    return NextResponse.json({ message: 'Invalid params' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/nasabah/device:', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id_device, id_nasabah } = body;
    
    if (!id_device) return NextResponse.json({ message: 'ID Device required' }, { status: 400 });

    if (action === 'SELECT') {
      const result = await prisma.device.updateMany({
        where: { id_device, process: 'disconnect' },
        data: { id_nasabah, process: 'standby' }
      });
      if (result.count === 0) {
         return NextResponse.json({ message: 'Mesin sedang digunakan atau tidak tersedia.' }, { status: 409 });
      }
    } else if (action === 'CANCEL') {
      await prisma.device.update({
        where: { id_device },
        data: { id_nasabah: null, process: 'standby' }
      });
    } else if (action === 'FINISH') {
      await prisma.device.update({
        where: { id_device },
        data: { id_nasabah: null, process: 'disconnect' }
      });
    } else if (action === 'SETOR') {
      await prisma.device.update({
        where: { id_device },
        data: { process: 'load' }
      });
    } else {
      return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in POST /api/nasabah/device:', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
