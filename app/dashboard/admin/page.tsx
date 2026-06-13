"use client";

import { useState, useEffect } from 'react';
import { Users, Link as LinkIcon, Settings, CheckCircle2, XCircle, Copy, Plus, AlertTriangle, ShieldCheck, TrendingUp, MapPin, History, Droplet, Clock, Truck, ArrowRightLeft } from 'lucide-react';
import api from '../../lib/axios';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'USERS' | 'RULES' | 'MONITORING' | 'TRANSAKSI'>('USERS');
  const [activeTransactionTab, setActiveTransactionTab] = useState<'MENU' | 'PICKUP' | 'DEPOSIT' | 'EXCHANGE'>('MENU');
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any>({ pickupLogs: [], oilDeposits: [], pointExchanges: [] });
  
  // State Modal Accept Mitra
  const [acceptModal, setAcceptModal] = useState<{isOpen: boolean, id_user: string, name: string}>({isOpen: false, id_user: '', name: ''});
  const [deviceCodeInput, setDeviceCodeInput] = useState('');

  // State untuk Konfigurasi Poin 2-Grade
  const [gradeConfig, setGradeConfig] = useState({ pointA: 50, pointB: 10 });

  // State Modal Tambah Pengguna
  const [createUserModal, setCreateUserModal] = useState({
    isOpen: false,
    name: '',
    username: '',
    no_telp: '',
    password: '',
    role: 'pengepul'
  });

  const fetchData = async () => {
    try {
      const [resUsers, resRules, resDevices, resTransactions] = await Promise.all([
        api.get('/admin/dashboard?action=GET_USERS'),
        api.get('/admin/dashboard?action=GET_RULES'),
        api.get('/admin/dashboard?action=GET_DEVICES'),
        api.get('/admin/dashboard?action=GET_TRANSACTIONS')
      ]);
      setUsers(resUsers.data);
      setDevices(resDevices.data);
      setTransactions(resTransactions.data);

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

  const handleToggleUserStatus = async (id_user: string, name: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'menonaktifkan' : 'mengaktifkan';
    if (!window.confirm(`Yakin ingin ${actionText} pengguna ${name}?`)) return;

    try {
      await api.post('/admin/dashboard', {
        action: 'TOGGLE_USER_STATUS',
        id_user,
        is_active: !currentStatus
      });
      alert(`Pengguna berhasil ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}!`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah status pengguna.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, username, no_telp, password, role } = createUserModal;
    
    if (!name || !username || !password || !role) {
      return alert("Harap lengkapi form wajib!");
    }

    if (username.length > 20) {
      return alert("Username maksimal 20 karakter!");
    }

    if (name.length > 40) {
      return alert("Nama lengkap maksimal 40 karakter!");
    }

    if (no_telp && no_telp.length > 15) {
      return alert("Nomor telepon maksimal 15 karakter!");
    }

    if (password.length > 20) {
      return alert("Password maksimal 20 karakter!");
    }

    try {
      await api.post('/admin/dashboard', {
        action: 'CREATE_USER',
        name,
        username,
        no_telp,
        password,
        role
      });
      alert('Pengguna baru berhasil ditambahkan!');
      setCreateUserModal({ isOpen: false, name: '', username: '', no_telp: '', password: '', role: 'pengepul' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menambahkan pengguna baru.');
    }
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
    alert('Link disalin!');
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Pusat Kendali Admin</h1>
        <p className="text-slate-500 mt-1">Kelola Pengguna, Token Pendaftaran, dan Konfigurasi Sistem.</p>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-200/50 rounded-xl w-full border border-slate-200">
        <button onClick={() => setActiveTab('USERS')} className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'USERS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'}`}><Users className="w-4 h-4" /> Manajemen User</button>
        <button onClick={() => setActiveTab('RULES')} className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'RULES' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'}`}><Settings className="w-4 h-4" /> Konversi Harga</button>
        <button onClick={() => setActiveTab('MONITORING')} className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'MONITORING' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'}`}><MapPin className="w-4 h-4" /> Monitoring Lapangan</button>
        <button onClick={() => setActiveTab('TRANSAKSI')} className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'TRANSAKSI' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-300/50'}`}><History className="w-4 h-4" /> Histori Transaksi</button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Daftar Pengguna</h2>
            <button 
              onClick={() => setCreateUserModal({ isOpen: true, name: '', username: '', no_telp: '', password: '', role: 'pengepul' })}
              className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Tambah Pengguna
            </button>
          </div>
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b-2 border-slate-100 text-slate-400 text-sm">
                  <th className="pb-3 font-bold">Nama & Role</th>
                  <th className="pb-3 font-bold">Username / Telp</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {users.map(user => (
                  <tr key={user.id_user} className="block md:table-row border border-slate-200 md:border-b md:border-x-0 md:border-t-0 rounded-2xl p-4 mb-4 md:mb-0 md:p-0 hover:bg-slate-50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4">
                      <div className="md:hidden font-bold text-xs text-slate-400 mb-1">Nama & Role</div>
                      <div className="text-right md:text-left">
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <span className="text-xs font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md inline-block mt-1">{user.role}</span>
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 text-sm text-slate-600 border-t border-slate-100 md:border-none">
                      <div className="md:hidden font-bold text-xs text-slate-400">Kontak</div>
                      <div className="text-right md:text-left">
                        <p className="font-semibold text-slate-700">{user.username}</p>
                        <p className="text-xs text-slate-400">{user.no_telp || '-'}</p>
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-2 md:py-4 border-t border-slate-100 md:border-none">
                      <div className="md:hidden font-bold text-xs text-slate-400">Status</div>
                      <div className="flex justify-end md:justify-start">
                        {user.is_active ? (
                          <span className="flex w-fit items-center gap-1 bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Aktif</span>
                        ) : user.role === 'mitra' && user.devices?.some((d: any) => d.device_code?.startsWith('P-')) ? (
                          <span className="flex w-fit items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold"><AlertTriangle className="w-3.5 h-3.5" /> Menunggu</span>
                        ) : (
                          <span className="flex w-fit items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> Nonaktif</span>
                        )}
                      </div>
                    </td>
                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 border-t border-slate-100 md:border-none text-right">
                      <div className="md:hidden font-bold text-xs text-slate-400">Aksi</div>
                      <div className="flex justify-end gap-2">
                        {!user.is_active && user.role === 'mitra' && user.devices?.some((d: any) => d.device_code?.startsWith('P-')) ? (
                          <>
                            <button onClick={() => setAcceptModal({isOpen: true, id_user: user.id_user, name: user.name})} className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-700">Accept</button>
                            <button onClick={() => handleRejectOrDeleteUser(user.id_user, user.name)} className="bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100">Reject</button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleToggleUserStatus(user.id_user, user.name, user.is_active)} 
                              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${user.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                            >
                              {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button onClick={() => handleRejectOrDeleteUser(user.id_user, user.name)} className="bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100">Hapus</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRATION LINKS REMOVED */}

      {/* TAB 3: POINT RULES (KONVERSI HARGA/POIN) */}
      {activeTab === 'RULES' && (
        <div className="max-w-5xl">
          <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-2xl">
            <p className="text-blue-800 font-medium text-sm flex items-center gap-2">
              <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">i</span>
              Atur nilai tukar poin dari nasabah berdasarkan persentase kualitasnya.
            </p>
          </div>

          <form onSubmit={handleSaveGrades} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
            <div className="bg-slate-800 p-8 text-white">
              <h3 className="text-2xl font-extrabold flex items-center gap-3"><Settings className="w-6 h-6 text-orange-400" /> Konfigurasi Poin Nasional</h3>
              <p className="text-slate-300 mt-2 text-sm font-medium">Tetapkan rate poin dasar yang didapatkan nasabah per liter minyak jelantah.</p>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* GRADE A */}
              <div className="space-y-5 bg-green-50/50 p-6 rounded-2xl border border-green-100 relative hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Premium</div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2.5 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                  <h4 className="font-extrabold text-slate-800 text-lg">Grade A (Bagus)</h4>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Berlaku untuk minyak jelantah kualitas jernih / standar konsumsi bekas.</p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Poin per Liter</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-lg">PTS</span>
                    <input 
                      type="number" 
                      value={gradeConfig.pointA}
                      onChange={(e) => setGradeConfig({...gradeConfig, pointA: parseInt(e.target.value, 10) || 0})}
                      className="w-full p-3.5 pl-14 bg-white border-2 border-green-200 rounded-xl font-extrabold text-xl text-green-700 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                      required min="1"
                    />
                  </div>
                </div>
              </div>

              {/* GRADE B */}
              <div className="space-y-5 bg-orange-50/50 p-6 rounded-2xl border border-orange-100 relative hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Standar</div>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2.5 rounded-xl"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                  <h4 className="font-extrabold text-slate-800 text-lg">Grade B (Buruk)</h4>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Berlaku untuk minyak jelantah berwarna gelap / kotor pekat.</p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Poin per Liter</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-lg">PTS</span>
                    <input 
                      type="number" 
                      value={gradeConfig.pointB}
                      onChange={(e) => setGradeConfig({...gradeConfig, pointB: parseInt(e.target.value, 10) || 0})}
                      className="w-full p-3.5 pl-14 bg-white border-2 border-orange-200 rounded-xl font-extrabold text-xl text-orange-700 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                      required min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 mt-2 flex justify-end">
              <button type="submit" className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all">
                <CheckCircle2 className="w-6 h-6" /> Simpan Konfigurasi Harga
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MONITORING LAPANGAN */}
      {activeTab === 'MONITORING' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((device) => {
            const isDeviceCritical = device.jerigens?.some((j: any) => (j.current_volume / j.max_capacity) >= 0.8);
            return (
              <div key={device.id_device} className={`bg-white rounded-[1.5rem] overflow-hidden shadow-sm border-2 transition-all ${isDeviceCritical ? 'border-red-400' : 'border-slate-100'}`}>
                <div className={`p-5 border-b ${isDeviceCritical ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{device.location_name}</h3>
                      <p className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">Mitra: {device.mitra?.name}</p>
                    </div>
                    {isDeviceCritical && (
                      <span className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> Kritis
                      </span>
                    )}
                  </div>
                </div>
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
                            <span className="font-bold text-slate-500">{pct.toFixed(0)}% ({jerigen.current_volume.toFixed(1)}L)</span>
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

      {/* TAB 5: HISTORI TRANSAKSI */}
      {activeTab === 'TRANSAKSI' && (
        <div className="space-y-6">
          {activeTransactionTab === 'MENU' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div 
                onClick={() => setActiveTransactionTab('PICKUP')}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
              >
                <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Truck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Penjemputan Pengepul</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Riwayat pengambilan minyak jelantah dari tangki mesin oleh tim pengepul.</p>
                <div className="mt-8 flex items-center text-blue-600 font-bold text-sm">
                  Lihat Riwayat <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 2 */}
              <div 
                onClick={() => setActiveTransactionTab('DEPOSIT')}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 cursor-pointer hover:border-green-500 hover:shadow-lg transition-all group"
              >
                <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Droplet className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Setoran Nasabah</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Data riwayat penyetoran minyak jelantah oleh nasabah beserta perolehan poin.</p>
                <div className="mt-8 flex items-center text-green-600 font-bold text-sm">
                  Lihat Riwayat <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 3 */}
              <div 
                onClick={() => setActiveTransactionTab('EXCHANGE')}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 cursor-pointer hover:border-orange-500 hover:shadow-lg transition-all group"
              >
                <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Penukaran Poin</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Daftar transaksi nasabah yang menukar poin dengan barang reward dari mitra.</p>
                <div className="mt-8 flex items-center text-orange-600 font-bold text-sm">
                  Lihat Riwayat <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button 
                onClick={() => setActiveTransactionTab('MENU')}
                className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900 transition-colors bg-white px-5 py-3 rounded-xl border border-slate-200 w-fit shadow-sm hover:bg-slate-50"
              >
                &larr; Kembali ke Menu Transaksi
              </button>

              {activeTransactionTab === 'PICKUP' && (
                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3"><Truck className="w-7 h-7 text-blue-500" /> Riwayat Penjemputan Pengepul</h3>
                  <div className="space-y-4">
                    {transactions.pickupLogs.length === 0 && <p className="text-slate-500 text-center py-10 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">Tidak ada data riwayat.</p>}
                    {transactions.pickupLogs.map((log: any) => (
                      <div key={log.id_pickup} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-4">
                        <div className="flex gap-4">
                          <div className="bg-blue-50 p-3 rounded-xl h-fit hidden sm:block"><Truck className="w-6 h-6 text-blue-500" /></div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg mb-1">{log.pengepul?.name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                        <div className="flex items-end justify-between md:justify-end gap-6 md:text-right bg-white md:bg-transparent p-4 md:p-0 rounded-xl border md:border-none border-slate-100">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Lokasi & Tangki</p>
                            <p className="font-bold text-slate-700">{log.device?.location_name}</p>
                            <p className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mt-1 inline-block">{log.jerigen_code}</p>
                          </div>
                          <div className="text-right border-l md:border-l-0 border-slate-100 pl-4 md:pl-0">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Volume Diambil</p>
                            <p className="font-extrabold text-blue-600 text-2xl">{log.volume_taken}L</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTransactionTab === 'DEPOSIT' && (
                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3"><Droplet className="w-7 h-7 text-green-500" /> Riwayat Setoran Nasabah</h3>
                  <div className="space-y-4">
                    {transactions.oilDeposits.length === 0 && <p className="text-slate-500 text-center py-10 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">Tidak ada data riwayat.</p>}
                    {transactions.oilDeposits.map((dep: any) => (
                      <div key={dep.id_deposit} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-4">
                        <div className="flex gap-4">
                          <div className="bg-green-50 p-3 rounded-xl h-fit hidden sm:block"><Droplet className="w-6 h-6 text-green-500" /></div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg mb-1">{dep.nasabah?.name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(dep.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-end justify-between md:justify-end gap-4 md:gap-8 bg-white md:bg-transparent p-4 md:p-0 rounded-xl border md:border-none border-slate-100">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Lokasi Setor</p>
                            <p className="font-bold text-slate-700">{dep.device?.location_name}</p>
                          </div>
                          <div className="text-left md:text-right border-l md:border-l-0 border-slate-100 pl-4 md:pl-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Kualitas</p>
                            <p className="font-bold text-slate-700">{dep.quality_score >= 50 ? '🟢 Bagus' : '🔴 Standar'}</p>
                          </div>
                          <div className="text-right border-l md:border-l-0 border-slate-100 pl-4 md:pl-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                            <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1">Volume & Hasil Poin</p>
                            <div className="flex items-baseline justify-end gap-2">
                              <p className="font-extrabold text-slate-700 text-xl">{dep.volume}L</p>
                              <p className="text-sm font-extrabold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">+{dep.point_earned} PTS</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTransactionTab === 'EXCHANGE' && (
                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3"><ArrowRightLeft className="w-7 h-7 text-orange-500" /> Riwayat Penukaran Poin</h3>
                  <div className="space-y-4">
                    {transactions.pointExchanges.length === 0 && <p className="text-slate-500 text-center py-10 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">Tidak ada data riwayat.</p>}
                    {transactions.pointExchanges.map((exc: any) => (
                      <div key={exc.id_exchange} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors gap-4">
                        <div className="flex gap-4">
                          <div className="bg-orange-50 p-3 rounded-xl h-fit hidden sm:block"><ArrowRightLeft className="w-6 h-6 text-orange-500" /></div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg mb-1">{exc.nasabah?.name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(exc.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-end justify-between md:justify-end gap-4 md:gap-8 bg-white md:bg-transparent p-4 md:p-0 rounded-xl border md:border-none border-slate-100">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Item Ditukar</p>
                            <p className="font-bold text-slate-700">{exc.item?.item_name} <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded ml-1 text-slate-600">x{exc.quantity}</span></p>
                          </div>
                          <div className="text-left md:text-right border-l md:border-l-0 border-slate-100 pl-4 md:pl-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
                            <p className={`font-bold text-sm uppercase ${exc.status === 'completed' ? 'text-green-600' : (exc.status === 'cancelled' ? 'text-red-600' : 'text-orange-600')}`}>
                              {exc.status}
                            </p>
                          </div>
                          <div className="text-right border-l md:border-l-0 border-slate-100 pl-4 md:pl-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-1">Poin Digunakan</p>
                            <p className="font-extrabold text-orange-600 text-xl bg-orange-50 px-3 py-1 rounded-xl inline-block">-{exc.total_points_used} PTS</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
                  maxLength={10}
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

      {/* MODAL TAMBAH PENGGUNA */}
      {createUserModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-slate-100 p-3 rounded-full"><Plus className="w-6 h-6 text-slate-800" /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Tambah Pengguna</h3>
                <p className="text-sm text-slate-500 font-medium">Buat akun untuk Admin atau Pengepul baru</p>
              </div>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap *</label>
                <input 
                  type="text" 
                  value={createUserModal.name}
                  onChange={(e) => setCreateUserModal({...createUserModal, name: e.target.value})}
                  maxLength={40}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none font-semibold text-slate-700" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Username *</label>
                <input 
                  type="text" 
                  value={createUserModal.username}
                  onChange={(e) => setCreateUserModal({...createUserModal, username: e.target.value})}
                  maxLength={20}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none font-semibold text-slate-700" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nomor Telepon (Opsional)</label>
                <input 
                  type="text" 
                  value={createUserModal.no_telp}
                  onChange={(e) => setCreateUserModal({...createUserModal, no_telp: e.target.value})}
                  maxLength={15}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none font-semibold text-slate-700" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Password *</label>
                <input 
                  type="password" 
                  value={createUserModal.password}
                  onChange={(e) => setCreateUserModal({...createUserModal, password: e.target.value})}
                  maxLength={20}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none font-semibold text-slate-700" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
                <select 
                  value={createUserModal.role}
                  onChange={(e) => setCreateUserModal({...createUserModal, role: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none font-bold text-slate-700"
                >
                  <option value="pengepul">Pengepul</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setCreateUserModal({...createUserModal, isOpen: false})} className="w-1/2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                <button type="submit" className="w-1/2 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 shadow-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}