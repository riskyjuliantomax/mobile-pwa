import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';

const Scanner = () => {
  const webcamRef = useRef(null);
  const cropContainerRef = useRef(null);
  const previewRef = useRef(null);
  const lastPointerEventRef = useRef(null);
  const rafPendingRef = useRef(false);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingImage, setEditingImage] = useState(null); // data URL for editor
  const [editingBlob, setEditingBlob] = useState(null); // original blob
  const [rotation, setRotation] = useState(0); // degrees
  const [cropTop, setCropTop] = useState(60); // pixels from top
  const [cropRight, setCropRight] = useState(60); // pixels from right
  const [cropBottom, setCropBottom] = useState(60); // pixels from bottom
  const [cropLeft, setCropLeft] = useState(60); // pixels from left
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState(null); // which handle is being dragged
  const [editorError, setEditorError] = useState('');

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

  // Prevent body/html scroll when editor is open
  useEffect(() => {
    if (isEditorOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isEditorOpen]);

  useEffect(() => {
    const clearDrag = () => setDraggingHandle(null);
    if (isEditorOpen) {
      window.addEventListener('pointerup', clearDrag);
      window.addEventListener('pointercancel', clearDrag);
    }
    return () => {
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, [isEditorOpen]);

  const applyPointerMove = (event) => {
    if (!draggingHandle) return;
    const container = cropContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const deltaX = event.clientX - rect.left;
    const deltaY = event.clientY - rect.top;
    const minCrop = 0;
    const minVisible = 40;
    const maxLeft = rect.width - cropRight - minVisible;
    const maxRight = rect.width - cropLeft - minVisible;
    const maxTop = rect.height - cropBottom - minVisible;
    const maxBottom = rect.height - cropTop - minVisible;

    if (draggingHandle === 'top-left') {
      setCropTop(Math.max(minCrop, Math.min(maxTop, deltaY)));
      setCropLeft(Math.max(minCrop, Math.min(maxLeft, deltaX)));
    } else if (draggingHandle === 'top-right') {
      setCropTop(Math.max(minCrop, Math.min(maxTop, deltaY)));
      setCropRight(Math.max(minCrop, Math.min(maxRight, rect.width - deltaX)));
    } else if (draggingHandle === 'bottom-left') {
      setCropBottom(Math.max(minCrop, Math.min(maxBottom, rect.height - deltaY)));
      setCropLeft(Math.max(minCrop, Math.min(maxLeft, deltaX)));
    } else if (draggingHandle === 'bottom-right') {
      setCropBottom(Math.max(minCrop, Math.min(maxBottom, rect.height - deltaY)));
      setCropRight(Math.max(minCrop, Math.min(maxRight, rect.width - deltaX)));
    } else if (draggingHandle === 'top') {
      setCropTop(Math.max(minCrop, Math.min(maxTop, deltaY)));
    } else if (draggingHandle === 'bottom') {
      setCropBottom(Math.max(minCrop, Math.min(maxBottom, rect.height - deltaY)));
    } else if (draggingHandle === 'left') {
      setCropLeft(Math.max(minCrop, Math.min(maxLeft, deltaX)));
    } else if (draggingHandle === 'right') {
      setCropRight(Math.max(minCrop, Math.min(maxRight, rect.width - deltaX)));
    }
  };

  const handleEditorPointerMove = useCallback((event) => {
    // throttle pointer move using requestAnimationFrame to improve responsiveness
    event.preventDefault && event.preventDefault();
    lastPointerEventRef.current = event;
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      const ev = lastPointerEventRef.current;
      if (ev) applyPointerMove(ev);
    });
  }, [draggingHandle, cropLeft, cropRight, cropTop, cropBottom]);

  useEffect(() => {
    if (!isEditorOpen) return undefined;
    if (!draggingHandle) return undefined;

    window.addEventListener('pointermove', handleEditorPointerMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', handleEditorPointerMove, { passive: false });
    };
  }, [isEditorOpen, draggingHandle, handleEditorPointerMove]);

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
              imageFile: compressedFile
            } 
          });
        };
      } else {
        throw new Error(result.error || 'Gagal memproses OCR');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Open editor modal with captured image
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          setEditingBlob(blob);
          setEditingImage(imageSrc);
          setRotation(0);
          setCropTop(60);
          setCropRight(60);
          setCropBottom(60);
          setCropLeft(60);
          setIsEditorOpen(true);
        });
    }
  }, [webcamRef]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingBlob(file);
        setEditingImage(reader.result);
        setRotation(0);
        setCropTop(60);
        setCropRight(60);
        setCropBottom(60);
        setCropLeft(60);
        setIsEditorOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = (deltaDeg) => {
    try {
      const preview = previewRef.current;
      if (!preview) {
        setRotation((r) => (r + deltaDeg + 360) % 360);
        return;
      }
      const rect = preview.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const x = cropLeft;
      const y = cropTop;
      const wRect = Math.max(0, W - cropLeft - cropRight);
      const hRect = Math.max(0, H - cropTop - cropBottom);
      const cx = x + wRect / 2;
      const cy = y + hRect / 2;
      const nx = cx / W;
      const ny = cy / H;

      let nxp = nx;
      let nyp = ny;
      const d = ((deltaDeg % 360) + 360) % 360;
      if (d === 90) {
        nxp = ny;
        nyp = 1 - nx;
      } else if (d === 270) {
        nxp = 1 - ny;
        nyp = nx;
      } else if (d === 180) {
        nxp = 1 - nx;
        nyp = 1 - ny;
      }

      const newW = (d === 90 || d === 270) ? hRect : wRect;
      const newH = (d === 90 || d === 270) ? wRect : hRect;
      const newCx = nxp * W;
      const newCy = nyp * H;
      let newX = newCx - newW / 2;
      let newY = newCy - newH / 2;
      // clamp
      newX = Math.max(0, Math.min(W - newW, newX));
      newY = Math.max(0, Math.min(H - newH, newY));

      setCropLeft(Math.round(newX));
      setCropTop(Math.round(newY));
      setCropRight(Math.round(W - newX - newW));
      setCropBottom(Math.round(H - newY - newH));

      setRotation((r) => (r + deltaDeg + 360) % 360);
    } catch (e) {
      setRotation((r) => (r + deltaDeg + 360) % 360);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-900 relative overflow-hidden" style={{ overflowY: 'hidden' }}>
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
              screenshotFormat="image/png"
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
          style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 8px))' }}
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

      {/* Image Editor Modal */}
      {isEditorOpen && editingImage && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/95 text-white flex flex-col overflow-hidden touch-none"
          style={{ touchAction: 'none' }}
          onPointerMove={(e) => {
            if (!draggingHandle) return;
            e.preventDefault();
            const container = cropContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const deltaX = e.clientX - rect.left;
            const deltaY = e.clientY - rect.top;
            const minCrop = 0;
            const maxCrop = 200;

            if (draggingHandle === 'top-left') {
              setCropTop(Math.max(minCrop, Math.min(maxCrop, deltaY)));
              setCropLeft(Math.max(minCrop, Math.min(maxCrop, deltaX)));
            } else if (draggingHandle === 'top-right') {
              setCropTop(Math.max(minCrop, Math.min(maxCrop, deltaY)));
              setCropRight(Math.max(minCrop, Math.min(maxCrop, rect.width - deltaX)));
            } else if (draggingHandle === 'bottom-left') {
              setCropBottom(Math.max(minCrop, Math.min(maxCrop, rect.height - deltaY)));
              setCropLeft(Math.max(minCrop, Math.min(maxCrop, deltaX)));
            } else if (draggingHandle === 'bottom-right') {
              setCropBottom(Math.max(minCrop, Math.min(maxCrop, rect.height - deltaY)));
              setCropRight(Math.max(minCrop, Math.min(maxCrop, rect.width - deltaX)));
            } else if (draggingHandle === 'top') {
              setCropTop(Math.max(minCrop, Math.min(maxCrop, deltaY)));
            } else if (draggingHandle === 'bottom') {
              setCropBottom(Math.max(minCrop, Math.min(maxCrop, rect.height - deltaY)));
            } else if (draggingHandle === 'left') {
              setCropLeft(Math.max(minCrop, Math.min(maxCrop, deltaX)));
            } else if (draggingHandle === 'right') {
              setCropRight(Math.max(minCrop, Math.min(maxCrop, rect.width - deltaX)));
            }
          }}
          onPointerUp={() => setDraggingHandle(null)}
          onPointerCancel={() => setDraggingHandle(null)}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Edit Foto STB</p>
              <p className="text-sm font-semibold">Tarik pinggir untuk memotong, putar bila miring</p>
            </div>
            <button onClick={() => setIsEditorOpen(false)} className="text-slate-300 hover:text-white text-sm font-semibold">Tutup</button>
          </div>

          <div className="relative flex-1 overflow-hidden p-4 flex items-center justify-center" data-crop-container ref={cropContainerRef}>
            {/* Main preview container */}
            <div className="relative w-full h-full max-w-2xl max-h-full">
              <div
                ref={previewRef}
                className="relative w-full h-full rounded-[28px] overflow-hidden bg-black border-2 border-white/10 shadow-2xl"
                style={{
                  aspectRatio: '3/4'
                }}
              >
                {/* Image container - scale and center the image */}
                <img
                  src={editingImage}
                  alt="edit preview"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    objectPosition: 'center'
                  }}
                />

                {/* Dark overlay outside crop area */}
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${cropTop}px`,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${cropBottom}px`,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${cropLeft}px`,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: `${cropRight}px`,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10
                  }}
                />

                {/* Crop frame border */}
                <div
                  className="absolute border-2 border-white/80 pointer-events-none"
                  style={{
                    top: `${cropTop}px`,
                    left: `${cropLeft}px`,
                    right: `${cropRight}px`,
                    bottom: `${cropBottom}px`,
                    zIndex: 15
                  }}
                />

                {/* Corner handles - draggable */}
                {/* Top-left corner */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('top-left'); }}
                  className="absolute w-8 h-8 bg-indigo-500/90 rounded-full cursor-nwse-resize"
                  style={{
                    top: `calc(${cropTop}px - 12px)`,
                    left: `calc(${cropLeft}px - 12px)`,
                    zIndex: 20
                  }}
                />
                {/* Top-right corner */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('top-right'); }}
                  className="absolute w-8 h-8 bg-indigo-500/90 rounded-full cursor-nesw-resize"
                  style={{
                    top: `calc(${cropTop}px - 12px)`,
                    right: `calc(${cropRight}px - 12px)`,
                    zIndex: 20
                  }}
                />
                {/* Bottom-left corner */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('bottom-left'); }}
                  className="absolute w-8 h-8 bg-indigo-500/90 rounded-full cursor-nesw-resize"
                  style={{
                    bottom: `calc(${cropBottom}px - 12px)`,
                    left: `calc(${cropLeft}px - 12px)`,
                    zIndex: 20
                  }}
                />
                {/* Bottom-right corner */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('bottom-right'); }}
                  className="absolute w-8 h-8 bg-indigo-500/90 rounded-full cursor-se-resize"
                  style={{
                    bottom: `calc(${cropBottom}px - 12px)`,
                    right: `calc(${cropRight}px - 12px)`,
                    zIndex: 20
                  }}
                />

                {/* Edge handles */}
                {/* Top edge */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('top'); }}
                  className="absolute left-1/2 -translate-x-1/2 w-12 h-4 bg-white/60 rounded-full cursor-n-resize"
                  style={{
                    top: `calc(${cropTop}px - 10px)`,
                    zIndex: 20
                  }}
                />
                {/* Bottom edge */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('bottom'); }}
                  className="absolute left-1/2 -translate-x-1/2 w-12 h-4 bg-white/60 rounded-full cursor-s-resize"
                  style={{
                    bottom: `calc(${cropBottom}px - 10px)`,
                    zIndex: 20
                  }}
                />
                {/* Left edge */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('left'); }}
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-12 bg-white/60 rounded-full cursor-w-resize"
                  style={{
                    left: `calc(${cropLeft}px - 10px)`,
                    zIndex: 20
                  }}
                />
                {/* Right edge */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDraggingHandle('right'); }}
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-12 bg-white/60 rounded-full cursor-e-resize"
                  style={{
                    right: `calc(${cropRight}px - 10px)`,
                    zIndex: 20
                  }}
                />
              </div>
            </div>

            {/* Mouse move and up handlers for dragging */}

          </div>

          <div className="px-4 pb-24">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => handleRotate(-90)}
                  className="flex-1 border border-white/20 bg-white/5 py-3 rounded-2xl text-sm font-semibold hover:bg-white/10"
                >
                  Putar -90°
                </button>
                <button
                  onClick={() => handleRotate(90)}
                  className="flex-1 border border-white/20 bg-white/5 py-3 rounded-2xl text-sm font-semibold hover:bg-white/10"
                >
                  Putar +90°
                </button>
                <button
                  onClick={() => {
                    setCropTop(60);
                    setCropRight(60);
                    setCropBottom(60);
                    setCropLeft(60);
                  }}
                  className="flex-1 border border-white/20 bg-white/5 py-3 rounded-2xl text-sm font-semibold hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
              {editorError && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  <p className="font-semibold">Gagal memproses AI scan.</p>
                  <p>{editorError}</p>
                  <p className="mt-2 text-xs text-red-200">Crop tetap tersimpan. Tekan ulang tombol Simpan & Lanjutkan.</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditorError('');
                    setIsEditorOpen(false);
                  }}
                  className="flex-1 border border-white/20 bg-white/5 py-3 rounded-2xl text-sm font-semibold hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    try {
                      setEditorError('');
                      setIsProcessing(true);
                      const img = new Image();
                      img.src = editingImage;
                      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
                      
                      const preview = previewRef.current;
                      const previewRect = preview?.getBoundingClientRect();
                      const renderWidth = previewRect?.width || img.naturalWidth;
                      const renderHeight = previewRect?.height || img.naturalHeight;
                      const rotationNormalized = ((rotation % 360) + 360) % 360;
                      const rotatedWidth = rotationNormalized === 90 || rotationNormalized === 270 ? img.naturalHeight : img.naturalWidth;
                      const rotatedHeight = rotationNormalized === 90 || rotationNormalized === 270 ? img.naturalWidth : img.naturalHeight;
                      const imageAspect = rotatedWidth / rotatedHeight;
                      const containerAspect = renderWidth / renderHeight;
                      let visibleWidth = renderWidth;
                      let visibleHeight = renderHeight;
                      let offsetX = 0;
                      let offsetY = 0;

                      if (imageAspect > containerAspect) {
                        visibleWidth = renderWidth;
                        visibleHeight = renderWidth / imageAspect;
                        offsetY = (renderHeight - visibleHeight) / 2;
                      } else {
                        visibleHeight = renderHeight;
                        visibleWidth = renderHeight * imageAspect;
                        offsetX = (renderWidth - visibleWidth) / 2;
                      }

                      const rotatedCanvas = document.createElement('canvas');
                      rotatedCanvas.width = rotatedWidth;
                      rotatedCanvas.height = rotatedHeight;
                      const rotatedCtx = rotatedCanvas.getContext('2d');
                      rotatedCtx.save();
                      if (rotationNormalized === 90) {
                        rotatedCtx.translate(rotatedWidth, 0);
                        rotatedCtx.rotate(Math.PI / 2);
                      } else if (rotationNormalized === 180) {
                        rotatedCtx.translate(rotatedWidth, rotatedHeight);
                        rotatedCtx.rotate(Math.PI);
                      } else if (rotationNormalized === 270) {
                        rotatedCtx.translate(0, rotatedHeight);
                        rotatedCtx.rotate(-Math.PI / 2);
                      }
                      rotatedCtx.drawImage(img, 0, 0);
                      rotatedCtx.restore();

                      const scaleX = rotatedWidth / visibleWidth;
                      const scaleY = rotatedHeight / visibleHeight;
                      const cropLeftInImage = Math.max(0, cropLeft - offsetX);
                      const cropTopInImage = Math.max(0, cropTop - offsetY);
                      const cropRightInImage = Math.max(0, cropRight - offsetX);
                      const cropBottomInImage = Math.max(0, cropBottom - offsetY);
                      const cropX = Math.floor(cropLeftInImage * scaleX);
                      const cropY = Math.floor(cropTopInImage * scaleY);
                      const cropW = Math.floor(Math.max(0, visibleWidth - cropLeftInImage - cropRightInImage) * scaleX);
                      const cropH = Math.floor(Math.max(0, visibleHeight - cropTopInImage - cropBottomInImage) * scaleY);

                      const canvas = document.createElement('canvas');
                      canvas.width = cropW;
                      canvas.height = cropH;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(rotatedCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                      
                      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
                      const file = new File([blob], 'stb_capture_edited.jpg', { type: 'image/jpeg' });
                      await processImage(file);
                      setIsEditorOpen(false);
                    } catch (err) {
                      console.error('Editor error:', err);
                      setEditorError(err.message || 'Gagal mengedit gambar. Silakan coba lagi.');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="flex-1 bg-indigo-600 py-3 rounded-2xl text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Simpan & Lanjutkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Scanner;
