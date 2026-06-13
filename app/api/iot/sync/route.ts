import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { sendWaNotification } from '../../../lib/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { id_device, id_nasabah, volume_disetor, skor_kualitas } = body;

    if (!id_device || !id_nasabah || volume_disetor === undefined || skor_kualitas === undefined) {
      return NextResponse.json({ message: 'Data tidak lengkap. Pastikan ID, Volume, dan Kualitas terisi.' }, { status: 400 });
    }

    if (volume_disetor <= 0) {
      return NextResponse.json({ message: 'Volume yang disetor harus lebih dari 0.' }, { status: 400 });
    }

    const rules = await prisma.pointRule.findMany({
      where: { is_active: true }
    });

    if (rules.length < 2) {
      return NextResponse.json({ message: 'Aturan poin belum diatur oleh Admin di Dashboard.' }, { status: 500 });
    }

    const gradeB = rules.find((r) => r.quality === 'bad') || rules[0];
    const gradeA = rules.find((r) => r.quality === 'good') || rules[1];

    const isPremium = skor_kualitas >= 80;
    const targetRule = isPremium ? gradeA : gradeB;
    const volumeInt = Math.round(parseFloat(volume_disetor));
    const qualityInt = Math.round(parseFloat(skor_kualitas));
    const totalPoints = Math.round(volumeInt * targetRule.point_per_liter);

    const device = await prisma.device.findUnique({
      where: { id_device },
      include: { jerigens: true }
    });

    if (!device) return NextResponse.json({ message: 'Mesin (Device) tidak ditemukan.' }, { status: 404 });

    const targetJerigen = device.jerigens.find((j) =>
      isPremium ? j.jerigen_code.includes('GOOD') : j.jerigen_code.includes('BAD')
    );

    if (!targetJerigen) {
      return NextResponse.json({ message: 'Tangki penampungan tidak ditemukan di mesin ini.' }, { status: 500 });
    }

    // Fetch users for WhatsApp notifications
    const [nasabah, mitra, pengepuls] = await Promise.all([
      prisma.user.findUnique({ where: { id_user: id_nasabah }, select: { name: true, no_telp: true } }),
      prisma.user.findUnique({ where: { id_user: device.id_mitra }, select: { name: true, no_telp: true } }),
      prisma.user.findMany({ where: { role: 'pengepul', no_telp: { not: null } }, select: { name: true, no_telp: true } })
    ]);

    let isJerigenJustFull = false;
    let targetCode = '';

    await prisma.$transaction(async (tx) => {

      await tx.oilDeposit.create({
        data: {
          id_nasabah: id_nasabah,
          id_device: id_device,
          volume: volumeInt,
          quality_score: qualityInt,
          point_earned: totalPoints,
        }
      });

      await tx.notification.create({
        data: {
          id_user: id_nasabah,
          title: 'Setoran Berhasil',
          message: `Setoran minyak Anda sebanyak ${volumeInt} Liter berhasil disimpan. Poin bertambah ${totalPoints}.`,
          type: 'success',
          link: '/dashboard/nasabah'
        }
      });

      const dompet = await tx.point.findFirst({ where: { id_nasabah } });
      if (dompet) {
        await tx.point.update({
          where: { id_nasabah },
          data: { balance: dompet.balance + totalPoints }
        });
      }

      const newVolume = targetJerigen.current_volume + volumeInt;
      const isFull = newVolume >= targetJerigen.max_capacity;
      
      await tx.jerigen.update({
        where: { id_jerigen: targetJerigen.id_jerigen },
        data: { 
          current_volume: newVolume,
          status: isFull ? 'full' : 'available'
        }
      });

      if (isFull && targetJerigen.status !== 'full') {
        isJerigenJustFull = true;
        targetCode = targetJerigen.jerigen_code;
        await tx.notification.create({ data: { id_user: device.id_mitra, title: 'Jerigen Penuh', message: `Jerigen ${targetJerigen.jerigen_code} telah penuh.`, type: 'warning' } });
        const pengepuls = await tx.user.findMany({ where: { role: 'pengepul' } });
        if (pengepuls.length > 0) {
          await tx.notification.createMany({ data: pengepuls.map((p) => ({ id_user: p.id_user, title: 'Info Pickup', message: `Jerigen ${targetJerigen.jerigen_code} di lokasi ${device.location_name} siap dijemput.`, type: 'info' })) });
        }
      }

      await tx.device.update({
        where: { id_device },
        data: { process: 'disconnect' } 
      });

    });

    // Trigger non-blocking WA notifications
    (async () => {
      try {
        // 1. Notify Nasabah
        if (nasabah?.no_telp) {
          await sendWaNotification(
            nasabah.no_telp,
            `🎉 *Setoran Berhasil - JelantaHUB*\n\nHalo *${nasabah.name}*,\nSetoran minyak Anda sebanyak *${volumeInt} Liter* telah berhasil diterima di *${device.location_name}*.\n\nAnda mendapatkan tambahan *+${totalPoints} Poin*.\n\nTerima kasih telah berkontribusi menyalurkan minyak jelantah!`
          );
        }

        // 2. Notify Mitra and Pengepul if Jerigen is full
        if (isJerigenJustFull) {
          const typeLabel = targetCode.includes('GOOD') ? '🟢 Bagus' : '🔴 Standar';
          if (mitra?.no_telp) {
            await sendWaNotification(
              mitra.no_telp,
              `⚠️ *Pemberitahuan Tangki Penuh - JelantaHUB*\n\nHalo Mitra *${mitra.name}*,\nTangki *${targetCode}* (${typeLabel}) di lokasi Anda (*${device.location_name}*) telah penuh.\n\nTim Pengepul telah diberi tahu untuk segera menjadwalkan pengambilan minyak.`
            );
          }
          for (const p of pengepuls) {
            if (p.no_telp) {
              await sendWaNotification(
                p.no_telp,
                `🚚 *Info Penjemputan - JelantaHUB*\n\nHalo Pengepul *${p.name}*,\nTangki *${targetCode}* (${typeLabel}) di lokasi *${device.location_name}* sudah penuh dan siap dijemput.\n\nAlamat: ${device.address || '-'}\n\nHarap segera lakukan penjemputan.`
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to dispatch WA notifications in sync:', err);
      }
    })();

    return NextResponse.json({ 
      message: 'Transaksi Berhasil!', 
      detail: {
        volume: volume_disetor,
        kualitas: isPremium ? 'Premium (Grade A)' : 'Standar (Grade B)',
        poin_didapat: totalPoints
      }
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error Sync IoT:', error);
    return NextResponse.json({ message: `Gagal memproses setoran: ${message}` }, { status: 500 });
  }
}