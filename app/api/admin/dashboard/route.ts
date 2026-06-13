import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // Sesuaikan jalur titik-titiknya
import bcrypt from 'bcrypt';
import { sendWaNotification } from '../../../lib/whatsapp';

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
    
    if (action === 'GET_RULES') {
      const rules = await prisma.pointRule.findMany({ orderBy: { id_rule: 'asc' } });
      return NextResponse.json(rules);
    }

    if (action === 'GET_DEVICES') {
      const devices = await prisma.device.findMany({
        include: {
          jerigens: { orderBy: { jerigen_code: 'asc' } },
          mitra: { select: { name: true } }
        },
        orderBy: { location_name: 'asc' }
      });
      return NextResponse.json(devices);
    }

    if (action === 'GET_TRANSACTIONS') {
      const pickupLogs = await prisma.pickupLog.findMany({
        include: { device: { select: { location_name: true } }, pengepul: { select: { name: true } } },
        orderBy: { created_at: 'desc' }
      });
      const oilDeposits = await prisma.oilDeposit.findMany({
        include: { nasabah: { select: { name: true } }, device: { select: { location_name: true } } },
        orderBy: { created_at: 'desc' }
      });
      const pointExchanges = await prisma.pointExchange.findMany({
        include: { nasabah: { select: { name: true } }, item: { select: { item_name: true } } },
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json({ pickupLogs, oilDeposits, pointExchanges });
    }

    return NextResponse.json({ message: 'Action invalid' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. CREATE USER
    if (action === 'CREATE_USER') {
      const { name, username, no_telp, password, role } = body;
      
      if (!name || !username || !password || !role) {
        return NextResponse.json({ message: 'Harap lengkapi semua form wajib.' }, { status: 400 });
      }

      if (!['admin', 'pengepul'].includes(role)) {
        return NextResponse.json({ message: 'Role tidak valid untuk ditambahkan.' }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return NextResponse.json({ message: 'Username sudah digunakan.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          name,
          username,
          no_telp: no_telp || null,
          password: hashedPassword,
          role,
          is_active: true
        }
      });

      return NextResponse.json({ message: 'User berhasil dibuat.', user: newUser }, { status: 201 });
    }

    // 2. ACCEPT MITRA
    if (action === 'ACCEPT_MITRA') {
      const { id_user, device_code } = body;
      
      const result = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({ where: { id_user }, data: { is_active: true } });
        await tx.device.updateMany({
          where: { id_mitra: id_user },
          data: { device_code: device_code }
        });
        await tx.notification.create({
          data: {
            id_user: id_user,
            title: 'Kemitraan Disetujui',
            message: `Selamat! Pengajuan kemitraan Anda telah disetujui dengan Kode Device: ${device_code}.`,
            type: 'success',
            link: '/dashboard/mitra'
          }
        });
        return updatedUser;
      });

      // Send WhatsApp Notification to Mitra on approval
      if (result.no_telp) {
        try {
          await sendWaNotification(
            result.no_telp,
            `✅ *Kemitraan Disetujui - JelantaHUB*\n\nHalo Mitra *${result.name}*,\nSelamat! Pengajuan kemitraan Anda telah disetujui oleh Admin.\n\nAkun Anda telah diaktifkan dengan Kode Device *${device_code}*.\n\nSekarang Anda dapat login ke dashboard JelantaHUB dan mulai memantau mesin Anda.`
          );
        } catch (err) {
          console.error('Failed to send Mitra approval WA notification:', err);
        }
      }

      return NextResponse.json({ message: 'Mitra disetujui & Device Code tersimpan.' });
    }

    // 3. SAVE POINT CONFIG (STRATEGI: HAPUS SEMUA & BUAT 2 BARU)
    if (action === 'SAVE_POINT_CONFIG') {
      const { pointA, pointB } = body;
      
      await prisma.$transaction(async (tx) => {
        // A. Bersihkan tabel (Hapus semua data aturan yang ada)
        await tx.pointRule.deleteMany({});

        // B. Buat Aturan Grade Bad
        await tx.pointRule.create({
          data: {
            quality: 'bad',
            point_per_liter: Math.round(parseFloat(pointB)),
            is_active: true
          }
        });

        // C. Buat Aturan Grade Good
        await tx.pointRule.create({
          data: {
            quality: 'good',
            point_per_liter: Math.round(parseFloat(pointA)),
            is_active: true
          }
        });
      });

      return NextResponse.json({ message: 'Konfigurasi Poin berhasil disimpan.' });
    }

    // 4. TOGGLE USER STATUS
    if (action === 'TOGGLE_USER_STATUS') {
      const { id_user, is_active } = body;
      
      if (!id_user) {
        return NextResponse.json({ message: 'ID User diperlukan.' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id_user },
        data: { is_active: !!is_active }
      });

      return NextResponse.json({ message: `Status pengguna berhasil diperbarui.`, user: updatedUser });
    }

    return NextResponse.json({ message: 'Action invalid' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID diperlukan' }, { status: 400 });

    if (action === 'DELETE_USER') {
      await prisma.$transaction(async (tx) => {
        await tx.device.deleteMany({ where: { id_mitra: id } });
        await tx.point.deleteMany({ where: { id_nasabah: id } });
        await tx.user.delete({ where: { id_user: id } });
      });
      return NextResponse.json({ message: 'User berhasil dihapus/direject.' });
    }

    return NextResponse.json({ message: 'Action invalid' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}