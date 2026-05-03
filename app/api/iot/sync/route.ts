import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // Sesuaikan jalur foldernya

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Payload yang dikirim oleh Aplikasi HP Nasabah atau Node-RED saat transaksi SELESAI
    const { id_device, id_nasabah, volume_disetor, skor_kualitas } = body;

    // 1. Validasi Input
    if (!id_device || !id_nasabah || volume_disetor === undefined || skor_kualitas === undefined) {
      return NextResponse.json({ message: 'Data tidak lengkap. Pastikan ID, Volume, dan Kualitas terisi.' }, { status: 400 });
    }

    if (volume_disetor <= 0) {
      return NextResponse.json({ message: 'Volume yang disetor harus lebih dari 0.' }, { status: 400 });
    }

    // 2. Ambil Konfigurasi Harga Poin (Grade A dan Grade B)
    const rules = await prisma.pointRule.findMany({
      where: { is_active: true }
    });

    if (rules.length < 2) {
      return NextResponse.json({ message: 'Aturan poin belum diatur oleh Admin di Dashboard.' }, { status: 500 });
    }

    const gradeB = rules.find((r: any) => r.quality === 'bad') || rules[0]; // Standar
    const gradeA = rules.find((r: any) => r.quality === 'good') || rules[1]; // Premium

    // 3. Logika Penentuan Harga & Perhitungan Poin
    const isPremium = skor_kualitas >= 80; // Hardcoded threshold
    const targetRule = isPremium ? gradeA : gradeB;
    const totalPoints = volume_disetor * targetRule.point_per_liter;

    // 4. Cari Device & Jerigen untuk menampung minyak
    const device = await prisma.device.findUnique({
      where: { id_device },
      include: { jerigens: true }
    });

    if (!device) return NextResponse.json({ message: 'Mesin (Device) tidak ditemukan.' }, { status: 404 });

    // Arahkan aliran minyak ke jerigen yang tepat berdasarkan kualitas
    const targetJerigen = device.jerigens.find((j: any) => 
      isPremium ? j.jerigen_code.includes('GOOD') : j.jerigen_code.includes('BAD')
    );

    if (!targetJerigen) {
      return NextResponse.json({ message: 'Tangki penampungan tidak ditemukan di mesin ini.' }, { status: 500 });
    }

    // 5. EKSEKUSI TRANSAKSI (Semua proses database berjalan serentak)
    await prisma.$transaction(async (tx: any) => {

      // A. Cetak Struk Transaksi (Simpan ke deposit_oil)
      await tx.oilDeposit.create({
        data: {
          id_nasabah: id_nasabah,
          id_device: id_device,
          volume: parseFloat(volume_disetor),
          quality_score: parseFloat(skor_kualitas),
          point_earned: totalPoints,
        }
      });

      // Notify Nasabah Transaction Success
      await tx.notification.create({
        data: {
          id_user: id_nasabah,
          title: 'Setoran Berhasil',
          message: `Setoran minyak Anda sebanyak ${parseFloat(volume_disetor)} Liter berhasil disimpan. Poin bertambah ${totalPoints}.`,
          type: 'success',
          link: '/dashboard/nasabah'
        }
      });

      // B. Tambahkan Poin ke Dompet Nasabah
      // Asumsi tabel point menggunakan id_nasabah sebagai relasi
      const dompet = await tx.point.findFirst({ where: { id_nasabah } });
      if (dompet) {
        await tx.point.update({
          where: { id_point: dompet.id_point }, // Sesuaikan dengan Primary Key tabel point Anda
          data: { balance: dompet.balance + totalPoints }
        });
      }

      // C. Tambah Volume ke Jerigen Fisik (Tangki GOOD atau BAD)
      const newVolume = targetJerigen.current_volume + parseFloat(volume_disetor);
      const isFull = newVolume >= targetJerigen.max_capacity;
      
      await tx.jerigen.update({
        where: { id_jerigen: targetJerigen.id_jerigen },
        data: { 
          current_volume: newVolume,
          status: isFull ? 'full' : 'available'
        }
      });

      if (isFull && targetJerigen.status !== 'full') {
        await tx.notification.create({ data: { id_user: device.id_mitra, title: 'Jerigen Penuh', message: `Jerigen ${targetJerigen.jerigen_code} telah penuh.`, type: 'warning' } });
        const pengepuls = await tx.user.findMany({ where: { role: 'pengepul' } });
        if (pengepuls.length > 0) {
          await tx.notification.createMany({ data: pengepuls.map((p: any) => ({ id_user: p.id_user, title: 'Info Pickup', message: `Jerigen ${targetJerigen.jerigen_code} di lokasi ${device.location_name} siap dijemput.`, type: 'info' })) });
        }
      }

      // D. Kembalikan status mesin dari 'standby' menjadi 'disconnect' (atau idle)
      await tx.device.update({
        where: { id_device },
        data: { process: 'disconnect' } 
      });

    });

    return NextResponse.json({ 
      message: 'Transaksi Berhasil!', 
      detail: {
        volume: volume_disetor,
        kualitas: isPremium ? 'Premium (Grade A)' : 'Standar (Grade B)',
        poin_didapat: totalPoints
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error Sync IoT:', error);
    return NextResponse.json({ message: `Gagal memproses setoran: ${error.message}` }, { status: 500 });
  }
}