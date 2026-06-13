"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Server, MapPin, Edit3, BatteryCharging, AlertTriangle, X, Check, Droplet, Filter, LayoutDashboard, Package, History } from 'lucide-react';
import api from '../../lib/axios';
import ItemsTab from './ItemsTab';
import HistoryTab from './HistoryTab';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function MitraDashboard() {
  const [userId, setUserId] = useState('');
  const [deviceData, setDeviceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('beranda');
  
  const [formData, setFormData] = useState({
    device_code: '',
    location_name: '',
    address: '',
    jerigens: [] as any[],
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user_id');
    if (storedUser) setUserId(storedUser);
  }, []);

  const { data: rawDeviceData, error, mutate } = useSWR(
    userId ? `/mitra/dashboard?id_mitra=${userId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    if (rawDeviceData) {
      setDeviceData(rawDeviceData);
      setIsLoading(false);
      
      // Isi default form dengan MAP semua jerigen, HANYA jika tab edit tidak aktif
      // Agar pengguna yang sedang mengetik tidak terganggu oleh update SWR
      if (activeMainTab !== 'edit-config') {
        setFormData({
          device_code: rawDeviceData.device_code || '',
          location_name: rawDeviceData.location_name || '',
          address: rawDeviceData.address || '',
          jerigens: rawDeviceData.jerigens?.map((j: any) => ({
            id_jerigen: j.id_jerigen,
            jerigen_code: j.jerigen_code,
            max_capacity: j.max_capacity,
            current_volume: j.current_volume
          })) || [],
        });
      }
    }
  }, [rawDeviceData, activeMainTab]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/mitra/dashboard', {
        id_device: deviceData.id_device,
        device_code: formData.device_code,
        location_name: formData.location_name,
        address: formData.address,
        jerigen_updates: formData.jerigens // Kirim array jerigen ke API
      });
      alert('Data berhasil diperbarui!');
      setActiveMainTab('beranda'); // kembali ke tampilan beranda
      mutate(); // Segera menyuruh SWR memuat ulang data terbaru
    } catch (error) {
      alert('Gagal memperbarui data.');
    }
  };

  // Fungsi untuk handle perubahan nilai kapasitas pada spesifik jerigen
  const handleCapacityChange = (index: number, newValue: string) => {
    const updatedJerigens = [...formData.jerigens];
    updatedJerigens[index].max_capacity = parseInt(newValue, 10) || 0;
    setFormData({ ...formData, jerigens: updatedJerigens });
  };

  if (isLoading) return <div className="text-center py-20 text-slate-500 font-bold animate-pulse">Memuat Data Lokasi...</div>;
  if (!deviceData) return <div className="text-center py-20 text-red-500 font-bold">Anda belum ditugaskan ke mesin manapun.</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Monitoring Lokasi</h1>
          <p className="text-slate-500 mt-1">Pantau status mesin dan kapasitas penampungan Anda.</p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-200/50 rounded-2xl w-full mb-6 border border-slate-200/60">
        <button 
          onClick={() => setActiveMainTab('beranda')}
          className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeMainTab === 'beranda' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Mesin & Tangki
        </button>
        <button 
          onClick={() => setActiveMainTab('items')}
          className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeMainTab === 'items' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'
          }`}
        >
          <Package className="w-4 h-4" /> Katalog Barang
        </button>
        <button 
          onClick={() => setActiveMainTab('history')}
          className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeMainTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'
          }`}
        >
          <History className="w-4 h-4" /> Histori Transaksi
        </button>
        <button 
          onClick={() => setActiveMainTab('edit-config')}
          className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeMainTab === 'edit-config' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'
          }`}
        >
          <Edit3 className="w-4 h-4" /> Edit Konfigurasi
        </button>
      </div>

      {activeMainTab === 'beranda' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        
        {/* CARD IDENTITAS MESIN (Kiri - Span 5) */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200 relative overflow-hidden h-fit">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
            <div className="bg-blue-100 p-2.5 rounded-xl"><Server className="text-blue-600 w-6 h-6" /></div>
            <h3 className="text-xl font-bold text-slate-800">Informasi Unit</h3>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-400">Kode Perangkat</p>
              <p className="text-xl font-bold text-slate-800 font-mono">{deviceData.device_code}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Nama Lokasi</p>
              <p className="text-lg font-bold text-slate-700">{deviceData.location_name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Alamat Lengkap</p>
              <p className="text-md text-slate-600 bg-slate-50 p-4 rounded-xl mt-1 border border-slate-100 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                {deviceData.address || 'Alamat belum diatur'}
              </p>
            </div>
          </div>
        </div>

        {/* AREA JERIGEN (Kanan - Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {!deviceData.jerigens || deviceData.jerigens.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-4 sm:p-6 lg:p-8 text-center py-16 sm:py-20 border border-slate-200">
              <p className="text-slate-500 font-bold">Data jerigen belum tersedia di unit ini.</p>
            </div>
          ) : (
            deviceData.jerigens.map((jerigen: any, index: number) => {
              // Kalkulasi data per jerigen
              const capacityPercent = Math.min((jerigen.current_volume / jerigen.max_capacity) * 100, 100);
              const isCritical = capacityPercent >= 80;
              const isGood = jerigen.jerigen_code.includes('GOOD'); // Cek apakah ini tangki kualitas bagus

              return (
                <div key={jerigen.id_jerigen} className="bg-white rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isGood ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {isGood ? <Filter className="text-green-600 w-6 h-6" /> : <AlertTriangle className="text-orange-600 w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">
                          Tangki {isGood ? 'Kualitas Bagus' : 'Kualitas Standar'}
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{jerigen.jerigen_code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-semibold text-slate-400 mb-1">Volume Terisi</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-extrabold text-slate-800">{jerigen.current_volume.toFixed(1)}</span>
                          <span className="text-xl font-bold text-slate-500">/ {jerigen.max_capacity} L</span>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${isCritical ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {isCritical ? <AlertTriangle className="w-5 h-5" /> : <BatteryCharging className="w-5 h-5" />}
                        {capacityPercent.toFixed(0)}%
                      </div>
                    </div>

                    {/* Progress Bar Dinamis */}
                    <div className="relative pt-2">
                      <div className="overflow-hidden h-6 mb-4 text-xs flex rounded-full bg-slate-100 border border-slate-200 shadow-inner">
                        <div 
                          style={{ width: `${capacityPercent}%` }} 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${isCritical ? 'bg-red-500' : (isGood ? 'bg-green-500' : 'bg-orange-500')}`}
                        ></div>
                      </div>
                      {isCritical && (
                        <p className="text-red-500 text-sm font-bold flex items-center gap-2 animate-pulse">
                          <AlertTriangle className="w-4 h-4" /> Peringatan: Tangki ini hampir penuh.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
        </>
      ) : activeMainTab === 'items' ? (
        <ItemsTab userId={userId} />
      ) : activeMainTab === 'history' ? (
        <HistoryTab userId={userId} />
      ) : (
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 lg:p-10 shadow-sm border border-slate-200 w-full max-w-3xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-5">
            <div className="bg-orange-100 p-3 rounded-xl"><Edit3 className="text-orange-500 w-6 h-6" /></div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Edit Konfigurasi Unit</h3>
              <p className="text-slate-500 text-sm mt-1">Perbarui detail lokasi dan kapasitas tangki yang terpasang.</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kode Perangkat</label>
                <input 
                  type="text" 
                  value={formData.device_code}
                  onChange={(e) => setFormData({...formData, device_code: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-orange-500 outline-none transition-all" required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lokasi</label>
                <input 
                  type="text" 
                  value={formData.location_name}
                  onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all" required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Lengkap</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none h-32 transition-all" required
              ></textarea>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Droplet className="w-6 h-6 text-blue-500" /> Pengaturan Kapasitas Tangki (Liter)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {formData.jerigens.map((jData, index) => (
                  <div key={jData.id_jerigen} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-sm font-bold text-slate-600 mb-2 flex justify-between items-center">
                      <span>{jData.jerigen_code.includes('GOOD') ? '🟢 Tangki Bagus' : '🔴 Tangki Standar'}</span>
                    </label>
                    <p className="text-[10px] font-mono text-slate-400 mb-3">{jData.jerigen_code}</p>
                    <div className="relative">
                      <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-sm">Liter</span>
                      <input 
                        type="number" 
                        value={jData.max_capacity}
                        onChange={(e) => handleCapacityChange(index, e.target.value)}
                        className="w-full p-3 pr-14 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required min="1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-8 flex gap-4">
              <button type="button" onClick={() => setActiveMainTab('beranda')} className="w-1/3 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Batal</button>
              <button type="submit" className="w-2/3 py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}