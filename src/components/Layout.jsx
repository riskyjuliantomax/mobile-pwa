import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Camera, FolderArchive, Send, UserCircle2 } from 'lucide-react';
import { supabase } from '../supabase';

const Layout = () => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [initials, setInitials] = useState('U');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
        const name = session.user.user_metadata?.full_name || session.user.email || 'U';
        setInitials(name.charAt(0).toUpperCase());
      }
    });
  }, []);

  const navItems = [
    { to: '/scanner', icon: Camera, label: 'Scan' },
    { to: '/archive', icon: FolderArchive, label: 'Arsip' },
    { to: '/outbox', icon: Send, label: 'Outbox', badge: true },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-48 h-48 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>

      {/* Main Content - overflow-hidden agar Scanner bisa full height, halaman lain scroll sendiri */}
      <main className="flex-1 overflow-hidden z-10 relative">
        <Outlet />
      </main>

      {/* Bottom Navigation (Floating Glass) - 4 tabs */}
      <div className="fixed bottom-0 w-full p-2 pb-safe z-30 pointer-events-none">
        <nav className="glass rounded-2xl flex justify-around p-1.5 pointer-events-auto shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)]">
          
          {/* Scan, Archive, Outbox */}
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <span className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-300 relative ${
                  isActive
                    ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-200 scale-105'
                    : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
                }`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] font-bold mt-1 leading-none ${isActive ? 'block' : 'hidden'}`}>{label}</span>
                  {badge && !isActive && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>
                  )}
                </span>
              )}
            </NavLink>
          ))}

          {/* Profile Tab (with avatar from Supabase) */}
          <NavLink to="/profile">
            {({ isActive }) => (
              <span className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-200 scale-105'
                  : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
              }`}>
                {isActive ? (
                  <UserCircle2 size={20} strokeWidth={2.5} />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="profile" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                    {initials}
                  </div>
                )}
                <span className={`text-[10px] font-bold mt-1 leading-none ${isActive ? 'block' : 'hidden'}`}>Profil</span>
              </span>
            )}
          </NavLink>

        </nav>
      </div>
    </div>
  );
};

export default Layout;
