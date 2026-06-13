import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idMitra = searchParams.get('id_mitra');

  try {
    const whereClause = {
      is_active: true,
      ...(idMitra ? { id_mitra: idMitra } : {}),
    };

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        mitra: {
          select: { name: true, username: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/nasabah/items:', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
