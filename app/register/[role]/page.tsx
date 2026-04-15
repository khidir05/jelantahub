"use client";

import { useState, use } from "react"; // PERBAIKAN 1: Import 'use' dari react
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import api from "../../lib/axios";

// PERBAIKAN 2: Ubah tipe params menjadi Promise
export default function RegisterForm({ params }: { params: Promise<{ role: string }> }) {
  const router = useRouter();
  const validRoles = ['nasabah', 'mitra', 'admin', 'pengepul'];
  
  // PERBAIKAN 3: Unwrap Promise params menggunakan use()
  const unwrappedParams = use(params);
  const role = unwrappedParams.role.toLowerCase();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    no_telp: '',
    location_name: '', 
    address: '',       
    token: '',         
  });

  if (!validRoles.includes(role)) {
    return <div className="text-center py-20 text-red-500 font-bold">Halaman pendaftaran tidak valid.</div>;
  }

  const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post('/auth/register', { ...formData, role });
      
      if (role === 'mitra') {
        alert("Pendaftaran berhasil! Akun Anda sedang diverifikasi oleh Admin. Anda belum bisa login hingga diaktifkan.");
      } else {
        alert("Pendaftaran berhasil! Silakan login.");
      }
      
      router.push('/login');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
        <Link href={['admin', 'pengepul'].includes(role) ? "/login" : "/register"} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Kembali
        </Link>

        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Daftar {roleTitle}</h1>
        <p className="text-slate-500 mb-8">Lengkapi data diri Anda di bawah ini.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Kolom Khusus Admin & Pengepul */}
          {['admin', 'pengepul'].includes(role) && (
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-6">
              <label className="block text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Token Registrasi Khusus
              </label>
              <input 
                type="text" 
                value={formData.token}
                onChange={(e) => setFormData({...formData, token: e.target.value})}
                className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                placeholder="Masukkan kode unik dari Admin" 
              />
              <p className="text-xs text-orange-600 mt-2">Dibutuhkan untuk mendaftar sebagai peran internal.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nomor Telepon (Opsional)</label>
              <input type="tel" value={formData.no_telp} onChange={(e) => setFormData({...formData, no_telp: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Username *</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password *</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" required minLength={6} />
          </div>

          {/* Kolom Khusus Mitra */}
          {role === 'mitra' && (
            <div className="border-t border-slate-200 pt-5 mt-5 space-y-5">
              <h3 className="font-bold text-slate-800">Informasi Lokasi Mesin</h3>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Tempat/Warung *</label>
                <input type="text" value={formData.location_name} onChange={(e) => setFormData({...formData, location_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Cth: Warung Makmur" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Lengkap *</label>
                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24" required></textarea>
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-4 mt-6 bg-slate-800 text-white rounded-xl font-bold text-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Buat Akun Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}