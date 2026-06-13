import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_jelantahub_super_aman_123';

type TokenUser = { id: string };

async function getUserFromToken(): Promise<TokenUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && decoded && 'id' in decoded) {
      const maybeId = (decoded as { id?: unknown }).id;
      if (typeof maybeId === 'string') return { id: maybeId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { id_user: user.id },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    const serializedNotifications = notifications.map(n => ({
      ...n,
      id_notification: n.id_notification.toString()
    }));

    return NextResponse.json(serializedNotifications);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, id_notification } = body;

    if (action === 'MARK_READ' && id_notification) {
      await prisma.notification.update({
        where: { id_notification: BigInt(id_notification), id_user: user.id },
        data: { is_read: true, read_at: new Date() }
      });
      return NextResponse.json({ message: 'Marked as read' });
    }

    if (action === 'MARK_ALL_READ') {
      await prisma.notification.updateMany({
        where: { id_user: user.id, is_read: false },
        data: { is_read: true, read_at: new Date() }
      });
      return NextResponse.json({ message: 'All marked as read' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
