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
      where: { is_active: true },
      orderBy: { min_quality: 'asc' }
    });

    if (rules.length < 2) {
      return NextResponse.json({ message: 'Aturan poin belum diatur oleh Admin di Dashboard.' }, { status: 500 });
    }

    const gradeB = rules[0]; // Standar (min_quality 0)
    const gradeA = rules[1]; // Premium (min_quality sebesar threshold Admin)

    // 3. Logika Penentuan Harga & Perhitungan Poin
    const isPremium = skor_kualitas >= gradeA.min_quality;
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
      await tx.deposit_oil.create({
        data: {
          id_nasabah: id_nasabah,
          id_device: id_device,
          volume: volume_disetor,
          quality: skor_kualitas, // Simpan skor asli misal 82%
          point_earned: totalPoints,
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
      await tx.jerigen.update({
        where: { id_jerigen: targetJerigen.id_jerigen },
        data: { current_volume: targetJerigen.current_volume + volume_disetor }
      });

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