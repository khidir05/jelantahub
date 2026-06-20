"use client";

import { useRouter } from "next/navigation";
import { LogOut, Bell, Check, Info, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  
  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) setUserName(name);

    fetchNotifications();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', id_notification: id })
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' })
      });
      fetchNotifications();
      setIsDropdownOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus semua notifikasi?")) return;
    try {
      await fetch('/api/notifications?action=all', {
        method: 'DELETE'
      });
      fetchNotifications();
      setIsDropdownOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch(err) {
      console.error(err);
    }
    localStorage.clear(); 
    window.location.href = "/login";
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Image src="/logo2.png" alt="JelantaHUB Logo" width={180} height={50} priority className="h-8 sm:h-10 w-auto" />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-sm">Notifikasi</h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors">
                          <Check className="w-3 h-3" /> Dibaca
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={deleteAllNotifications} className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 transition-colors">
                          <Trash2 className="w-3 h-3" /> Hapus semua
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div 
                          key={notif.id_notification} 
                          onClick={() => {
                            if (!notif.is_read) markAsRead(notif.id_notification);
                            if (notif.link) router.push(notif.link);
                          }}
                          className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 flex gap-3 relative group ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="mt-1 flex-shrink-0">
                            {getIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <p className={`text-sm leading-tight ${!notif.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{notif.message}</p>
                            <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                              {new Date(notif.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                            </span>
                          </div>
                          
                          {/* Action overlay container */}
                          <div className="absolute right-3 top-4 flex flex-col items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id_notification);
                              }}
                              className="text-slate-300 hover:text-red-500 hover:bg-slate-100 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Hapus Notifikasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {!notif.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        Belum ada notifikasi
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:block">Keluar</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 md:mb-8">
           <span className="inline-flex items-center bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-extrabold border border-orange-200 shadow-sm">
             Halo, {userName} 👋
           </span>
        </div>
        {children}
      </main>
    </div>
  );
}