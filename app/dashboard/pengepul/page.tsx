"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Truck, MapPin, History, AlertTriangle, Droplet, CheckCircle2, X, Clock, Navigation } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function PengepulDashboard() {
  const [userId, setUserId] = useState('');
  const [activeTab, setActiveTab] = useState<'LOKASI' | 'HISTORI'>('LOKASI');
  
  const [devices, setDevices] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk Modal Detail Device
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user_id');
    if (storedUser) setUserId(storedUser);
  }, []);

  const { data: rawDevices, mutate: mutateDevices } = useSWR('/pengepul/dashboard', fetcher, { refreshInterval: 5000 });
  const { data: rawHistory, mutate: mutateHistory } = useSWR(userId ? `/pengepul/history?id_pengepul=${userId}` : null, fetcher, { refreshInterval: 5000 });

  useEffect(() => {
    if (rawDevices) {
      const sortedDevices = rawDevices.sort((a: any, b: any) => {
        const aCritical = a.jerigens?.some((j: any) => (j.current_volume / j.max_capacity) >= 0.8) ? 1 : 0;
        const bCritical = b.jerigens?.some((j: any) => (j.current_volume / j.max_capacity) >= 0.8) ? 1 : 0;
        return bCritical - aCritical;
      });
      setDevices(sortedDevices);

      // Jika modal sedang terbuka, perbarui data di dalamnya agar sinkron
      if (selectedDevice) {
        const updatedSelected = sortedDevices.find((d: any) => d.id_device === selectedDevice.id_device);
        setSelectedDevice(updatedSelected || null);
      }
      setIsLoading(false);
    }
  }, [rawDevices]); // selectedDevice tidak di-listen agar tidak re-trigger

  useEffect(() => {
    if (rawHistory) {
      setHistoryLogs(rawHistory);
    }
  }, [rawHistory]);

  const fetchData = () => {
    mutateDevices();
    mutateHistory();
  };

  // Handle pengangkutan SPESIFIK per jerigen
  const handlePickUp = async (deviceId: string, jerigenId: string, jerigenCode: string) => {
    const tipe = jerigenCode.includes('GOOD') ? 'Bagus' : 'Standar';
    const confirmText = `Anda yakin ingin menyedot minyak dari tangki Kualitas ${tipe} (${jerigenCode})?`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.post('/pengepul/dashboard', {
        id_device: deviceId,
        id_pengepul: userId,
        id_jerigen: jerigenId // Kirim ID jerigen spesifik
      });
      alert(`Minyak dari tangki ${tipe} berhasil diangkut!`);
      fetchData(); // Refresh UI dan Modal
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengangkut minyak.');
    }
  };

  if (isLoading && devices.length === 0) return <div className="text-center py-20 text-slate-500 font-bold animate-pulse">Memuat Data Lapangan...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Logistik & Penjemputan</h1>
          <p className="text-slate-500 mt-1">Pantau lokasi dengan kapasitas kritis dan catat penjemputan.</p>
        </div>
      </div>

      {/* CUSTOM TABS */}
      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit border border-slate-200">
        <button 
          onClick={() => setActiveTab('LOKASI')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'LOKASI' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MapPin className="w-4 h-4" /> Daftar Lokasi
        </button>
        <button 
          onClick={() => setActiveTab('HISTORI')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'HISTORI' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History className="w-4 h-4" /> Riwayat Ambil
        </button>
      </div>

      {/* TAB 1: DAFTAR LOKASI DEVICE */}
      {activeTab === 'LOKASI' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((device) => {
            const isDeviceCritical = device.jerigens?.some((j: any) => (j.current_volume / j.max_capacity) >= 0.8);

            return (
              <div 
                key={device.id_device} 
                onClick={() => setSelectedDevice(device)} // Buka modal saat di-klik
                className={`bg-white rounded-[1.5rem] overflow-hidden shadow-sm border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${isDeviceCritical ? 'border-red-400 hover:border-red-500' : 'border-slate-100 hover:border-orange-300'}`}
              >
                {/* Header Card */}
                <div className={`p-5 border-b ${isDeviceCritical ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{device.location_name}</h3>
                      <p className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Klik untuk detail
                      </p>
                    </div>
                    {isDeviceCritical && (
                      <span className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> Kritis
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Card (Preview Jerigen) */}
                <div className="p-5 space-y-4">
                  {!device.jerigens || device.jerigens.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">Tidak ada tangki</p>
                  ) : (
                    device.jerigens.map((jerigen: any) => {
                      const pct = Math.min((jerigen.current_volume / jerigen.max_capacity) * 100, 100);
                      const isKritis = pct >= 80;
                      return (
                        <div key={jerigen.id_jerigen} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-600">{jerigen.jerigen_code.includes('GOOD') ? '🟢 Bagus' : '🔴 Standar'}</span>
                            <span className="font-bold text-slate-500">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all ${isKritis ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: RIWAYAT PENJEMPUTAN */}
      {activeTab === 'HISTORI' && (
        // ... (KODE TAB HISTORI SAMA SEPERTI SEBELUMNYA) ...
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-green-100 p-2.5 rounded-xl">
              <CheckCircle2 className="text-green-600 w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Riwayat Pengangkutan Anda</h3>
          </div>

          {historyLogs.length === 0 ? (
            <div className="text-center py-20">
              <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Belum ada riwayat penjemputan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyLogs.map((log) => (
                <div key={log.id_pickup} className="flex flex-col sm:flex-row justify-between sm:items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-4 mb-3 sm:mb-0">
                    <div className="bg-slate-200 p-3 rounded-full hidden sm:block">
                      <Truck className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg mb-0.5">{log.device?.location_name || 'Lokasi Dihapus'}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1 font-mono"><Droplet className="w-3.5 h-3.5" /> {log.jerigen_code}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right bg-green-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <p className="text-xs font-bold text-slate-400 mb-0.5">Volume Diambil</p>
                    <p className="font-extrabold text-green-600 text-2xl">{log.volume_taken} <span className="text-base text-green-500">Liter</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL POP-UP DETAIL DEVICE & AMBIL MINYAK */}
      {/* ========================================= */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            {/* Header Modal */}
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold">{selectedDevice.location_name}</h3>
                <p className="text-sm font-mono text-slate-400 mt-1">{selectedDevice.device_code}</p>
              </div>
              <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-700/50 p-2 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8">
              {/* Info Alamat Lengkap */}
              <div className="flex gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl text-slate-700">
                <Navigation className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">Alamat Penjemputan</h4>
                  <p className="text-sm leading-relaxed">{selectedDevice.address || 'Alamat lengkap belum disetel oleh Mitra.'}</p>
                </div>
              </div>

              {/* List Jerigen Interactive */}
              <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-orange-500" /> Status Tangki di Lokasi
                </h4>
                
                <div className="space-y-4">
                  {selectedDevice.jerigens?.map((jerigen: any) => {
                    const pct = Math.min((jerigen.current_volume / jerigen.max_capacity) * 100, 100);
                    const isKritis = pct >= 80;
                    const isGood = jerigen.jerigen_code.includes('GOOD');
                    const isKosong = jerigen.current_volume === 0;

                    return (
                      <div key={jerigen.id_jerigen} className={`p-5 rounded-2xl border-2 transition-colors flex flex-col md:flex-row gap-6 justify-between md:items-center ${isKritis ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                        {/* Status Bar Kiri */}
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="font-extrabold text-slate-700 text-lg flex items-center gap-2">
                                {isGood ? '🟢 Minyak Bagus' : '🔴 Minyak Standar'}
                              </p>
                              <p className="text-xs font-mono text-slate-400 mt-1">{jerigen.jerigen_code}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-extrabold text-2xl ${isKritis ? 'text-red-600' : 'text-slate-700'}`}>
                                {jerigen.current_volume.toFixed(1)} <span className="text-sm text-slate-400 font-bold">/ {jerigen.max_capacity}L</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all duration-1000 ${isKritis ? 'bg-red-500' : (isGood ? 'bg-green-500' : 'bg-orange-500')}`}></div>
                          </div>
                        </div>

                        {/* Tombol Ambil Kanan */}
                        <div className="shrink-0">
                          <button 
                            onClick={() => handlePickUp(selectedDevice.id_device, jerigen.id_jerigen, jerigen.jerigen_code)}
                            disabled={isKosong}
                            className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                              isKosong 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                : 'bg-slate-800 text-white hover:bg-slate-900 active:scale-95 shadow-lg shadow-slate-800/20'
                            }`}
                          >
                            <Truck className="w-5 h-5" />
                            {isKosong ? 'Kosong' : 'Ambil Ini Saja'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 sticky bottom-0">
              <button onClick={() => setSelectedDevice(null)} className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors">
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}