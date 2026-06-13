import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const idNasabah = request.headers.get('x-user-id');
  if (!idNasabah) return NextResponse.json({ message: 'User ID missing in headers' }, { status: 400 });

  try {
    const points = await prisma.point.findUnique({
      where: { id_nasabah: idNasabah }
    });

    const riwayat = await prisma.oilDeposit.findMany({
      where: { id_nasabah: idNasabah },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    return NextResponse.json({
      saldo_poin: points?.balance || 0,
      riwayat: riwayat
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/nasabah/tabungan:', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
