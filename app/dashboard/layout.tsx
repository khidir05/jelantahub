"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) setUserName(name);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch(err) {
      console.error(err);
    }
    localStorage.clear(); 
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Image src="/logo2.png" alt="JelantaHUB Logo" width={180} height={50} priority className="h-8 sm:h-10 w-auto" />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
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