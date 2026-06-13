import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idMitra = searchParams.get('id_mitra');

  if (!idMitra) return NextResponse.json({ message: 'Missing id_mitra' }, { status: 400 });

  try {
    const items = await prisma.item.findMany({
      where: { id_mitra: idMitra },
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_mitra, item_name, description, point_cost, stock } = body;

    const newItem = await prisma.item.create({
      data: {
        id_mitra,
        item_name,
        description,
        point_cost: Math.round(parseFloat(point_cost)),
        stock: parseInt(stock, 10),
        is_active: true
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id_item, action, stock, is_active } = body;

    let updatedItem;
    if (action === 'UPDATE_STOCK') {
      updatedItem = await prisma.item.update({
        where: { id_item },
        data: { stock: parseInt(stock, 10) }
      });
    } else if (action === 'TOGGLE_ACTIVE') {
      updatedItem = await prisma.item.update({
        where: { id_item },
        data: { is_active }
      });
    } else if (action === 'EDIT_ITEM') {
      const { item_name, description, point_cost } = body;
      updatedItem = await prisma.item.update({
        where: { id_item },
        data: {
          item_name,
          description,
          point_cost: Math.round(parseFloat(point_cost)),
          stock: parseInt(stock, 10)
        }
      });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
