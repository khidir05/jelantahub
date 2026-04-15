import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // Sesuaikan jalur jika berbeda

// GET: Ambil SEMUA data device untuk dilihat pengepul
export async function GET(request: Request) {
  try {
    const devices = await prisma.device.findMany({
      include: {
        jerigens: {
          orderBy: { jerigen_code: 'asc' }
        }
      },
      orderBy: { location_name: 'asc' } // Urutkan sesuai abjad lokasi
    });
    
    return NextResponse.json(devices, { status: 200 });
  } catch (error: any) {
    console.error('Error GET Pengepul:', error);
    return NextResponse.json({ message: `Error: ${error.message}` }, { status: 500 });
  }
}

// POST: Aksi "Ambil Minyak" (Picked Up) Per Jerigen
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Tambahkan id_jerigen ke payload
    const { id_device, id_pengepul, id_jerigen } = body; 

    // 1. Cari device dan jerigen SPESIFIK
    const device = await prisma.device.findUnique({
      where: { id_device },
      include: { jerigens: true }
    });

    if (!device) return NextResponse.json({ message: 'Device tidak ditemukan' }, { status: 404 });

    const targetJerigen = device.jerigens.find((j: any) => j.id_jerigen === id_jerigen);

    if (!targetJerigen) {
      return NextResponse.json({ message: 'Jerigen tidak ditemukan.' }, { status: 404 });
    }
    if (targetJerigen.current_volume === 0) {
      return NextResponse.json({ message: 'Tangki sudah kosong.' }, { status: 400 });
    }

    // 2. Transaksi untuk 1 Jerigen Spesifik
    await prisma.$transaction(async (tx: any) => {
      // A. Catat ke tabel pickup_logs
      await tx.pickupLog.create({
        data: {
          id_device: device.id_device,
          jerigen_code: targetJerigen.jerigen_code,
          id_pengepul: id_pengepul,
          volume_before: targetJerigen.current_volume,
          volume_taken: targetJerigen.current_volume,
        }
      });

      // B. Reset volume jerigen ke 0 dan update waktu
      await tx.jerigen.update({
        where: { id_jerigen: targetJerigen.id_jerigen },
        data: {
          current_volume: 0,
          status: 'empty',
          last_collected_at: new Date()
        }
      });
    });

    return NextResponse.json({ message: 'Berhasil mengangkut minyak dari tangki terpilih!' }, { status: 200 });
  } catch (error: any) {
    console.error('Error POST Pickup:', error);
    return NextResponse.json({ message: `Error: ${error.message}` }, { status: 500 });
  }
}