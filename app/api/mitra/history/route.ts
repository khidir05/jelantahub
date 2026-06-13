import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idMitra = searchParams.get('id_mitra');

  if (!idMitra) return NextResponse.json({ message: 'Missing id_mitra' }, { status: 400 });

  try {
    const exchanges = await prisma.pointExchange.findMany({
      where: { item: { id_mitra: idMitra } },
      include: {
        item: true,
        nasabah: { select: { name: true, username: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const pickups = await prisma.pickupLog.findMany({
      where: { device: { id_mitra: idMitra } },
      include: {
        device: true,
        pengepul: { select: { name: true, username: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ exchanges, pickups });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id_exchange, action } = body;

    if (!id_exchange || !action) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    // Mitra approving or cancelling a point exchange
    if (action === 'COMPLETED') {
      const updated = await prisma.pointExchange.update({
        where: { id_exchange },
        data: { status: 'completed' }
      });
      return NextResponse.json({ success: true, exchange: updated });
    } else if (action === 'CANCELLED') {
      // If cancelled, we must refund points and stock
      const exchangeResult = await prisma.$transaction(async (tx) => {
        const exchange = await tx.pointExchange.findUnique({ where: { id_exchange } });
        if (!exchange || exchange.status !== 'pending') {
          throw new Error('Transaksi tidak ditemukan atau sudah diproses.');
        }

        // 1. Ubah status
        const updated = await tx.pointExchange.update({
          where: { id_exchange },
          data: { status: 'cancelled' }
        });

        // 2. Kembalikan stok item
        await tx.item.update({
          where: { id_item: exchange.id_item },
          data: { stock: { increment: exchange.quantity } }
        });

        // 3. Kembalikan poin nasabah
        await tx.point.update({
          where: { id_nasabah: exchange.id_nasabah },
          data: { balance: { increment: exchange.total_points_used } }
        });

        return updated;
      });

      return NextResponse.json({ success: true, exchange: exchangeResult });
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
