import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, name, no_telp, role, address, location_name, token } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json({ message: 'Harap lengkapi form wajib.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) return NextResponse.json({ message: 'Username sudah digunakan.' }, { status: 400 });

    // === LOGIKA TOKEN UNTUK ADMIN & PENGEPUL ===
    if (['admin', 'pengepul'].includes(role)) {
      if (!token) return NextResponse.json({ message: 'Token registrasi wajib diisi!' }, { status: 400 });
      
      const validLink = await prisma.registrationLink.findUnique({ where: { token } });
      if (!validLink) return NextResponse.json({ message: 'Token tidak ditemukan.' }, { status: 404 });
      if (validLink.is_used) return NextResponse.json({ message: 'Token sudah pernah digunakan.' }, { status: 403 });
      if (new Date() > validLink.expires_at) return NextResponse.json({ message: 'Token sudah kedaluwarsa.' }, { status: 403 });
      if (validLink.role !== role) return NextResponse.json({ message: `Token ini bukan untuk role ${role}.` }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Nasabah, Admin, Pengepul langsung aktif. Mitra false.
    const isActive = role === 'mitra' ? false : true; 

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Buat User
      const newUser = await tx.user.create({
        data: { username, password: hashedPassword, name, no_telp: no_telp || null, role, is_active: isActive }
      });

      // 2. Hanguskan Token jika ada
      if (['admin', 'pengepul'].includes(role) && token) {
        await tx.registrationLink.update({
          where: { token }, data: { is_used: true }
        });
      }

      // 3. Setup Relasi (Nasabah & Mitra)
      if (role === 'nasabah') await tx.point.create({ data: { id_nasabah: newUser.id_user, balance: 0 } });
      if (role === 'mitra') {
        await tx.device.create({
          data: {
            id_mitra: newUser.id_user,
            location_name: location_name || `Lokasi ${name}`,
            address: address || '',
            device_code: `PENDING-${newUser.id_user.substring(0, 8)}`,
            status: 'offline', process: 'disconnect'
          }
        });
      }
      return newUser;
    });

    return NextResponse.json({ message: 'Registrasi Berhasil', user: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: `Error: ${error.message}` }, { status: 500 });
  }
}