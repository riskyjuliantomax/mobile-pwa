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

      {/* Main Content - stretch to fill, nav positioned fixed below */}
      <main className="flex-1 overflow-y-auto z-10 relative">
        <Outlet />
      </main>

      {/* Bottom Navigation - Minimal Compact Design */}
      <div className="fixed bottom-0 w-full z-30">
        <nav className="flex justify-around items-center px-1.5 py-1 safe-area-inset-bottom gap-0.5 bg-white/60 backdrop-blur-xl border-t border-white/20">
          
          {/* Scan, Archive, Outbox */}
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className="flex-1">
              {({ isActive }) => (
                <div className={`flex flex-col items-center justify-center rounded-lg transition-all duration-200 min-h-12 ${
                  isActive
                    ? 'text-indigo-600 bg-indigo-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                  <Icon size={18} strokeWidth={2} />
                  {badge && !isActive && (
                    <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>
                  )}
                </div>
              )}
            </NavLink>
          ))}

          {/* Profile Tab */}
          <NavLink to="/profile" className="flex-1">
            {({ isActive }) => (
              <div className={`flex flex-col items-center justify-center rounded-lg transition-all duration-200 min-h-12 ${
                isActive
                  ? 'text-indigo-600 bg-indigo-100'
                  : 'text-slate-400 hover:text-slate-600'
              }`}>
                {isActive ? (
                  <UserCircle2 size={18} strokeWidth={2} />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="profile" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-[7px] font-black">
                    {initials}
                  </div>
                )}
              </div>
            )}
          </NavLink>

        </nav>
      </div>

      {/* Safe area padding for bottom nav */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
};

export default Layout;
