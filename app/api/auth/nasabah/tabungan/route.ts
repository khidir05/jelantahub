import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Di aplikasi nyata, ID ini diambil dari verifikasi Token JWT di Headers.
    // Untuk penyederhanaan saat ini, kita ambil dari header atau query
    const id_nasabah = request.headers.get('x-user-id'); 

    if (!id_nasabah) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Ambil Poin
    const point = await prisma.point.findUnique({
      where: { id_nasabah },
    });

    // 2. Ambil Histori Setoran
    const history = await prisma.oilDeposit.findMany({
      where: { id_nasabah },
      orderBy: { created_at: 'desc' },
      take: 5, // Ambil 5 terbaru saja
    });

    return NextResponse.json({
      saldo_poin: point?.balance || 0,
      riwayat: history,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetch tabungan:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}