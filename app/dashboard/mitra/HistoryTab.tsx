import { useState } from 'react';
import useSWR from 'swr';
import { History, CheckCircle2, XCircle, Truck, Gift, Loader2 } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function HistoryTab({ userId }: { userId: string }) {
  const { data, mutate, error } = useSWR(`/mitra/history?id_mitra=${userId}`, fetcher);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (id_exchange: string, action: 'COMPLETED' | 'CANCELLED') => {
    if (!confirm(`Anda yakin ingin ${action === 'COMPLETED' ? 'MENYELESAIKAN' : 'MEMBATALKAN'} penukaran ini?`)) return;
    
    setIsProcessing(true);
    try {
      await api.put('/mitra/history', {
        id_exchange,
        action
      });
      alert(`Transaksi berhasil ${action === 'COMPLETED' ? 'diselesaikan' : 'dibatalkan'}.`);
      mutate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memproses transaksi.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) return <div className="p-8 text-center text-red-500 font-bold">Gagal memuat histori.</div>;
  if (!data) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Memuat Data Histori...</div>;

  const { exchanges, pickups } = data;

  return (
    <div className="space-y-8">
      {/* BAGIAN PENUKARAN BARANG */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="bg-orange-100 p-2.5 rounded-xl"><Gift className="text-orange-600 w-6 h-6" /></div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Histori Penukaran Reward</h3>
            <p className="text-sm text-slate-500">Daftar nasabah yang menukar poin dengan barang Anda.</p>
          </div>
        </div>

        {exchanges.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-semibold border border-dashed border-slate-200 rounded-2xl">
            Belum ada transaksi penukaran.
          </div>
        ) : (
          <div className="space-y-4">
            {exchanges.map((ex: any) => (
              <div key={ex.id_exchange} className="flex flex-col sm:flex-row justify-between sm:items-center p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all">
                <div className="mb-4 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-lg">{ex.item?.item_name}</span>
                    <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">{ex.total_points_used} PTS</span>
                  </div>
                  <p className="text-sm text-slate-600">Nasabah: <span className="font-bold">{ex.nasabah?.name}</span></p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(ex.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {ex.status === 'pending' ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => handleAction(ex.id_exchange, 'COMPLETED')}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-1"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Selesai
                      </button>
                      <button 
                        onClick={() => handleAction(ex.id_exchange, 'CANCELLED')}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Batal
                      </button>
                    </div>
                  ) : (
                    <span className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1 ${
                      ex.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {ex.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {ex.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BAGIAN PENGAMBILAN OLEH PENGEPUL */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="bg-blue-100 p-2.5 rounded-xl"><Truck className="text-blue-600 w-6 h-6" /></div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Riwayat Pengambilan Pengepul</h3>
            <p className="text-sm text-slate-500">Histori minyak yang diambil oleh Pengepul dari mesin/tangki Anda.</p>
          </div>
        </div>

        {pickups.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-semibold border border-dashed border-slate-200 rounded-2xl">
            Belum ada riwayat pengambilan minyak.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-slate-50 text-slate-500 text-sm">
                  <th className="p-4 font-bold rounded-tl-xl">Tanggal</th>
                  <th className="p-4 font-bold">Mesin / Tangki</th>
                  <th className="p-4 font-bold">Pengepul</th>
                  <th className="p-4 font-bold text-right rounded-tr-xl">Volume Diambil</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {pickups.map((log: any) => (
                  <tr key={log.id_pickup} className="block md:table-row border border-slate-200 md:border-b md:border-x-0 md:border-t-0 rounded-2xl p-4 mb-4 md:mb-0 md:p-0 hover:bg-slate-50/50">
                    <td className="flex justify-between items-center md:table-cell py-2 md:p-4 text-sm text-slate-600">
                      <div className="md:hidden font-bold text-xs text-slate-400">Tanggal</div>
                      <div>{new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-2 md:p-4 border-t border-slate-100 md:border-none">
                      <div className="md:hidden font-bold text-xs text-slate-400">Mesin/Tangki</div>
                      <div className="text-right md:text-left">
                        <p className="font-bold text-slate-800">{log.device?.location_name}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1 md:mt-0 bg-slate-50 inline-block px-1 rounded">{log.jerigen_code}</p>
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-2 md:p-4 border-t border-slate-100 md:border-none font-semibold text-slate-700">
                      <div className="md:hidden font-bold text-xs text-slate-400">Pengepul</div>
                      <div>{log.pengepul?.name}</div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-2 md:p-4 border-t border-slate-100 md:border-none md:text-right font-extrabold text-blue-600">
                      <div className="md:hidden font-bold text-xs text-slate-400">Volume</div>
                      <div>{log.volume_taken} L</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
