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
            <Image src="/logo2.png" alt="JelantaHUB Logo" width={180} height={50} priority className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-600">Hai, {userName}</span>
            <button 
              onClick={handleLogout} 
              className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}