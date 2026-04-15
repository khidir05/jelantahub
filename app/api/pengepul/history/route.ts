import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id_pengepul = searchParams.get('id_pengepul');

  if (!id_pengepul) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const logs = await prisma.pickupLog.findMany({
      where: { id_pengepul },
      include: {
        device: true, // Ambil info lokasi
      },
      orderBy: { created_at: 'desc' }, // Terbaru di atas
      take: 50 // Batasi 50 riwayat terakhir agar tidak berat
    });
    
    return NextResponse.json(logs, { status: 200 });
  } catch (error: any) {
    console.error('Error GET History:', error);
    return NextResponse.json({ message: `Error: ${error.message}` }, { status: 500 });
  }
}