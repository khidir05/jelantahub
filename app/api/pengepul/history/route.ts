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
        device: true,
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    
    return NextResponse.json(logs, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error GET History:', error);
    return NextResponse.json({ message: `Error: ${message}` }, { status: 500 });
  }
}