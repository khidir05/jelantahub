"use client"; // Wajib karena menggunakan state dan hooks

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Hook router untuk App Router
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import api from '../lib/axios'; // Pastikan path alias @ mengarah ke root atau gunakan ../../lib/axios

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Prevent rendering login page if user is already logged in
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token && role) {
      router.replace(`/dashboard/${role}`);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Mengirim request ke API Route yang kita buat sebelumnya
      const res = await api.post('/auth/login', { identifier, password });
      const { access_token, user } = res.data;

      // Menyimpan kredensial ke localStorage sesuai referensi Anda
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('username', user.name);
      localStorage.setItem('user_id', user.id_user);

      // Routing Role-Based 
      // Routing Role-Based menggunakan REPLACE (bukan PUSH)
      switch (user.role) {
        case 'admin':
          router.replace('/dashboard/admin');
          break;
        case 'nasabah':
          router.replace('/dashboard/nasabah');
          break;
        case 'mitra':
          router.replace('/dashboard/mitra');
          break;
        case 'pengepul':
          router.replace('/dashboard/pengepul');
          break;
        default:
          alert('Role tidak terdefinisi');
          router.replace('/login');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Login Gagal. Periksa kembali kredensial Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* --- KIRI: BRANDING (Desktop Only) --- */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="relative z-10">
          <div className="mb-8">
            <Image src="/logo1.png" alt="JelantaHUB Logo" width={250} height={70} priority className="h-16 w-auto" />
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mt-20">
            Ubah Jelantah <br /> Jadi Manfaat.
          </h1>
          <p className="text-orange-100 text-lg mt-6 max-w-md">
            Platform manajemen daur ulang minyak jelantah pintar untuk masa depan lingkungan yang lebih bersih.
          </p>
        </div>
      </div>

      {/* --- KANAN: FORM LOGIN --- */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white md:bg-transparent">
        <div className="w-full max-w-md space-y-8 bg-white p-8 md:p-0 rounded-3xl md:rounded-none shadow-xl md:shadow-none border border-slate-100 md:border-none">

          <div className="md:hidden flex flex-col items-center text-center mb-8">
            <Image src="/logo1.png" alt="JelantaHUB Logo" width={200} height={60} priority className="h-12 w-auto mb-4" />
          </div>

          <div className="text-left">
            <h2 className="text-3xl font-bold text-slate-800">Selamat Datang</h2>
            <p className="text-slate-500 mt-2">Silakan masuk ke akun Anda.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <input
                type="text"
                placeholder="Masukkan username"
                className="w-full p-4 bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-digit p-4 bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full group bg-orange-500 text-white p-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/25 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk Sekarang
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-600 font-medium">
            Belum bergabung dengan JelantaHUB?{' '}
            <Link href="/register" className="text-orange-600 font-extrabold hover:underline">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}