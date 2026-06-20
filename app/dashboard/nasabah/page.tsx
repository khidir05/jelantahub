"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Wallet, History, Server, Loader2, CheckCircle2, XCircle, MapPin, Zap, ArrowRight, RefreshCcw, Droplets, LayoutDashboard, Gift } from 'lucide-react';
import api from '../../lib/axios';
import RewardsTab from './RewardsTab';

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
  const [activeMainTab, setActiveMainTab] = useState('beranda'); // 'beranda' | 'rewards'

  const [mqttPayload, setMqttPayload] = useState<any>(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [selectedMitraId, setSelectedMitraId] = useState<string>('');

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
      if (devicesData.envMitraId && !selectedMitraId) {
        setSelectedMitraId(devicesData.envMitraId);
      }

      if (devicesData.activeDevice) {
        setActiveDevice(devicesData.activeDevice);
        
        // State Machine Update
        if (devicesData.activeDevice.process === 'standby') {
          if (uiState !== 'LOADING' && uiState !== 'SUCCESS') {
             setUiState('STANDBY');
          }
        } else if (devicesData.activeDevice.process === 'load') {
          if (uiState !== 'SUCCESS') {
             setUiState('LOADING');
          }
        }
      } else {
        setActiveDevice(null);
        setAvailableDevices(devicesData.availableDevices);
        if (uiState !== 'IDLE' && uiState !== 'SUCCESS') setUiState('IDLE');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesData]);

  // Polling nilai sensor dari API server-side MQTT.
  useEffect(() => {
    if (uiState !== 'LOADING' || !activeDevice) return;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    const readMqttValue = async () => {
      try {
        const response = await api.get('/iot/live-value');
        if (!isMounted) return;

        setMqttConnected(Boolean(response.data?.connected));
        if (response.data?.payload) {
          setMqttPayload(response.data.payload);
        }
      } catch (error) {
        if (!isMounted) return;
        setMqttConnected(false);
      }
    };

    readMqttValue();
    intervalId = setInterval(readMqttValue, 1500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [uiState, activeDevice]);

  const handleSelesaiTuang = async () => {
    if (!activeDevice) return;
    
    // Jika tidak ada payload sama sekali (misal sensor belum publish apa-apa)
    const finalPayload = {
      id_device: activeDevice.id_device,
      volume_disetor: Number(mqttPayload?.volume_disetor ?? 0),
      skor_kualitas: Number(mqttPayload?.skor_kualitas ?? 0),
      volume_jerigen_a: Number(mqttPayload?.volume_jerigen_a ?? 0),
      volume_jerigen_b: Number(mqttPayload?.volume_jerigen_b ?? 0),
      sensor_status: Boolean(mqttPayload?.sensor_status ?? false),
      timestamp: mqttPayload?.timestamp || new Date().toISOString(),
    };

    setIsFinishing(true);
    try {
      // 1. Simpan Transaksi ke Database
      const response = await api.post('/iot/simpan-transaksi', finalPayload);
      
      // 2. Publish MQTT ke topic /quality
      await api.post('/iot/live-value', { action: 'PUBLISH_QUALITY' });

      if (response.data.success) {
        setUiState('SUCCESS');
        mutateTabungan();
        mutateDevices();
      }
    } catch (error) {
      console.error(error);
      alert("Gagal memproses transaksi. Silakan coba lagi.");
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDeviceAction = async (action: string, deviceId: string) => {
    try {
      await api.post('/nasabah/device', { action, id_device: deviceId, id_nasabah: userId });
      if (action === 'FINISH') {
        setUiState('IDLE');
        setMqttPayload(null);
        setMqttConnected(false);
        mutateDevices();
      } else if (action === 'SELECT' || action === 'CANCEL') {
        setUiState('STANDBY');
        if (action === 'CANCEL') {
          setMqttPayload(null);
          setMqttConnected(false);
        }
        mutateDevices();
      } else if (action === 'SETOR') {
        setUiState('LOADING');
        setMqttPayload(null);
      }
    } catch (error) {
      alert("Gagal memproses permintaan.");
    }
  };

  const handleStartSetor = async (deviceId: string) => {
    try {
      await api.post('/nasabah/device', { action: 'SELECT', id_device: deviceId, id_nasabah: userId });
      await api.post('/nasabah/device', { action: 'SETOR', id_device: deviceId, id_nasabah: userId });
      setUiState('LOADING');
      setMqttPayload(null);
      mutateDevices();
    } catch (error) {
      alert("Gagal memulai setoran. Mesin mungkin sedang digunakan.");
    }
  };

  // Extract unique available mitras from availableDevices
  const availableMitras = Array.from(
    new Map(
      availableDevices
        .filter((d: any) => d.mitra)
        .map((d: any) => [d.id_mitra, d.mitra])
    ).values()
  ) as any[];

  // Find the selected device based on selectedMitraId
  const selectedDevice = availableDevices.find((d: any) => d.id_mitra === selectedMitraId);

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dasbor Nasabah</h1>
        <p className="text-slate-500 mt-1">Pantau poin dan kelola setoran minyak Anda di sini.</p>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-full sm:w-fit max-w-full overflow-x-auto border border-slate-200/60">
        <button 
          onClick={() => setActiveMainTab('beranda')}
          className={`shrink-0 flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeMainTab === 'beranda' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" /> Setoran
        </button>
        <button 
          onClick={() => setActiveMainTab('rewards')}
          className={`shrink-0 flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeMainTab === 'rewards' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Gift className="w-5 h-5" /> Tukar Poin
        </button>
      </div>

      {activeMainTab === 'beranda' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        
        {/* ========================================= */}
        {/* KOLOM KIRI (Span 5): SALDO & MESIN        */}
        {/* ========================================= */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* CARD SALDO (Desain Mewah) */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-5 sm:p-6 lg:p-8 shadow-xl relative overflow-hidden">
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
          <div className="bg-white rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200">
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

            {/* STATE 1: IDLE (Tidak Ada Mesin Terpilih) */}
            {uiState === 'IDLE' && (
              <div className="space-y-4">
                {availableDevices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Server className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-600">Tidak ada mesin online</p>
                    <p className="text-xs text-slate-400 mt-1">Tunggu beberapa saat atau refresh halaman.</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    {/* Dropdown Pilih Mitra */}
                    <div className="mb-6 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Mitra Tempat Setor:</label>
                      <select
                        value={selectedMitraId}
                        onChange={(e) => setSelectedMitraId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 transition-all cursor-pointer hover:bg-slate-100/50"
                      >
                        <option value="">-- Pilih Mitra --</option>
                        {availableMitras.map((mitra: any) => (
                          <option key={mitra.id_user} value={mitra.id_user}>
                            {mitra.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedDevice ? (
                      <div className="animate-in zoom-in-95 duration-200">
                        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
                          <Zap className="w-4 h-4 fill-orange-500" /> Terhubung: {selectedDevice.location_name}
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Mesin Siap!</h2>
                        <p className="text-slate-500 text-sm mb-8 px-4">Klik tombol di bawah untuk membuka katup, lalu tuangkan minyak Anda secara perlahan.</p>
                        
                        <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => handleStartSetor(selectedDevice.id_device)}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-extrabold text-lg hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            Mulai Setor Minyak
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 text-center text-slate-500 text-sm">
                        {selectedMitraId ? "Mesin Mitra terpilih sedang tidak tersedia/offline." : "Silakan pilih Mitra terlebih dahulu untuk memulai setor minyak."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STATE 2: STANDBY (Siap Setor) */}
            {uiState === 'STANDBY' && activeDevice && (
              <div className="text-center py-4">
                {/* Dropdown Pilih Mitra (Disabled) */}
                <div className="mb-6 text-left opacity-75">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Mitra Tempat Setor:</label>
                  <select
                    disabled
                    value={activeDevice.id_mitra}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 outline-none cursor-not-allowed"
                  >
                    <option value={activeDevice.id_mitra}>{activeDevice.mitra?.name || 'Unknown'}</option>
                  </select>
                </div>

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
                {/* Dropdown Pilih Mitra (Disabled) */}
                <div className="mb-6 text-left opacity-75">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Mitra Tempat Setor:</label>
                  <select
                    disabled
                    value={activeDevice.id_mitra}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 outline-none cursor-not-allowed"
                  >
                    <option value={activeDevice.id_mitra}>{activeDevice.mitra?.name || 'Unknown'}</option>
                  </select>
                </div>

                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-50"></div>
                  <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                    <Droplets className="w-10 h-10 text-orange-500 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Silakan Tuang Minyak</h2>
                <p className="text-slate-500 text-sm mb-6 px-2">Data volume dari mesin akan muncul secara real-time di bawah ini.</p>
                
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 flex flex-col items-center">
                   <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest mb-2">Volume Terbaca</p>
                   <div className="flex flex-col items-center gap-4 w-full">
                     <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-extrabold text-slate-800">
                          {mqttPayload ? Number(mqttPayload.volume_disetor || 0).toFixed(2) : "0.00"}
                       </span>
                       <span className="text-xl font-bold text-orange-500">Liter</span>
                     </div>
                     <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center justify-between w-full max-w-[200px]">
                       <span className="text-xs font-bold text-slate-500">Skor Kualitas</span>
                       <span className="text-lg font-extrabold text-slate-800">
                         {mqttPayload ? Number(mqttPayload.skor_kualitas || 0).toFixed(0) : "0"}%
                       </span>
                     </div>
                   </div>
                   {mqttPayload && (
                      <div className="mt-3 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Sensor Aktif
                      </div>
                   )}
                   {!mqttPayload && (
                      <p className="mt-3 text-xs text-slate-500">
                        {mqttConnected ? 'Menunggu data dari sensor...' : 'Menghubungkan ke MQTT...'}
                      </p>
                   )}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleSelesaiTuang}
                    disabled={isFinishing}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-extrabold text-lg hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isFinishing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Selesai Tuang"}
                  </button>
                  <button 
                    onClick={() => handleDeviceAction('CANCEL', activeDevice.id_device)}
                    disabled={isFinishing}
                    className="w-full bg-white border-2 border-red-100 text-red-500 py-3 rounded-2xl font-bold hover:bg-red-50 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Batalkan Proses
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: SUCCESS (IoT Selesai) */}
            {uiState === 'SUCCESS' && activeDevice && (
              <div className="text-center py-4">
                {/* Dropdown Pilih Mitra (Disabled) */}
                <div className="mb-6 text-left opacity-75">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Mitra Tempat Setor:</label>
                  <select
                    disabled
                    value={activeDevice.id_mitra}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 outline-none cursor-not-allowed"
                  >
                    <option value={activeDevice.id_mitra}>{activeDevice.mitra?.name || 'Unknown'}</option>
                  </select>
                </div>

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
          <div className="bg-white rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200 h-full">
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
      ) : (
        <RewardsTab userId={userId} saldoPoin={tabungan.saldo_poin} onExchangeSuccess={() => mutateTabungan()} />
      )}
    </div>
  );
}