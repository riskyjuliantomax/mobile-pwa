import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';

const Scanner = () => {
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('camera');
  const [userInfo, setUserInfo] = useState({ name: '...', email: '', role: '...', avatar: null });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const googleName = session.user.user_metadata?.full_name || session.user.email;
      const googleAvatar = session.user.user_metadata?.avatar_url || null;
      const email = session.user.email;

      // Ambil role dari tabel users di database
      const { data: dbUser } = await supabase
        .from('users')
        .select('nama_lengkap, role')
        .eq('email', email)
        .single();

      setUserInfo({
        name: dbUser?.nama_lengkap || googleName,
        email,
        role: dbUser?.role || 'User',
        avatar: googleAvatar,
      });
    };
    fetchUser();
  }, []);

  const processImage = async (imageFile) => {
    setIsProcessing(true);
    try {
      const options = {
        maxSizeMB: 2.5,
        maxWidthOrHeight: 3000,
        useWebWorker: true,
        initialQuality: 0.95,
      };
      const compressedFile = await imageCompression(imageFile, options);
      
      const rawBackend = import.meta.env.VITE_BACKEND_URL || '';
      const backendBase = rawBackend && !/^https?:\/\//i.test(rawBackend) ? `https://${rawBackend}` : rawBackend;
      const endpoint = backendBase ? `${backendBase.replace(/\/$/, '')}/api/process-stb` : '/api/process-stb';

      // Send to Backend for OCR
      const formData = new FormData();
      formData.append('image', compressedFile);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      console.log('process-stb response:', { status: response.status, ok: response.ok, body: responseText });
      if (!response.ok) {
        throw new Error(backendBase + `Server error ${response.status}: ${responseText || 'Tidak ada respon'}`);
      }

      let result = null;
      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch (parseErr) {
          throw new Error(`Invalid JSON from server (status ${response.status}): ${responseText}`);
        }
      } else {
        throw new Error(`Empty response from server (status ${response.status})`);
      }

      if (result.success) {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          navigate('/review', { 
            state: { 
              imageData: reader.result,
              noPermintaan: result.data.noPermintaan,
              namaKapal: result.data.namaKapal,
              namaBarang: result.data.namaBarang,
              imageFile: compressedFile // Pass the actual file for the next step
            } 
          });
        };
      } else {
        throw new Error(result.error || 'Gagal memproses OCR');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Gagal memproses gambar: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'stb_capture.jpg', { type: 'image/jpeg' });
          processImage(file);
        });
    }
  }, [webcamRef]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-900 relative overflow-hidden">
      {/* Header with User Info */}
      <div className="glass-dark text-white p-4 flex justify-between items-center absolute top-0 w-full z-20">
        <div>
          <p className="text-slate-400 text-xs font-medium">Selamat datang,</p>
          <h1 className="font-black text-lg flex items-center gap-2 leading-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            <Sparkles className="text-indigo-400 flex-shrink-0" size={18} />
            STB Vision
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-white text-sm font-bold leading-none">{userInfo.name}</p>
            <p className="text-slate-400 text-[10px] mt-0.5">{userInfo.role}</p>
          </div>
          {userInfo.avatar ? (
            <img src={userInfo.avatar} alt={userInfo.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-white/20" />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-indigo-900/50 flex-shrink-0">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
        {mode === 'camera' ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={1}
              videoConstraints={{
                facingMode: { ideal: 'environment' },
                width: { ideal: 3840 },
                height: { ideal: 2160 },
                aspectRatio: { ideal: 16/9 }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Futuristic Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center px-8">

              {/* Frame utama */}
              <div className="w-full h-[55%] relative">

                {/* Outer glow ring - removed heavy shadow */}
                <div className="absolute inset-0 rounded-3xl border border-indigo-500/30"></div>

                {/* Frame border tipis */}
                <div className="absolute inset-0 rounded-3xl border border-white/10"></div>

                {/* Titik sudut kecil */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-purple-400 rounded-full"></div>

                {/* Area tengah gelap transparan */}
                <div className="absolute inset-0 rounded-3xl bg-black/10 border border-white/10"></div>
              </div>

            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-8 relative">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            
            <div className="glass-dark p-8 rounded-3xl flex flex-col items-center border border-white/10 z-10 w-full max-w-sm">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                <ImageIcon size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Upload Galeri</h2>
              <p className="text-center mb-8 text-slate-400 text-sm">Pilih foto STB yang sudah Anda simpan di perangkat.</p>
              
              <label className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-4 rounded-2xl font-bold cursor-pointer transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95">
                <ImageIcon size={20} />
                Pilih Foto
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 glass-dark flex flex-col items-center justify-center z-30">
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="text-indigo-400 animate-pulse" size={24} />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Menganalisis Foto...</h3>
            <p className="text-indigo-300 text-sm">AI sedang membaca data STB</p>
          </div>
        )}
      </div>

      {/* Capture Button Area (only for camera mode) */}
      {mode === 'camera' && (
        <div className="fixed bottom-0 w-full flex flex-col items-center z-20 pointer-events-none"
          style={{ paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 16px))' }}
        >
          <div className="flex items-center justify-center gap-12 pointer-events-auto">
            {/* Spacer to balance the layout */}
            <div className="w-12"></div>
            
            {/* Shutter button */}
            <button
              onClick={capturePhoto}
              disabled={isProcessing}
              className="w-[78px] h-[78px] bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform active:scale-90 border-2 border-white/40 group"
            >
              <div className="w-[62px] h-[62px] bg-white rounded-full shadow-inner flex items-center justify-center transition-all group-hover:scale-95 group-active:scale-90">
                <div className="w-[52px] h-[52px] border-[3px] border-indigo-500/60 rounded-full"></div>
              </div>
            </button>

            {/* Gallery Button */}
            <button
              onClick={() => setMode('gallery')}
              className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white transition active:scale-95 hover:bg-white/20"
            >
              <ImageIcon size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
