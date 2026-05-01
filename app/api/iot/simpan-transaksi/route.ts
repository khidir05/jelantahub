import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id_device,
      volume_disetor,
      skor_kualitas,
      volume_jerigen_a,
      volume_jerigen_b,
      sensor_status,
      timestamp
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

    // 3. Determine Point per Liter based on Skor Kualitas
    const pointRules = await prisma.pointRule.findMany({
      where: { is_active: true }
    });
    
    let pointPerLiter = 0;
    for (const rule of pointRules) {
      if (skor_kualitas >= rule.min_quality && skor_kualitas <= rule.max_quality) {
        pointPerLiter = rule.point_per_liter;
        break;
      }
    }

    // Fallback if no matching rule
    if (pointPerLiter === 0 && pointRules.length > 0) {
       // if not match anything but there are rules, maybe just use lowest/highest or 0
       // We keep it 0 or use the first rule as fallback
       pointPerLiter = pointRules[0].point_per_liter;
    }

    const pointEarned = volume_disetor * pointPerLiter;

    // 4. Prisma Transaction
    await prisma.$transaction(async (tx) => {
      // a. Insert SensorRead
      const sensorRead = await tx.sensorRead.create({
        data: {
          volume: parseFloat(volume_disetor),
          quality: parseFloat(skor_kualitas),
          jerigen_a: parseFloat(volume_jerigen_a || 0),
          jerigen_b: parseFloat(volume_jerigen_b || 0),
        }
      });

      // b. Insert OilDeposit
      await tx.oilDeposit.create({
        data: {
          id_device: device.id_device,
          id_nasabah: device.id_nasabah!, // Safe because checked above
          id_read: sensorRead.id_read,
          volume: parseFloat(volume_disetor),
          quality_score: parseFloat(skor_kualitas),
          point_earned: pointEarned
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
        await tx.jerigen.update({
          where: { id_jerigen: device.jerigens[0].id_jerigen },
          data: { 
            current_volume: parseFloat(volume_jerigen_a),
            status: parseFloat(volume_jerigen_a) >= device.jerigens[0].max_capacity ? 'full' : 'available' 
          }
        });
      }
      if (device.jerigens.length > 1 && volume_jerigen_b !== undefined) {
        await tx.jerigen.update({
          where: { id_jerigen: device.jerigens[1].id_jerigen },
          data: { 
            current_volume: parseFloat(volume_jerigen_b),
            status: parseFloat(volume_jerigen_b) >= device.jerigens[1].max_capacity ? 'full' : 'available' 
          }
        });
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

    return NextResponse.json({ 
      success: true, 
      message: 'Transaksi berhasil disimpan',
      data: { pointEarned, volume: volume_disetor }
    });

  } catch (error: any) {
    console.error('Error in POST /api/iot/simpan-transaksi:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
