import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma'; // Sesuaikan path ini jika lib/ ada di root
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Tipe data response standar
type Data = {
  message?: string;
  access_token?: string;
  user?: {
    id_user: string;
    username: string;
    role: string;
    name: string;
  };
};

// Rahasia untuk men-generate token (Idealnya ini diletakkan di .env sebagai JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_jelantahub_super_aman_123';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. Ambil data dari body request
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username dan Password wajib diisi!' });
    }

    // 2. Cari user di database berdasarkan username
    const user = await prisma.user.findUnique({
      where: {
        username: identifier, // Kita asumsikan identifier adalah username sesuai desain awal
      },
    });

    // 3. Validasi User Exist & Status Aktif
    if (!user) {
      return res.status(401).json({ message: 'Username tidak ditemukan.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Akun Anda dinonaktifkan. Hubungi Admin.' });
    }

    // 4. Verifikasi Password menggunakan bcrypt
    // CATATAN: Untuk saat ini, jika password di DB belum di-hash, 
    // kode ini akan error. Anda harus memastikan password di DB sudah di-hash.
    // Jika Anda memasukkan password secara manual/plaintext ke DB untuk testing,
    // ubah baris ini menjadi: const isPasswordValid = password === user.password; (TIDAK AMAN UNTUK PRODUKSI)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password salah.' });
    }

    // 5. Generate JWT Token
    const payload = {
      id: user.id_user,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Token expired dalam 1 hari

    // 6. Kirim response sukses sesuai dengan format yang diharapkan file Login.tsx
    return res.status(200).json({
      access_token: token,
      user: {
        id_user: user.id_user,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Error saat login:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
}