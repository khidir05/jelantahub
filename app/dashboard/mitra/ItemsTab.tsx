import { useState } from 'react';
import useSWR from 'swr';
import { Package, Plus, Edit2, Trash2, Tag, Box, Info } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function ItemsTab({ userId }: { userId: string }) {
  const { data, mutate, error } = useSWR(`/mitra/items?id_mitra=${userId}`, fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    point_cost: '',
    stock: ''
  });

  const [editFormData, setEditFormData] = useState({
    id_item: '',
    item_name: '',
    description: '',
    point_cost: '',
    stock: ''
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/mitra/items', {
        id_mitra: userId,
        ...formData
      });
      alert('Barang berhasil ditambahkan!');
      setFormData({ item_name: '', description: '', point_cost: '', stock: '' });
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menambahkan barang.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/mitra/items', {
        action: 'EDIT_ITEM',
        ...editFormData
      });
      alert('Barang berhasil diperbarui!');
      setIsEditModalOpen(false);
      mutate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memperbarui barang.');
    }
  };

  const openEditModal = (item: any) => {
    setEditFormData({
      id_item: item.id_item,
      item_name: item.item_name,
      description: item.description,
      point_cost: item.point_cost.toString(),
      stock: item.stock.toString()
    });
    setIsEditModalOpen(true);
  };

  // updateStock has been removed in favor of handleEditSubmit

  const toggleActive = async (id_item: string, currentActive: boolean) => {
    try {
      await api.put('/mitra/items', {
        action: 'TOGGLE_ACTIVE',
        id_item,
        is_active: !currentActive
      });
      mutate();
    } catch (err) {
      alert('Gagal mengubah status barang.');
    }
  };

  if (error) return <div className="p-8 text-center text-red-500 font-bold">Gagal memuat data barang.</div>;
  if (!data) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Memuat Katalog...</div>;

  const items = data.items || [];

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-xl"><Package className="text-blue-600 w-6 h-6" /></div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Katalog Barang (Reward)</h3>
            <p className="text-sm text-slate-500">Kelola stok barang yang bisa ditukarkan nasabah dengan poin.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" /> Tambah Barang
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
        <table className="w-full text-left border-collapse block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-slate-50 text-slate-500 text-sm">
              <th className="p-4 font-bold rounded-tl-xl">Nama Barang</th>
              <th className="p-4 font-bold">Harga Poin</th>
              <th className="p-4 font-bold">Stok</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold text-right rounded-tr-xl">Aksi</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {items.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={5} className="block md:table-cell p-8 text-center text-slate-500 font-semibold border-b border-slate-100">
                  Belum ada barang di katalog Anda.
                </td>
              </tr>
            ) : items.map((item: any) => (
              <tr key={item.id_item} className="block md:table-row border border-slate-200 md:border-b md:border-x-0 md:border-t-0 rounded-2xl p-4 mb-4 md:mb-0 md:p-0 hover:bg-slate-50/50 transition-colors">
                {/* MOBILE VIEW */}
                <td className="block md:hidden">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-bold text-slate-800">{item.item_name}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                    <p className="font-extrabold text-orange-500 shrink-0 ml-3">{item.point_cost} PTS</p>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleActive(item.id_item, item.is_active)}
                        className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        Stok: <span className={item.stock <= 0 ? 'text-red-500' : 'text-slate-800'}>{item.stock}</span>
                      </span>
                    </div>
                    <button 
                      onClick={() => openEditModal(item)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </td>

                {/* DESKTOP VIEW */}
                <td className="hidden md:table-cell p-4">
                  <p className="font-bold text-slate-800">{item.item_name}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[250px]">{item.description}</p>
                </td>
                <td className="hidden md:table-cell p-4 font-extrabold text-orange-500">{item.point_cost} PTS</td>
                <td className="hidden md:table-cell p-4">
                  <span className={`font-bold ${item.stock <= 0 ? 'text-red-500' : 'text-slate-700'}`}>
                    {item.stock}
                  </span>
                </td>
                <td className="hidden md:table-cell p-4">
                  <button 
                    onClick={() => toggleActive(item.id_item, item.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="hidden md:table-cell p-4 text-right">
                  <button 
                    onClick={() => openEditModal(item)}
                    className="flex items-center justify-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 ml-auto"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-5 text-white flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-lg">Tambah Barang Baru</h3>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag className="w-4 h-4 text-slate-400" /> Nama Barang
                </label>
                <input 
                  type="text" required
                  value={formData.item_name}
                  onChange={e => setFormData({...formData, item_name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Info className="w-4 h-4 text-slate-400" /> Deskripsi Singkat
                </label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Harga (Poin)</label>
                  <input 
                    type="number" required min="1" step="0.5"
                    value={formData.point_cost}
                    onChange={e => setFormData({...formData, point_cost: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Stok Awal</label>
                  <input 
                    type="number" required min="0"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-5 text-white flex items-center gap-3">
              <Edit2 className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-lg">Edit Barang</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag className="w-4 h-4 text-slate-400" /> Nama Barang
                </label>
                <input 
                  type="text" required
                  value={editFormData.item_name}
                  onChange={e => setEditFormData({...editFormData, item_name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Info className="w-4 h-4 text-slate-400" /> Deskripsi Singkat
                </label>
                <textarea 
                  required
                  value={editFormData.description}
                  onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Harga (Poin)</label>
                  <input 
                    type="number" required min="1" step="0.5"
                    value={editFormData.point_cost}
                    onChange={e => setEditFormData({...editFormData, point_cost: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Stok Awal</label>
                  <input 
                    type="number" required min="0"
                    value={editFormData.stock}
                    onChange={e => setEditFormData({...editFormData, stock: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
