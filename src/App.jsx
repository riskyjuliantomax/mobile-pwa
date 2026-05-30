import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Scanner from './pages/Scanner';
import Review from './pages/Review';
import Archive from './pages/Archive';
import Outbox from './pages/Outbox';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { supabase } from './supabase';

// Komponen loading saat cek sesi
const LoadingScreen = () => (
  <div className="h-screen flex items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl animate-pulse shadow-[0_0_40px_rgba(99,102,241,0.5)]"></div>
      <p className="text-slate-400 text-sm font-medium">Memuat sesi...</p>
    </div>
  </div>
);

// Komponen untuk memproteksi rute yang butuh login
// eslint-disable-next-line react/prop-types
const ProtectedRoute = ({ children, session }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [session, setSession] = useState(undefined); // undefined = belum tahu, null = belum login

  useEffect(() => {
    const syncUser = async (user) => {
      try {
        const { email, user_metadata } = user;
        // Format waktu ke WIB (Asia/Jakarta)
        const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });

        // Cek apakah user sudah ada
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        let dbError = null;
        if (existingUser) {
          // Update
          const { error } = await supabase
            .from('users')
            .update({ last_login: now })
            .eq('email', email);
          dbError = error;
        } else {
          // Insert
          const { error } = await supabase
            .from('users')
            .insert([{
              email: email,
              nama_lengkap: user_metadata?.full_name || user_metadata?.name || '',
              role: 'User',
              last_login: now
            }]);
          dbError = error;
        }

        if (dbError) {
          console.error('Error syncing user to database:', dbError);
          // Hanya tampilkan alert jika bukan error 'kolom tidak ditemukan', 
          // supaya tidak terlalu mengganggu jika user belum buat kolomnya.
          if (!JSON.stringify(dbError).includes('Could not find')) {
            alert('Gagal sinkronisasi data user ke database: ' + dbError.message);
          }
        }
      } catch (err) {
        console.error('Failed to sync user:', err);
      }
    };

    // Cek sesi yang ada saat pertama kali app dibuka
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) syncUser(session.user);
    });

    // Dengarkan perubahan sesi (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) syncUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tampilkan loading saat status sesi belum diketahui
  if (session === undefined) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/scanner" replace /> : <Login />}
        />

        <Route path="/" element={
          <ProtectedRoute session={session}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/scanner" replace />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="review" element={<Review />} />
          <Route path="archive" element={<Archive />} />
          <Route path="outbox" element={<Outbox />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
