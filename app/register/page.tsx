import Link from "next/link";
import { User, Store, ArrowLeft } from "lucide-react";

export default function RegisterSelection() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Kembali ke Login
        </Link>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Bergabung dengan JelantaHUB</h1>
          <p className="text-slate-500 mt-2 text-lg">Pilih peran Anda untuk mulai berkontribusi pada lingkungan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opsi Nasabah */}
          <Link href="/register/nasabah" className="group bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-orange-500 shadow-sm hover:shadow-xl transition-all block text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <User className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Saya Nasabah</h2>
            <p className="text-slate-500 text-sm">Saya ingin menyetorkan minyak jelantah dari rumah tangga dan mendapatkan poin.</p>
          </Link>

          {/* Opsi Mitra */}
          <Link href="/register/mitra" className="group bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all block text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Store className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Saya Mitra</h2>
            <p className="text-slate-500 text-sm">Saya ingin menyediakan tempat (warung/resto) untuk menaruh mesin pengepul minyak.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}