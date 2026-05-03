# Panduan Integrasi Notifikasi Telegram JelantaHUB

Dokumen ini menjelaskan bagaimana sistem notifikasi JelantaHUB terhubung dengan Telegram untuk mengirimkan pesan peringatan secara *real-time* kepada *user* (Nasabah, Mitra, Pengepul, Admin) berdasarkan nomor telepon mereka.

## 1. Persiapan Bot Telegram
Sebelum sistem dapat mengirim pesan, Anda harus memastikan bahwa Bot Telegram sudah dikonfigurasi dengan benar di dalam file `.env`:

```env
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklmNOPqrsTUVwxyz"
TELEGRAM_CHAT_ID="-1001234567890" # (Opsional jika Anda menggunakan ID Grup spesifik)
```
> **Catatan:** Token bisa didapatkan dengan membuat bot melalui [@BotFather](https://t.me/botfather) di aplikasi Telegram Anda.

## 2. Bagaimana Cara Kerjanya?

Sistem dirancang untuk memeriksa nomor telepon (`no_telp`) dari *user* yang bersangkutan setiap kali sebuah notifikasi dipicu (misal: Jerigen Penuh, Transaksi Berhasil).

*   **Pencarian ID Pengguna Telegram:** Bot Telegram tidak bisa mengirim pesan secara langsung menggunakan nomor telepon secara mentah ke API `sendMessage`. Anda membutuhkan **Chat ID** dari pengguna.
*   Oleh karena itu, ketika *user* mendaftar dengan `no_telp`, mereka idealnya harus berinteraksi dulu dengan Bot Anda (misalnya dengan mengetik `/start`) agar sistem Anda bisa merekam `chat_id` Telegram mereka yang terhubung dengan `no_telp` tersebut.

### Langkah-langkah Implementasi Pengiriman Pesan:

1.  **Dapatkan Chat ID:** Anda perlu endpoint webhook atau skrip *polling* yang menerima pembaruan dari Bot Telegram untuk mencocokkan `no_telp` yang dikirim dari kontak Telegram dengan data *user* di database.
2.  **Gunakan API Telegram:** Saat trigger dipanggil di `route.ts` (misalnya *Jerigen Penuh*), gunakan *HTTP Request* ke Telegram API:

```javascript
// Contoh Fungsi Pengiriman Notifikasi Telegram
export async function sendTelegramNotification(chatId, message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML' // Bisa disesuaikan
      })
    });
  } catch (error) {
    console.error("Gagal mengirim Telegram", error);
  }
}
```

## 3. Integrasi pada Logic Aplikasi (Contoh)

Saat ada *event* penting, Anda bisa langsung memanggil fungsi `sendTelegramNotification` setelah notifikasi ke database tersimpan.

**Contoh (Simpan Transaksi Berhasil):**
```typescript
// Di dalam app/api/iot/simpan-transaksi/route.ts
const nasabah = await tx.user.findUnique({ where: { id_user: device.id_nasabah } });

// ... simpan ke database (notification)
await tx.notification.create({ ... });

// Jika nasabah memiliki Telegram Chat ID yang valid (disimpan di database/no_telp)
if (nasabah.telegram_chat_id) { // Asumsi ada field ini
  await sendTelegramNotification(nasabah.telegram_chat_id, `Halo ${nasabah.name}, Setoran minyak Anda berhasil! Anda mendapatkan ${pointEarned} poin.`);
}
```

## 4. Prasyarat User
Agar user bisa menerima notifikasi Telegram:
1. User **WAJIB** memiliki akun Telegram dengan nomor yang sama dengan yang didaftarkan di JelantaHUB.
2. User **WAJIB** memulai percakapan dengan Bot Anda terlebih dahulu dengan menekan tombol **START** di dalam chat bot Telegram.

## 5. Ringkasan Trigger yang Sudah Dibuat
Sesuai dengan pembaruan sistem yang terbaru, notifikasi database telah terpicu pada kondisi-kondisi berikut:
- **Setoran Berhasil:** Dikirim kepada Nasabah saat minyak berhasil terhitung.
- **Jerigen Penuh:** Dikirim kepada Mitra (sebagai peringatan) dan Pengepul (sebagai info *pickup*).
- **Mitra Baru Mendaftar:** Dikirim kepada Admin agar segera memberikan *approval*.

Anda dapat mengintegrasikan fungsi pengiriman API Telegram tepat di sebelah fungsi pembuatan Notifikasi database tersebut.
