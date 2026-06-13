import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { sendWaNotification } from '../../../lib/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id_device,
      volume_disetor,
      skor_kualitas,
      volume_jerigen_a,
      volume_jerigen_b
    } = body;

    // 1. Validate Input
    if (!id_device || volume_disetor === undefined || skor_kualitas === undefined) {
      return NextResponse.json({ message: 'Missing required payload fields' }, { status: 400 });
    }

    // 2. Fetch Device Data & Checking Lock
    const device = await prisma.device.findUnique({
      where: { id_device },
      include: { jerigens: { orderBy: { created_at: 'asc' } } }
    });

    if (!device) {
      return NextResponse.json({ message: 'Device not found' }, { status: 404 });
    }

    if (!device.id_nasabah || device.process === 'disconnect') {
      return NextResponse.json({ message: 'Mesin ini tidak sedang digunakan oleh siapapun' }, { status: 400 });
    }

    // Fetch users for WhatsApp notifications
    const [nasabah, mitra, pengepuls] = await Promise.all([
      prisma.user.findUnique({ where: { id_user: device.id_nasabah! }, select: { name: true, no_telp: true } }),
      prisma.user.findUnique({ where: { id_user: device.id_mitra }, select: { name: true, no_telp: true } }),
      prisma.user.findMany({ where: { role: 'pengepul', no_telp: { not: null } }, select: { name: true, no_telp: true } })
    ]);

    // 3. Determine Point per Liter based on Skor Kualitas
    const pointRules = await prisma.pointRule.findMany({
      where: { is_active: true }
    });
    
    let pointPerLiter = 0;
    const isGoodQuality = skor_kualitas >= 80;
    
    for (const rule of pointRules) {
      if ((isGoodQuality && rule.quality === 'good') || (!isGoodQuality && rule.quality === 'bad')) {
        pointPerLiter = rule.point_per_liter;
        break;
      }
    }

    // Fallback if no matching rule
    if (pointPerLiter === 0 && pointRules.length > 0) {
       pointPerLiter = pointRules[0].point_per_liter;
    }

    const volumeInt = Math.round(parseFloat(volume_disetor));
    const qualityInt = Math.round(parseFloat(skor_kualitas));
    const jerigenAInt = volume_jerigen_a !== undefined ? Math.round(parseFloat(volume_jerigen_a)) : 0;
    const jerigenBInt = volume_jerigen_b !== undefined ? Math.round(parseFloat(volume_jerigen_b)) : 0;
    const pointEarned = Math.round(volumeInt * pointPerLiter);

    let isJAJustFull = false;
    let isJBJustFull = false;
    let jaCode = '';
    let jbCode = '';

    // 4. Prisma Transaction
    await prisma.$transaction(async (tx) => {
      // a. Insert SensorRead
      const sensorRead = await tx.sensorRead.create({
        data: {
          volume: volumeInt,
          quality: qualityInt,
          jerigen_a: jerigenAInt,
          jerigen_b: jerigenBInt,
        }
      });

      // b. Insert OilDeposit
      await tx.oilDeposit.create({
        data: {
          id_device: device.id_device,
          id_nasabah: device.id_nasabah!, // Safe because checked above
          id_read: sensorRead.id_read,
          volume: volumeInt,
          quality_score: qualityInt,
          point_earned: pointEarned
        }
      });

      // Notify Nasabah Transaction Success
      await tx.notification.create({
        data: {
          id_user: device.id_nasabah!,
          title: 'Setoran Berhasil',
          message: `Setoran minyak Anda sebanyak ${volumeInt} Liter berhasil disimpan. Poin bertambah ${pointEarned}.`,
          type: 'success',
          link: '/dashboard/nasabah'
        }
      });

      // c. Update Nasabah Points
      await tx.point.upsert({
        where: { id_nasabah: device.id_nasabah! },
        update: { balance: { increment: pointEarned } },
        create: { id_nasabah: device.id_nasabah!, balance: pointEarned }
      });

      // d. Update Jerigen Volume (Assume A is index 0, B is index 1)
      if (device.jerigens.length > 0 && volume_jerigen_a !== undefined) {
        const jA = device.jerigens[0];
        const isFullA = jerigenAInt >= jA.max_capacity;
        await tx.jerigen.update({
          where: { id_jerigen: jA.id_jerigen },
          data: { 
            current_volume: jerigenAInt,
            status: isFullA ? 'full' : 'available' 
          }
        });
        
        if (isFullA && jA.status !== 'full') {
          isJAJustFull = true;
          jaCode = jA.jerigen_code;
          await tx.notification.create({ data: { id_user: device.id_mitra, title: 'Jerigen Penuh', message: `Jerigen ${jA.jerigen_code} telah penuh.`, type: 'warning' } });
          const pengepuls = await tx.user.findMany({ where: { role: 'pengepul' } });
          if (pengepuls.length > 0) {
            await tx.notification.createMany({ data: pengepuls.map((p) => ({ id_user: p.id_user, title: 'Info Pickup', message: `Jerigen ${jA.jerigen_code} di lokasi ${device.location_name} siap dijemput.`, type: 'info' })) });
          }
        }
      }
      if (device.jerigens.length > 1 && volume_jerigen_b !== undefined) {
        const jB = device.jerigens[1];
        const isFullB = jerigenBInt >= jB.max_capacity;
        await tx.jerigen.update({
          where: { id_jerigen: jB.id_jerigen },
          data: { 
            current_volume: jerigenBInt,
            status: isFullB ? 'full' : 'available' 
          }
        });
        
        if (isFullB && jB.status !== 'full') {
          isJBJustFull = true;
          jbCode = jB.jerigen_code;
          await tx.notification.create({ data: { id_user: device.id_mitra, title: 'Jerigen Penuh', message: `Jerigen ${jB.jerigen_code} telah penuh.`, type: 'warning' } });
          const pengepuls = await tx.user.findMany({ where: { role: 'pengepul' } });
          if (pengepuls.length > 0) {
            await tx.notification.createMany({ data: pengepuls.map((p) => ({ id_user: p.id_user, title: 'Info Pickup', message: `Jerigen ${jB.jerigen_code} di lokasi ${device.location_name} siap dijemput.`, type: 'info' })) });
          }
        }
      }

      // e. Reset Device Lock
      await tx.device.update({
        where: { id_device: device.id_device },
        data: {
          process: 'disconnect',
          id_nasabah: null
        }
      });
    });

    // Trigger non-blocking WA notifications
    (async () => {
      try {
        // 1. Notify Nasabah
        if (nasabah?.no_telp) {
          await sendWaNotification(
            nasabah.no_telp,
            `🎉 *Setoran Berhasil - JelantaHUB*\n\nHalo *${nasabah.name}*,\nSetoran minyak Anda sebanyak *${volumeInt} Liter* telah berhasil diterima di *${device.location_name}*.\n\nAnda mendapatkan tambahan *+${pointEarned} Poin*.\n\nTerima kasih telah berkontribusi menyalurkan minyak jelantah!`
          );
        }

        // 2. Notify Mitra and Pengepul if Jerigen A is full
        if (isJAJustFull) {
          const typeLabel = jaCode.includes('GOOD') ? '🟢 Bagus' : '🔴 Standar';
          if (mitra?.no_telp) {
            await sendWaNotification(
              mitra.no_telp,
              `⚠️ *Pemberitahuan Tangki Penuh - JelantaHUB*\n\nHalo Mitra *${mitra.name}*,\nTangki *${jaCode}* (${typeLabel}) di lokasi Anda (*${device.location_name}*) telah penuh.\n\nTim Pengepul telah diberi tahu untuk segera menjadwalkan pengambilan minyak.`
            );
          }
          for (const p of pengepuls) {
            if (p.no_telp) {
              await sendWaNotification(
                p.no_telp,
                `🚚 *Info Penjemputan - JelantaHUB*\n\nHalo Pengepul *${p.name}*,\nTangki *${jaCode}* (${typeLabel}) di lokasi *${device.location_name}* sudah penuh dan siap dijemput.\n\nAlamat: ${device.address || '-'}\n\nHarap segera lakukan penjemputan.`
              );
            }
          }
        }

        // 3. Notify Mitra and Pengepul if Jerigen B is full
        if (isJBJustFull) {
          const typeLabel = jbCode.includes('GOOD') ? '🟢 Bagus' : '🔴 Standar';
          if (mitra?.no_telp) {
            await sendWaNotification(
              mitra.no_telp,
              `⚠️ *Pemberitahuan Tangki Penuh - JelantaHUB*\n\nHalo Mitra *${mitra.name}*,\nTangki *${jbCode}* (${typeLabel}) di lokasi Anda (*${device.location_name}*) telah penuh.\n\nTim Pengepul telah diberi tahu untuk segera menjadwalkan pengambilan minyak.`
            );
          }
          for (const p of pengepuls) {
            if (p.no_telp) {
              await sendWaNotification(
                p.no_telp,
                `🚚 *Info Penjemputan - JelantaHUB*\n\nHalo Pengepul *${p.name}*,\nTangki *${jbCode}* (${typeLabel}) di lokasi *${device.location_name}* sudah penuh dan siap dijemput.\n\nAlamat: ${device.address || '-'}\n\nHarap segera lakukan penjemputan.`
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to dispatch WA notifications:', err);
      }
    })();

    return NextResponse.json({ 
      success: true, 
      message: 'Transaksi berhasil disimpan',
      data: { pointEarned, volume: volume_disetor }
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/iot/simpan-transaksi:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
