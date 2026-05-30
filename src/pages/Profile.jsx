import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Shield, ChevronRight, HelpCircle, Info, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Ambil data user dari sesi Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  const userEmail = user?.email || '-';
  const userName = user?.user_metadata?.full_name
    || userEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const userAvatar = user?.user_metadata?.avatar_url;

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      setLoggingOut(false);
    } else {
      // App.jsx akan otomatis deteksi session null dan redirect ke /login
      navigate('/login', { replace: true });
    }
  };

  const menuItems = [
    { icon: <Bell size={18} />, label: 'Notifikasi', desc: 'Atur notifikasi pengiriman', color: 'bg-purple-100 text-purple-600' },
    { icon: <Shield size={18} />, label: 'Keamanan & Privasi', desc: 'Kelola izin akun', color: 'bg-blue-100 text-blue-600' },
    { icon: <HelpCircle size={18} />, label: 'Bantuan', desc: 'Panduan penggunaan aplikasi', color: 'bg-green-100 text-green-600' },
    { icon: <Info size={18} />, label: 'Tentang Aplikasi', desc: 'STB Vision v1.0.0', color: 'bg-slate-100 text-slate-600' },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Profile Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 px-6 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-48 h-48 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-white/5 rounded-full"></div>

        <div className="flex items-center gap-4 relative z-10">
          {/* Avatar dari Google */}
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-20 h-20 rounded-2xl shadow-xl object-cover flex-shrink-0 border-2 border-white/30"
            />
          ) : (
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-3xl font-black text-indigo-600 flex-shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-white font-black text-xl leading-tight">{userName}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{userEmail}</p>
            <span className="inline-block mt-2 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
              👷 User Lapangan
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-8 mb-6">
        <div className="glass rounded-2xl p-4 grid grid-cols-3 divide-x divide-slate-200">
          <div className="flex flex-col items-center px-2">
            <p className="text-2xl font-black text-slate-800">-</p>
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wide">Total STB</p>
          </div>
          <div className="flex flex-col items-center px-2">
            <p className="text-2xl font-black text-indigo-600">-</p>
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wide">Kapal</p>
          </div>
          <div className="flex flex-col items-center px-2">
            <p className="text-2xl font-black text-emerald-600">-</p>
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wide">Outbox</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-2 mb-6">
        {menuItems.map((item, i) => (
          <button key={i} className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-transform">
            <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              {item.icon}
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-800 text-sm">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="px-4 pb-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border border-red-100 transition-all active:scale-95"
        >
          {loggingOut
            ? <Loader2 size={18} className="animate-spin" />
            : <LogOut size={18} />
          }
          {loggingOut ? 'Keluar...' : 'Keluar dari Akun'}
        </button>
      </div>
    </div>
  );
};

export default Profile;
