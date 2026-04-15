"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Server, MapPin, Edit3, BatteryCharging, AlertTriangle, X, Check, Droplet, Filter } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function MitraDashboard() {
  const [userId, setUserId] = useState('');
  const [deviceData, setDeviceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Modal Edit (jerigens sekarang berupa Array)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      
      // Isi default form dengan MAP semua jerigen, HANYA jika modal sedang tertutup
      // Agar pengguna yang sedang mengetik tidak terganggu oleh update SWR
      if (!isEditModalOpen) {
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
  }, [rawDeviceData, isEditModalOpen]);

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
      setIsEditModalOpen(false);
      mutate(); // Segera menyuruh SWR memuat ulang data terbaru
    } catch (error) {
      alert('Gagal memperbarui data.');
    }
  };

  // Fungsi untuk handle perubahan nilai kapasitas pada spesifik jerigen
  const handleCapacityChange = (index: number, newValue: string) => {
    const updatedJerigens = [...formData.jerigens];
    updatedJerigens[index].max_capacity = parseFloat(newValue) || 0;
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
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:border-orange-500 transition-all shadow-sm"
        >
          <Edit3 className="w-5 h-5 text-orange-500" /> Edit Konfigurasi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CARD IDENTITAS MESIN (Kiri - Span 5) */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden h-fit">
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
            <div className="bg-white rounded-[2rem] p-8 text-center py-20 border border-slate-200">
              <p className="text-slate-500 font-bold">Data jerigen belum tersedia di unit ini.</p>
            </div>
          ) : (
            deviceData.jerigens.map((jerigen: any, index: number) => {
              // Kalkulasi data per jerigen
              const capacityPercent = Math.min((jerigen.current_volume / jerigen.max_capacity) * 100, 100);
              const isCritical = capacityPercent >= 80;
              const isGood = jerigen.jerigen_code.includes('GOOD'); // Cek apakah ini tangki kualitas bagus

              return (
                <div key={jerigen.id_jerigen} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
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

      {/* ========================================= */}
      {/* MODAL EDIT KONFIGURASI MULTI-JERIGEN      */}
      {/* ========================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white sticky top-0 z-10">
              <h3 className="text-xl font-bold flex items-center gap-2"><Edit3 className="w-5 h-5 text-orange-500" /> Edit Konfigurasi</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kode Perangkat</label>
                <input 
                  type="text" 
                  value={formData.device_code}
                  onChange={(e) => setFormData({...formData, device_code: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-orange-500 outline-none" required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lokasi</label>
                <input 
                  type="text" 
                  value={formData.location_name}
                  onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Lengkap</label>
                <textarea 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24" required
                ></textarea>
              </div>

              {/* LOOPING INPUT KAPASITAS UNTUK SETIAP JERIGEN */}
              <div className="border-t border-slate-200 pt-5 mt-5">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-500" /> Kapasitas Tangki (Liter)
                </h4>
                <div className="space-y-4">
                  {formData.jerigens.map((jData, index) => (
                    <div key={jData.id_jerigen} className="flex flex-col">
                      <label className="text-xs font-bold text-slate-500 mb-1 flex justify-between">
                        <span>{jData.jerigen_code.includes('GOOD') ? 'Tangki Bagus (GOOD)' : 'Tangki Standar (BAD)'}</span>
                        <span className="font-mono text-slate-400">{jData.jerigen_code}</span>
                      </label>
                      <input 
                        type="number" 
                        value={jData.max_capacity}
                        onChange={(e) => handleCapacityChange(index, e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" required min="1"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-1/2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                <button type="submit" className="w-1/2 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/30">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}