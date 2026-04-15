"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Users, Link as LinkIcon, Settings, CheckCircle2, XCircle, Copy, Plus, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../../lib/axios';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'USERS' | 'LINKS' | 'RULES'>('USERS');
  const [users, setUsers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  
  // State Modal Accept Mitra
  const [acceptModal, setAcceptModal] = useState<{isOpen: boolean, id_user: string, name: string}>({isOpen: false, id_user: '', name: ''});
  const [deviceCodeInput, setDeviceCodeInput] = useState('');

  const { data: resUsers, mutate: mutateUsers } = useSWR('/admin/dashboard?action=GET_USERS', fetcher, { refreshInterval: 5000 });
  const { data: resLinks, mutate: mutateLinks } = useSWR('/admin/dashboard?action=GET_LINKS', fetcher, { refreshInterval: 5000 });
  const { data: resRules, mutate: mutateRules } = useSWR('/admin/dashboard?action=GET_RULES', fetcher, { refreshInterval: 5000 });

  useEffect(() => {
    if (resUsers) setUsers(resUsers);
    if (resLinks) setLinks(resLinks);
    if (resRules) setRules(resRules);
  }, [resUsers, resLinks, resRules]);

  const fetchData = () => {
    mutateUsers();
    mutateLinks();
    mutateRules();
  };

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

  const handleCreateRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await api.post('/admin/dashboard', {
        action: 'CREATE_RULE',
        min_quality: formData.get('min'),
        max_quality: formData.get('max'),
        point_per_liter: formData.get('point'),
        multiplier: formData.get('multiplier')
      });
      e.currentTarget.reset();
      fetchData();
    } catch (err) { alert('Gagal membuat aturan poin'); }
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
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-fit border border-slate-200 overflow-x-auto">
        <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'USERS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Users className="w-4 h-4" /> Manajemen User</button>
        <button onClick={() => setActiveTab('LINKS')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'LINKS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><LinkIcon className="w-4 h-4" /> Token Registrasi</button>
        <button onClick={() => setActiveTab('RULES')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'RULES' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Settings className="w-4 h-4" /> Aturan Poin</button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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
                  <option value="nasabah">Nasabah (Jalur Khusus)</option>
                  <option value="mitra">Mitra (Jalur Khusus)</option>
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

      {/* TAB 3: POINT RULES */}
      {activeTab === 'RULES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-orange-500" /> Tambah Aturan Poin</h3>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Min. Kualitas</label>
                  <input type="number" name="min" step="0.1" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Max. Kualitas</label>
                  <input type="number" name="max" step="0.1" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Poin per Liter</label>
                <input type="number" name="point" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-orange-600 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Multiplier (Bonus)</label>
                <input type="number" name="multiplier" defaultValue="1.0" step="0.1" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900">Simpan Aturan</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Tabel Konfigurasi Poin Aktif</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-400 text-sm">
                    <th className="pb-3 font-bold">Rentang Kualitas (Skor)</th>
                    <th className="pb-3 font-bold">Poin Dasar (/L)</th>
                    <th className="pb-3 font-bold">Multiplier</th>
                    <th className="pb-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id_rule} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-4 font-bold text-slate-700">{rule.min_quality} - {rule.max_quality}</td>
                      <td className="py-4 font-extrabold text-orange-500">{rule.point_per_liter} PTS</td>
                      <td className="py-4 font-mono text-slate-500">x{rule.multiplier}</td>
                      <td className="py-4">
                        {rule.is_active ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Aktif</span> : <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold">Inaktif</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                <p className="text-xs text-slate-500 mt-2">Kode ini akan menggantikan status PENDING dan menghubungkan mitra dengan mesin IoT di lapangan.</p>
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