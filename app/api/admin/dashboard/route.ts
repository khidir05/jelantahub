import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'GET_USERS') {
      const users = await prisma.user.findMany({
        include: { devices: true }, // Untuk melihat data device mitra
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(users);
    } 
    
    if (action === 'GET_LINKS') {
      const links = await prisma.registrationLink.findMany({ orderBy: { created_at: 'desc' } });
      return NextResponse.json(links);
    }

    if (action === 'GET_RULES') {
      const rules = await prisma.pointRule.findMany({ orderBy: { min_quality: 'asc' } });
      return NextResponse.json(rules);
    }

    return NextResponse.json({ message: 'Action invalid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. GENERATE LINK
    if (action === 'GENERATE_LINK') {
      const { role, days_valid } = body;
      const expires = new Date();
      expires.setDate(expires.getDate() + parseInt(days_valid));

      const newLink = await prisma.registrationLink.create({
        data: { token: uuidv4(), role, expires_at: expires }
      });
      return NextResponse.json(newLink);
    }

    // 2. ACCEPT MITRA
    if (action === 'ACCEPT_MITRA') {
      const { id_user, device_code } = body;
      
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id_user }, data: { is_active: true } });
        // Update pending device code ke kode asli
        await tx.device.updateMany({
          where: { id_mitra: id_user },
          data: { device_code: device_code }
        });
      });
      return NextResponse.json({ message: 'Mitra disetujui & Device Code tersimpan.' });
    }

    // 3. CREATE POINT RULE
    if (action === 'CREATE_RULE') {
      const { min_quality, max_quality, point_per_liter, multiplier } = body;
      await prisma.pointRule.create({
        data: {
          min_quality: parseFloat(min_quality),
          max_quality: parseFloat(max_quality),
          point_per_liter: parseFloat(point_per_liter),
          multiplier: parseFloat(multiplier) || 1.0,
        }
      });
      return NextResponse.json({ message: 'Aturan Poin dibuat.' });
    }

    return NextResponse.json({ message: 'Action invalid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID diperlukan' }, { status: 400 });

    // REJECT / DELETE USER
    if (action === 'DELETE_USER') {
      // Prisma akan otomatis menghapus Point/Device jika menggunakan onCascade delete di skema, 
      // Jika tidak, kita hapus manual relasinya dulu (Untuk Mitra)
      await prisma.$transaction(async (tx) => {
        await tx.device.deleteMany({ where: { id_mitra: id } });
        await tx.point.deleteMany({ where: { id_nasabah: id } });
        await tx.user.delete({ where: { id_user: id } });
      });
      return NextResponse.json({ message: 'User berhasil dihapus/direject.' });
    }

    return NextResponse.json({ message: 'Action invalid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}