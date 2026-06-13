import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_nasabah, items } = body; // items is an array of { id_item, quantity }

    if (!id_nasabah || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Invalid input parameters.' }, { status: 400 });
    }

    const exchangeResult = await prisma.$transaction(async (tx) => {
      let totalPointsUsed = 0;
      const createdExchanges = [];

      // Validasi dan hitung total poin
      for (const reqItem of items) {
        if (reqItem.quantity <= 0) continue;

        const item = await tx.item.findUnique({
          where: { id_item: reqItem.id_item },
        });

        if (!item) throw new Error(`Barang dengan ID ${reqItem.id_item} tidak ditemukan.`);
        if (!item.is_active) throw new Error(`Barang ${item.item_name} tidak aktif.`);
        if (item.stock < reqItem.quantity) throw new Error(`Stok ${item.item_name} tidak cukup. Sisa stok: ${item.stock}`);

        totalPointsUsed += item.point_cost * reqItem.quantity;
      }

      // Validasi Saldo
      const pointWallet = await tx.point.findUnique({
        where: { id_nasabah },
      });

      if (!pointWallet) throw new Error('Dompet poin tidak ditemukan.');
      if (pointWallet.balance < totalPointsUsed) {
        throw new Error(`Saldo poin tidak cukup. Saldo Anda: ${pointWallet.balance}, dibutuhkan: ${totalPointsUsed}`);
      }

      // Kurangi saldo
      const updatedPoint = await tx.point.update({
        where: { id_nasabah },
        data: { balance: { decrement: totalPointsUsed } },
      });

      if (updatedPoint.balance < 0) throw new Error('Saldo poin tidak cukup (race condition).');

      // Update stok dan buat record pertukaran
      for (const reqItem of items) {
        if (reqItem.quantity <= 0) continue;

        const item = await tx.item.findUnique({ where: { id_item: reqItem.id_item } });
        if (!item) continue;

        const updatedItem = await tx.item.update({
          where: { id_item: reqItem.id_item },
          data: { stock: { decrement: reqItem.quantity } },
        });

        if (updatedItem.stock < 0) throw new Error(`Stok ${item.item_name} tidak cukup (race condition).`);

        const newExchange = await tx.pointExchange.create({
          data: {
            id_nasabah,
            id_item: reqItem.id_item,
            quantity: reqItem.quantity,
            total_points_used: item.point_cost * reqItem.quantity,
            status: 'pending',
          },
        });

        createdExchanges.push(newExchange);
      }

      return {
        exchanges: createdExchanges,
        remaining_balance: updatedPoint.balance,
      };
    });

    return NextResponse.json({ success: true, data: exchangeResult }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in POST /api/nasabah/exchange:', error);
    return NextResponse.json({ message }, { status: 400 });
  }
}
