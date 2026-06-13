import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import { sendWaNotification } from '../../../lib/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, name, no_telp, role, address, location_name, token } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json({ message: 'Harap lengkapi form wajib.' }, { status: 400 });
    }

    if (typeof username !== 'string' || typeof password !== 'string' || typeof name !== 'string' || typeof role !== 'string') {
      return NextResponse.json({ message: 'Tipe data input tidak valid.' }, { status: 400 });
    }

    if (!['mitra', 'nasabah'].includes(role)) {
      return NextResponse.json({ message: 'Role tidak valid.' }, { status: 400 });
    }

    const cleanUsername = username.substring(0, 20);
    const cleanName = name.substring(0, 40);
    const cleanNoTelp = no_telp && typeof no_telp === 'string' ? no_telp.substring(0, 15) : null;

    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Username sudah digunakan.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isActive = role === 'mitra' ? false : true; 

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { username: cleanUsername, password: hashedPassword, name: cleanName, no_telp: cleanNoTelp, role: role as 'mitra' | 'nasabah', is_active: isActive }
      });

      if (role === 'nasabah') await tx.point.create({ data: { id_nasabah: newUser.id_user, balance: 0 } });
      if (role === 'mitra') {
        const cleanLocName = (location_name || `Lokasi ${cleanName}`).substring(0, 15);
        await tx.device.create({
          data: {
            id_mitra: newUser.id_user,
            location_name: cleanLocName,
            address: address || '',
            device_code: `P-${newUser.id_user.substring(0, 8)}`,
            status: 'offline', process: 'disconnect'
          }
        });
        
        const admins = await tx.user.findMany({ where: { role: 'admin' } });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              id_user: admin.id_user,
              title: 'Mitra Baru Mendaftar',
              message: `Mitra ${name} mendaftar dan menunggu persetujuan.`,
              type: 'info',
              link: '/dashboard/admin'
            }))
          });
        }
      }
      return newUser;
    });

    // Send WA notification to Admin asynchronously after transaction succeeds
    if (role === 'mitra') {
      try {
        const admins = await prisma.user.findMany({
          where: { role: 'admin', no_telp: { not: null } },
          select: { no_telp: true }
        });
        for (const admin of admins) {
          if (admin.no_telp) {
            await sendWaNotification(
              admin.no_telp,
              `📢 *Pemberitahuan JelantaHUB*\n\nMitra Baru Mendaftar:\nNama: *${name}*\nUsername: *${username}*\nNomor Telp: *${no_telp || '-'}*\n\nHarap masuk ke dashboard admin untuk memberikan persetujuan (Accept).`
            );
          }
        }
      } catch (err) {
        console.error('Failed to send admin registration WA alert:', err);
      }
    }

    return NextResponse.json({ message: 'Registrasi Berhasil', user: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: `Error: ${message}` }, { status: 500 });
  }
}