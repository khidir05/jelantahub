import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import axios from 'axios';

const sendTelegramAlert = async (location: string, current: number, max: number) => {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  if (!BOT_TOKEN || !CHAT_ID) return;

  const percentage = ((current / max) * 100).toFixed(1);
  const message = `🚨 *Peringatan Kapasitas JelantaHUB*\n\nLokasi: *${location}*\nStatus: *${percentage}% Penuh*\nVolume: ${current}L / ${max}L\n\nMohon segera jadwalkan pengangkutan!`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Gagal kirim Telegram:', error);
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id_mitra = searchParams.get('id_mitra');

  if (!id_mitra) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const device = await prisma.device.findFirst({
      where: { id_mitra },
      include: {
        jerigens: true, 
      }
    });

    if (!device) return NextResponse.json({ message: 'Device tidak ditemukan' }, { status: 404 });

    return NextResponse.json(device, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error Backend Mitra GET:', error);
    return NextResponse.json({ message: `Error Server: ${message}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id_device, device_code, location_name, address, jerigen_updates } = body;

    const updatedDevice = await prisma.device.update({
      where: { id_device },
      data: { device_code, location_name, address },
      include: { jerigens: true }
    });

    if (Array.isArray(jerigen_updates)) {
      for (const item of jerigen_updates) {
        const capacityInt = Math.round(parseFloat(item.max_capacity));
        await prisma.jerigen.update({
          where: { id_jerigen: item.id_jerigen },
          data: { max_capacity: capacityInt }
        });
      }
    }

    // Refresh jerigens information after update for alerts
    const deviceWithJerigens = await prisma.device.findUnique({
      where: { id_device },
      include: { jerigens: true }
    });

    if (deviceWithJerigens && deviceWithJerigens.jerigens) {
      for (const jerigen of deviceWithJerigens.jerigens) {
        if (jerigen.current_volume >= (0.8 * jerigen.max_capacity)) {
          await sendTelegramAlert(location_name, jerigen.current_volume, jerigen.max_capacity);
        }
      }
    }

    return NextResponse.json({ message: 'Berhasil update data' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error Backend Mitra PUT:', error);
    return NextResponse.json({ message: `Error Server: ${message}` }, { status: 500 });
  }
}