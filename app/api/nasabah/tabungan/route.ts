import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  // Ambil user id dari headers, frontend mengirimnya via x-user-id
  const idNasabah = request.headers.get('x-user-id');
  if (!idNasabah) return NextResponse.json({ message: 'User ID missing in headers' }, { status: 400 });

  try {
    // Ambil saldo point
    const points = await prisma.point.findUnique({
      where: { id_nasabah: idNasabah }
    });

    // Ambil riwayat setor minyak (OilDeposit)
    const riwayat = await prisma.oilDeposit.findMany({
      where: { id_nasabah: idNasabah },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    return NextResponse.json({
      saldo_poin: points?.balance || 0,
      riwayat: riwayat
    });
  } catch (error: any) {
    console.error('Error in GET /api/nasabah/tabungan:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
