import { useState } from 'react';
import useSWR from 'swr';
import { Gift, CheckCircle2, ShoppingBag, Plus, Minus, AlertTriangle, X, HelpCircle } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function RewardsTab({ userId, saldoPoin, onExchangeSuccess }: { userId: string, saldoPoin: number, onExchangeSuccess: () => void }) {
  const { data, mutate, error } = useSWR('/nasabah/items', fetcher);
  const [isExchanging, setIsExchanging] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const items = data?.items || [];

  const addToCart = (item: any) => {
    const currentQty = cart[item.id_item] || 0;
    if (currentQty >= item.stock) {
      alert(`Stok maksimal untuk ${item.item_name} adalah ${item.stock}.`);
      return;
    }
    setCart({ ...cart, [item.id_item]: currentQty + 1 });
  };

  const removeFromCart = (item: any) => {
    const currentQty = cart[item.id_item] || 0;
    if (currentQty <= 1) {
      const newCart = { ...cart };
      delete newCart[item.id_item];
      setCart(newCart);
    } else {
      setCart({ ...cart, [item.id_item]: currentQty - 1 });
    }
  };

  const clearCart = () => setCart({});

  const totalPointsNeeded = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = items.find((i: any) => i.id_item === id);
    if (!item) return total;
    return total + (item.point_cost * qty);
  }, 0);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleCheckoutClick = () => {
    if (totalPointsNeeded > saldoPoin) {
      alert(`Peringatan: Saldo poin Anda tidak mencukupi!\nTotal dibutuhkan: ${totalPointsNeeded} PTS\nSaldo Anda: ${saldoPoin} PTS`);
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const executeExchange = async () => {
    setIsExchanging(true);
    try {
      const payloadItems = Object.entries(cart).map(([id_item, quantity]) => ({ id_item, quantity }));
      await api.post('/nasabah/exchange', {
        id_nasabah: userId,
        items: payloadItems
      });
      alert('Berhasil menukar poin! Silakan ambil barang di Mitra.');
      setCart({});
      setIsConfirmModalOpen(false);
      mutate();
      onExchangeSuccess(); // Refresh saldo poin
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menukar poin.');
    } finally {
      setIsExchanging(false);
    }
  };

  if (error) return <div className="p-8 text-center text-red-500 font-bold">Gagal memuat data katalog barang.</div>;
  if (!data) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Memuat Katalog Reward...</div>;

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
        <div className="bg-orange-100 p-2.5 rounded-xl"><Gift className="text-orange-600 w-6 h-6" /></div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Katalog Reward</h3>
          <p className="text-sm text-slate-500">Tukarkan poin Anda dengan berbagai barang menarik dari Mitra.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">Belum ada barang tersedia</p>
          <p className="text-xs text-slate-400 mt-1">Saat ini Mitra belum menambahkan katalog barang.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {items.map((item: any) => {
            const isOutOfStock = item.stock <= 0;
            const qtyInCart = cart[item.id_item] || 0;

            return (
              <div key={item.id_item} className={`flex flex-col border rounded-2xl overflow-hidden hover:shadow-lg transition-all bg-white group p-5 ${qtyInCart > 0 ? 'border-orange-500 shadow-md shadow-orange-500/10' : 'border-slate-200'}`}>
                
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 text-lg">{item.item_name}</h4>
                  {qtyInCart > 0 && (
                    <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-extrabold shadow-sm animate-in zoom-in">
                      {qtyInCart}x
                    </span>
                  )}
                  {isOutOfStock && qtyInCart === 0 && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                      Stok Habis
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-1">{item.description}</p>
                
                <div className="flex items-center justify-between mt-auto mb-4">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Mitra: {item.mitra?.name || 'Anonim'}
                  </span>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    Stok: {item.stock}
                  </span>
                </div>

                <div className="mt-2">
                  {qtyInCart > 0 ? (
                    <div className="flex items-center justify-between bg-orange-50 p-1 rounded-xl border border-orange-200">
                      <button 
                        onClick={() => removeFromCart(item)}
                        className="w-10 h-10 flex items-center justify-center bg-white text-orange-600 rounded-lg shadow-sm hover:bg-orange-100 font-bold"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-extrabold text-orange-700">
                        {qtyInCart} Item
                      </span>
                      <button 
                        onClick={() => addToCart(item)}
                        disabled={qtyInCart >= item.stock}
                        className={`w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-lg shadow-sm font-bold ${qtyInCart >= item.stock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)}
                      disabled={isOutOfStock}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-md active:scale-95'
                      }`}
                    >
                      Tambah ({item.point_cost} PTS)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING CART BAR */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between z-40 animate-in slide-in-from-bottom-10 border border-slate-700">
          <div className="flex flex-col pl-2">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> {totalItems} Barang
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-extrabold ${totalPointsNeeded > saldoPoin ? 'text-red-400' : 'text-green-400'}`}>
                {totalPointsNeeded} PTS
              </span>
              {totalPointsNeeded > saldoPoin && (
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearCart}
              disabled={isExchanging}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleCheckoutClick} 
              disabled={isExchanging} 
              className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-xl font-bold text-sm sm:text-base shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tukar
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Konfirmasi Penukaran</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin mau menukar <strong className="text-slate-800">{totalPointsNeeded} poin</strong> Anda dengan <strong className="text-slate-800">{totalItems} barang</strong> ini?
              </p>
              
              <div className="w-full flex gap-3">
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isExchanging}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Tidak
                </button>
                <button 
                  onClick={executeExchange}
                  disabled={isExchanging}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isExchanging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Yakin"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
