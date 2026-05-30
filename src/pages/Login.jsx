import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Bersihkan sesi lama terlebih dahulu
      await supabase.auth.signOut();

      const redirectTo = `${window.location.origin}/scanner`;
      console.log('[Login] redirectTo:', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Paksa tampilkan pilih akun
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      setError('Gagal login. Pastikan koneksi internet Anda stabil dan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute top-[10%] right-[-20%] w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[30%] w-80 h-80 bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-[0_0_60px_rgba(99,102,241,0.6)] flex items-center justify-center mb-6 rotate-3">
            <Sparkles className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            STB <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Vision</span>
          </h1>
          <p className="text-slate-400 text-center text-sm max-w-[220px] leading-relaxed">
            Sistem Digital Serah Terima Barang berbasis AI
          </p>
        </div>

        {/* Login Card (Glass) */}
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
          <h2 className="text-white font-bold text-xl mb-1">Selamat Datang</h2>
          <p className="text-slate-400 text-sm mb-8">Masuk menggunakan akun Google perusahaan Anda</p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 mb-4 text-center">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 disabled:opacity-70 text-slate-800 font-bold py-4 px-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-95 shadow-lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>{loading ? 'Menghubungkan ke Google...' : 'Lanjutkan dengan Google'}</span>
          </button>
        </div>

        <p className="text-slate-600 text-xs mt-8 text-center px-4 max-w-xs">
          Dengan masuk, Anda mengizinkan akses ke akun Google Anda untuk sistem STB Vision.
        </p>
      </div>
    </div>
  );
};

export default Login;
