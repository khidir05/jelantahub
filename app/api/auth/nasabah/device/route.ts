import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Mengambil daftar mesin yang "online" & "disconnect", ATAU mesin yang sedang dipakai user ini
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id_nasabah = searchParams.get('id_nasabah');
  const check_id = searchParams.get('check_id');

  try {
    // Mode Polling: Cek 1 mesin spesifik
    if (check_id) {
      const device = await prisma.device.findUnique({ where: { id_device: check_id } });
      return NextResponse.json(device);
    }

    // Mode List: Cari mesin yang sedang aktif untuk user ini
    const activeDevice = await prisma.device.findFirst({
      where: { id_nasabah: id_nasabah },
    });

    if (activeDevice) {
      return NextResponse.json({ activeDevice, availableDevices: [] });
    }

    // Jika tidak ada yang aktif, cari semua mesin yang nganggur
    const availableDevices = await prisma.device.findMany({
      where: { status: 'online', process: 'disconnect' },
    });

    return NextResponse.json({ activeDevice: null, availableDevices });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching devices' }, { status: 500 });
  }
}

// POST: Mengubah State Mesin
export async function POST(request: Request) {
  try {
    const { action, id_device, id_nasabah } = await request.json();

    let updatedDevice;

    switch (action) {
      case 'SELECT': // Masuk ke Standby
        updatedDevice = await prisma.device.updateMany({
          where: { id_device, process: 'disconnect', status: 'online' },
          data: { process: 'standby', id_nasabah },
        });
        break;
      
      case 'SETOR': // Masuk ke Load
        updatedDevice = await prisma.device.updateMany({
          where: { id_device, process: 'standby', id_nasabah },
          data: { process: 'load' },
        });
        break;

      case 'CANCEL': // Kembali ke Standby dari Load
        updatedDevice = await prisma.device.updateMany({
          where: { id_device, process: 'load', id_nasabah },
          data: { process: 'standby' },
        });
        break;

      case 'FINISH': // Selesai, kembali ke Disconnect
        updatedDevice = await prisma.device.updateMany({
          where: { id_device, id_nasabah },
          data: { process: 'disconnect', id_nasabah: null },
        });
        break;

      default:
        return NextResponse.json({ message: 'Aksi tidak valid' }, { status: 400 });
    }

    if (updatedDevice.count === 0) {
      return NextResponse.json({ message: 'Gagal merubah state mesin. Mungkin mesin sedang dipakai.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Sukses', action });
  } catch (error) {
    console.error('Error action device:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}