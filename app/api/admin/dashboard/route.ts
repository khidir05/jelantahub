import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // Sesuaikan jalur titik-titiknya
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'GET_USERS') {
      const users = await prisma.user.findMany({
        include: { devices: true }, 
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(users);
    } 
    
    if (action === 'GET_LINKS') {
      const links = await prisma.registrationLink.findMany({ orderBy: { created_at: 'desc' } });
      return NextResponse.json(links);
    }

    if (action === 'GET_RULES') {
      const rules = await prisma.pointRule.findMany({ orderBy: { id_rule: 'asc' } });
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
      
      await prisma.$transaction(async (tx: any) => {
        await tx.user.update({ where: { id_user }, data: { is_active: true } });
        await tx.device.updateMany({
          where: { id_mitra: id_user },
          data: { device_code: device_code }
        });
      });
      return NextResponse.json({ message: 'Mitra disetujui & Device Code tersimpan.' });
    }

    // 3. SAVE POINT CONFIG (STRATEGI: HAPUS SEMUA & BUAT 2 BARU)
    if (action === 'SAVE_POINT_CONFIG') {
      const { pointA, pointB } = body;
      
      await prisma.$transaction(async (tx: any) => {
        // A. Bersihkan tabel (Hapus semua data aturan yang ada)
        await tx.pointRule.deleteMany({});

        // B. Buat Aturan Grade Bad
        await tx.pointRule.create({
          data: {
            quality: 'bad',
            point_per_liter: parseFloat(pointB),
            is_active: true
          }
        });

        // C. Buat Aturan Grade Good
        await tx.pointRule.create({
          data: {
            quality: 'good',
            point_per_liter: parseFloat(pointA),
            is_active: true
          }
        });
      });

      return NextResponse.json({ message: 'Konfigurasi Poin berhasil disimpan.' });
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

    if (action === 'DELETE_USER') {
      await prisma.$transaction(async (tx: any) => {
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