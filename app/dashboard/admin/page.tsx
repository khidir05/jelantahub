"use client";

import { useState, useEffect } from 'react';
import { Users, Link as LinkIcon, Settings, CheckCircle2, XCircle, Copy, Plus, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import api from '../../lib/axios';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'USERS' | 'LINKS' | 'RULES'>('USERS');
  const [users, setUsers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  
  // State Modal Accept Mitra
  const [acceptModal, setAcceptModal] = useState<{isOpen: boolean, id_user: string, name: string}>({isOpen: false, id_user: '', name: ''});
  const [deviceCodeInput, setDeviceCodeInput] = useState('');

  // State untuk Konfigurasi Poin 2-Grade
  const [gradeConfig, setGradeConfig] = useState({ pointA: 50, pointB: 10 });

  const fetchData = async () => {
    try {
      const [resUsers, resLinks, resRules] = await Promise.all([
        api.get('/admin/dashboard?action=GET_USERS'),
        api.get('/admin/dashboard?action=GET_LINKS'),
        api.get('/admin/dashboard?action=GET_RULES')
      ]);
      setUsers(resUsers.data);
      setLinks(resLinks.data);

      // Pastikan ada 2 data (Good dan Bad)
      if (resRules.data && resRules.data.length >= 2) {
        setGradeConfig({
          pointA: resRules.data.find((r: any) => r.quality === 'good')?.point_per_liter || 50,
          pointB: resRules.data.find((r: any) => r.quality === 'bad')?.point_per_liter || 10
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // === ACTIONS ===
  const handleAcceptMitra = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!deviceCodeInput) return alert("Device Code wajib diisi!");
    try {
      await api.post('/admin/dashboard', { action: 'ACCEPT_MITRA', id_user: acceptModal.id_user, device_code: deviceCodeInput });
      alert('Mitra disetujui!');
      setAcceptModal({isOpen: false, id_user: '', name: ''});
      setDeviceCodeInput('');
      fetchData();
    } catch (err) { alert('Gagal menyetujui Mitra'); }
  };

  const handleRejectOrDeleteUser = async (id_user: string, name: string) => {
    if(!window.confirm(`Yakin ingin menolak/menghapus user ${name}? Tindakan ini permanen.`)) return;
    try {
      await api.delete(`/admin/dashboard?action=DELETE_USER&id=${id_user}`);
      fetchData();
    } catch (err) { alert('Gagal menghapus user'); }
  };

  const handleGenerateLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await api.post('/admin/dashboard', {
        action: 'GENERATE_LINK',
        role: formData.get('role'),
        days_valid: formData.get('days')
      });
      fetchData();
    } catch (err) { alert('Gagal membuat link'); }
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/dashboard', {
        action: 'SAVE_POINT_CONFIG',
        ...gradeConfig
      });
      alert('Konfigurasi Harga Poin berhasil diperbarui dan mulai berlaku sekarang!');
      fetchData();
    } catch (err) { alert('Gagal menyimpan konfigurasi'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Token disalin!');
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Pusat Kendali Admin</h1>
        <p className="text-slate-500 mt-1">Kelola Pengguna, Token Pendaftaran, dan Konfigurasi Sistem.</p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-full sm:w-fit max-w-full overflow-x-auto border border-slate-200">
        <button onClick={() => setActiveTab('USERS')} className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'USERS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Users className="w-4 h-4" /> Manajemen User</button>
        <button onClick={() => setActiveTab('LINKS')} className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'LINKS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><LinkIcon className="w-4 h-4" /> Token Registrasi</button>
        <button onClick={() => setActiveTab('RULES')} className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'RULES' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Settings className="w-4 h-4" /> Konversi Harga</button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 text-slate-400 text-sm">
                  <th className="pb-3 font-bold">Nama & Role</th>
                  <th className="pb-3 font-bold">Username / Telp</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id_user} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4">
                      <p className="font-bold text-slate-800">{user.name}</p>
                      <span className="text-xs font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{user.role}</span>
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      <p>{user.username}</p>
                      <p className="text-xs text-slate-400">{user.no_telp || '-'}</p>
                    </td>
                    <td className="py-4">
                      {user.is_active ? 
                        <span className="flex w-fit items-center gap-1 bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Aktif</span> : 
                        <span className="flex w-fit items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold"><AlertTriangle className="w-3.5 h-3.5" /> Menunggu Accept</span>
                      }
                    </td>
                    <td className="py-4 text-right space-x-2">
                      {!user.is_active && user.role === 'mitra' && (
                        <button onClick={() => setAcceptModal({isOpen: true, id_user: user.id_user, name: user.name})} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-700">Accept</button>
                      )}
                      <button onClick={() => handleRejectOrDeleteUser(user.id_user, user.name)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100">{user.is_active ? 'Hapus' : 'Reject'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRATION LINKS */}
      {activeTab === 'LINKS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-orange-500" /> Buat Token Baru</h3>
            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Role Target</label>
                <select name="role" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                  <option value="admin">Admin</option>
                  <option value="pengepul">Pengepul</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Masa Berlaku (Hari)</label>
                <input type="number" name="days" defaultValue="1" min="1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600">Generate Token</button>
            </form>
          </div>
          
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Daftar Token Aktif & Riwayat</h3>
            <div className="space-y-3">
              {links.map(link => {
                const isExpired = new Date() > new Date(link.expires_at);
                const statusColor = link.is_used ? 'bg-slate-100 text-slate-500' : (isExpired ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600');
                const statusText = link.is_used ? 'Sudah Dipakai' : (isExpired ? 'Kedaluwarsa' : 'Aktif / Belum Dipakai');

                return (
                  <div key={link.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 uppercase text-sm">{link.role}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColor}`}>{statusText}</span>
                      </div>
                      <p className="font-mono text-slate-500 text-xs bg-slate-100 p-1.5 rounded-md inline-block">{link.token}</p>
                    </div>
                    {!link.is_used && !isExpired && (
                      <button onClick={() => copyToClipboard(link.token)} className="mt-3 sm:mt-0 flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"><Copy className="w-4 h-4" /> Salin</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POINT RULES (KONVERSI HARGA/POIN) */}
      {activeTab === 'RULES' && (
        <div className="max-w-5xl">
          <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-2xl">
            <p className="text-blue-800 font-medium text-sm flex items-center gap-2">
              <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">i</span>
              Atur nilai tukar poin dari nasabah berdasarkan persentase kualitasnya.
            </p>
          </div>

          <form onSubmit={handleSaveGrades} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* KARTU GRADE A (Premium) */}
            <div className="bg-white rounded-[2rem] border-2 border-green-100 shadow-sm overflow-hidden relative transition-all hover:shadow-md">
              <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Kualitas Premium
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-100 p-2.5 rounded-xl"><TrendingUp className="w-6 h-6 text-green-600" /></div>
                  <h3 className="text-2xl font-extrabold text-slate-800">Grade A</h3>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-4">
                    Kategori ini berlaku untuk minyak jelantah dengan kualitas baik (Grade Good).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Poin Dasar per Liter</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-slate-400 font-bold text-xl">PTS</span>
                    <input 
                      type="number" 
                      value={gradeConfig.pointA}
                      onChange={(e) => setGradeConfig({...gradeConfig, pointA: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 pl-16 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xl text-green-600 focus:ring-2 focus:ring-green-500 outline-none" 
                      required min="1"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-4 mt-2 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 flex justify-center items-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                  <CheckCircle2 className="w-5 h-5" /> Simpan Konfigurasi Grade A
                </button>
              </div>
            </div>

            {/* KARTU GRADE B (Standar) */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-orange-100 p-2.5 rounded-xl"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
                  <h3 className="text-2xl font-extrabold text-slate-800">Grade B</h3>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-4">
                    Kategori ini berlaku untuk minyak jelantah dengan kualitas buruk (Grade Bad).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Poin Dasar per Liter</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-slate-400 font-bold text-xl">PTS</span>
                    <input 
                      type="number" 
                      value={gradeConfig.pointB}
                      onChange={(e) => setGradeConfig({...gradeConfig, pointB: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 pl-16 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xl text-orange-600 focus:ring-2 focus:ring-orange-500 outline-none" 
                      required min="1"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-4 mt-2 bg-slate-800 text-white rounded-xl font-bold text-lg hover:bg-slate-900 flex justify-center items-center gap-2 shadow-lg shadow-slate-800/20 active:scale-95 transition-all">
                  <Settings className="w-5 h-5" /> Simpan Konfigurasi Grade B
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* MODAL ACCEPT MITRA */}
      {acceptModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 p-3 rounded-full"><ShieldCheck className="w-6 h-6 text-orange-600" /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Aktivasi Mitra</h3>
                <p className="text-sm text-slate-500">Menyetujui: {acceptModal.name}</p>
              </div>
            </div>
            <form onSubmit={handleAcceptMitra} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Input Kode Device Fisik *</label>
                <input 
                  type="text" 
                  value={deviceCodeInput}
                  onChange={(e) => setDeviceCodeInput(e.target.value)}
                  placeholder="Contoh: DEV-001-SBY"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg focus:ring-2 focus:ring-orange-500 outline-none uppercase" 
                  required autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">Kode ini akan menghubungkan mitra dengan mesin IoT di lapangan.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAcceptModal({isOpen: false, id_user: '', name: ''})} className="w-1/2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                <button type="submit" className="w-1/2 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 shadow-lg">Setujui Mitra</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}