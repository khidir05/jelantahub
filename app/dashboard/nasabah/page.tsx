"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Wallet, History, Server, Loader2, CheckCircle2, XCircle, MapPin, Zap, ArrowRight, RefreshCcw } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string, userId: string) => api.get(url, { headers: { 'x-user-id': userId } }).then(res => res.data);

// Helper untuk format angka poin
const formatPoin = (angka: number) => {
  return new Intl.NumberFormat('id-ID').format(angka);
};

export default function NasabahDashboard() {
  const [userId, setUserId] = useState('');
  const [tabungan, setTabungan] = useState({ saldo_poin: 0, riwayat: [] as any[] });
  
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [activeDevice, setActiveDevice] = useState<any | null>(null);
  const [uiState, setUiState] = useState('IDLE');
  const [isRefreshing, setIsRefreshing] = useState(false); // Untuk animasi tombol refresh

  useEffect(() => {
    const storedUser = localStorage.getItem('user_id');
    if (storedUser) setUserId(storedUser);
  }, []);

  const { data: tabunganData, mutate: mutateTabungan } = useSWR(
    userId ? ['/nasabah/tabungan', userId] : null,
    ([url, id]) => fetcher(url, id),
    { refreshInterval: 5000 }
  );

  const { data: devicesData, mutate: mutateDevices } = useSWR(
    userId ? [`/nasabah/device?id_nasabah=${userId}`, userId] : null,
    ([url, id]) => fetcher(url, id),
    { refreshInterval: 3000 }
  );

  useEffect(() => {
    if (tabunganData) {
      setTabungan(tabunganData);
    }
  }, [tabunganData]);

  useEffect(() => {
    if (devicesData) {
      if (devicesData.activeDevice) {
        setActiveDevice(devicesData.activeDevice);
        
        // State Machine Update
        if (devicesData.activeDevice.process === 'standby') {
          if (uiState === 'LOADING') {
             // Berubah dari loading menjadi standby berarti sukses (sensor mendeteksi proses selesai)
             setUiState('SUCCESS');
             mutateTabungan(); // Segera tarik tabungan terbaru
          } else if (uiState !== 'SUCCESS') {
             setUiState('STANDBY');
          }
        } else if (devicesData.activeDevice.process === 'load') {
          setUiState('LOADING');
        }
      } else {
        setActiveDevice(null);
        setAvailableDevices(devicesData.availableDevices);
        if (uiState !== 'IDLE') setUiState('IDLE');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesData]); // Sengaja uiState tidak di-listen agar tidak infinite loop

  const handleDeviceAction = async (action: string, deviceId: string) => {
    try {
      await api.post('/nasabah/device', { action, id_device: deviceId, id_nasabah: userId });
      if (action === 'FINISH') {
        setUiState('IDLE');
        mutateDevices();
      } else if (action === 'SELECT' || action === 'CANCEL') {
        setUiState('STANDBY');
        mutateDevices();
      } else if (action === 'SETOR') {
        setUiState('LOADING');
      }
    } catch (error) {
      alert("Gagal memproses permintaan.");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dasbor Nasabah</h1>
        <p className="text-slate-500 mt-1">Pantau poin dan kelola setoran minyak Anda di sini.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================= */}
        {/* KOLOM KIRI (Span 5): SALDO & MESIN        */}
        {/* ========================================= */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* CARD SALDO (Desain Mewah) */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-slate-700 rounded-full opacity-50 blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-slate-700/50 p-3 rounded-xl"><Wallet className="text-orange-400 w-6 h-6" /></div>
                <p className="text-slate-300 font-semibold tracking-wide">Total Poin Aktif</p>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-5xl font-extrabold text-white">{formatPoin(tabungan.saldo_poin)}</h2>
                <span className="text-xl font-bold text-orange-400">PTS</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">Bisa ditukar dengan berbagai hadiah menarik.</p>
            </div>
          </div>

          {/* AREA INTERAKSI MESIN */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-xl">
                  <Server className="text-orange-600 w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Koneksi Mesin</h3>
              </div>
              {uiState === 'IDLE' && (
                <button onClick={() => mutateDevices()} className="text-slate-400 hover:text-orange-500 transition-colors p-2" title="Refresh Mesin">
                  <RefreshCcw className={`w-5 h-5`} />
                </button>
              )}
            </div>

            {/* STATE 1: IDLE (Pilih Mesin) */}
            {uiState === 'IDLE' && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-500 mb-2">Pilih lokasi mesin terdekat:</p>
                {availableDevices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Server className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-600">Tidak ada mesin online</p>
                    <p className="text-xs text-slate-400 mt-1">Tunggu beberapa saat atau refresh halaman.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {availableDevices.map(dev => (
                      <button 
                        key={dev.id_device} 
                        onClick={() => handleDeviceAction('SELECT', dev.id_device)}
                        className="group flex items-center justify-between p-4 bg-white border-2 border-slate-100 hover:border-orange-500 rounded-2xl transition-all hover:shadow-md text-left w-full active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-slate-50 group-hover:bg-orange-50 p-3 rounded-full transition-colors">
                            <MapPin className="text-slate-400 group-hover:text-orange-500 w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-700 group-hover:text-orange-600 transition-colors">{dev.location_name}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              <p className="text-xs text-slate-500 font-medium">Online & Kosong</p>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-orange-500 w-5 h-5 transform group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STATE 2: STANDBY (Siap Setor) */}
            {uiState === 'STANDBY' && activeDevice && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
                  <Zap className="w-4 h-4 fill-orange-500" /> Terhubung: {activeDevice.location_name}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Mesin Siap!</h2>
                <p className="text-slate-500 text-sm mb-8 px-4">Klik tombol di bawah untuk membuka katup, lalu tuangkan minyak Anda secara perlahan.</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleDeviceAction('SETOR', activeDevice.id_device)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-extrabold text-lg hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Mulai Setor Minyak
                  </button>
                  <button 
                    onClick={() => handleDeviceAction('FINISH', activeDevice.id_device)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]"
                  >
                    Keluar / Batalkan
                  </button>
                </div>
              </div>
            )}

            {/* STATE 3: LOADING (Sedang Setor) */}
            {uiState === 'LOADING' && activeDevice && (
              <div className="text-center py-6">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-50"></div>
                  <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Sedang Memproses</h2>
                <p className="text-slate-500 text-sm mb-8 px-2">Sistem sedang menimbang volume dan menganalisis kualitas minyak Anda. Mohon tunggu.</p>
                
                <button 
                  onClick={() => handleDeviceAction('CANCEL', activeDevice.id_device)}
                  className="bg-red-50 text-red-600 border border-red-100 py-3 px-6 rounded-xl font-bold hover:bg-red-100 flex items-center gap-2 mx-auto transition-colors active:scale-95"
                >
                  <XCircle className="w-5 h-5" /> Batalkan Proses
                </button>
              </div>
            )}

            {/* STATE 4: SUCCESS (IoT Selesai) */}
            {uiState === 'SUCCESS' && activeDevice && (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Setoran Berhasil!</h2>
                <p className="text-slate-500 text-sm mb-8">Data minyak Anda telah tersimpan dan poin berhasil ditambahkan ke saldo.</p>
                
                <button 
                  onClick={() => handleDeviceAction('FINISH', activeDevice.id_device)}
                  className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-900 shadow-xl shadow-slate-800/20 transition-all active:scale-[0.98]"
                >
                  Selesai Transaksi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================= */}
        {/* KOLOM KANAN (Span 7): HISTORI             */}
        {/* ========================================= */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 h-full">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-slate-100 p-2.5 rounded-xl">
                <History className="text-slate-600 w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Riwayat Setoran Terbaru</h3>
            </div>
            
            {tabungan.riwayat.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <History className="w-10 h-10 text-slate-300" />
                </div>
                <h4 className="font-bold text-slate-700">Belum Ada Transaksi</h4>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">Riwayat setoran minyak jelantah Anda akan muncul di sini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tabungan.riwayat.map((trx, idx) => (
                  <div key={idx} className="group flex flex-col sm:flex-row justify-between sm:items-center p-5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="bg-green-100/50 p-3 rounded-full group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg">{trx.volume} Liter</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                            Skor: {trx.quality_score}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(trx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right bg-orange-50/50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                      <p className="text-xs font-semibold text-slate-500 mb-0.5">Poin Didapat</p>
                      <p className="font-extrabold text-orange-500 text-xl">+{formatPoin(trx.point_earned)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}