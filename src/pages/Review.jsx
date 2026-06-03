import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle2, Search, Mail, Reply, Sparkles, Pencil, X, Check, RefreshCw, Save, DatabaseBackup } from 'lucide-react';
import { supabase } from '../supabase';
import { saveImageToLocal } from '../utils/indexedDB';

const Review = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const imageData = location.state?.imageData;
  const initialNoPermintaan = location.state?.noPermintaan;
  const namaKapal = location.state?.namaKapal || '';
  const namaBarang = location.state?.namaBarang || '';
  const imageFile = location.state?.imageFile;

  const rawBackend = import.meta.env.VITE_BACKEND_URL || '';
  const backendBase = rawBackend && !/^https?:\/\//i.test(rawBackend) ? `https://${rawBackend}` : rawBackend;
  const backendApi = backendBase ? `${backendBase.replace(/\/$/, '')}/api` : '/api';

  const [isScanning, setIsScanning] = useState(true);
  const [extractedData, setExtractedData] = useState({ noPermintaan: initialNoPermintaan });
  const [emailThreads, setEmailThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [noPermintaanError, setNoPermintaanError] = useState(!initialNoPermintaan);
  const [isSending, setIsSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSavingArchive, setIsSavingArchive] = useState(false);

  // State untuk fitur edit no permintaan
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialNoPermintaan || '');
  const [isSearchingGmail, setIsSearchingGmail] = useState(false);
  const [replyType, setReplyType] = useState('replyAll'); // 'reply' atau 'replyAll'

  // Fungsi pencarian Gmail (bisa dipanggil ulang dengan no permintaan baru)
  const searchGmail = async (noPermintaan) => {
    if (!noPermintaan) return;
    setIsSearchingGmail(true);
    setEmailThreads([]);
    setSelectedThread(null);
    try {
      const response = await fetch(`${backendApi}/gmail/search?query=${encodeURIComponent(noPermintaan)}`);
      const text = await response.text();
      let result = null;
      try {
        result = text ? JSON.parse(text) : null;
      } catch (err) {
        console.error('Invalid JSON from Gmail search response:', text);
        alert(`Gagal memproses hasil pencarian Gmail: response status ${response.status}. Lihat console untuk detail.`);
        return;
      }

      if (!response.ok || result?.success === false) {
        console.error(`Gmail search failed (status ${response.status}):`, result || text);
        alert(`Gmail search error: ${result?.error || `HTTP ${response.status}`}\n${text}`);
        return;
      }

      if (result && result.success) {
        const threadsWithScores = result.threads.map((t, index) => ({
          ...t,
          matchScore: typeof t.matchScore === 'number' ? t.matchScore : (index === 0 ? 98 : index === 1 ? 85 : 70)
        }));
        setEmailThreads(threadsWithScores);
        if (threadsWithScores.length > 0) {
          setSelectedThread(threadsWithScores[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setIsSearchingGmail(false);
    }
  };

  useEffect(() => {
    if (!imageData) {
      navigate('/scanner');
      return;
    }

    const fetchInitial = async () => {
      if (!initialNoPermintaan) {
        setNoPermintaanError(true);
        setIsScanning(false);
        return;
      }
      await searchGmail(initialNoPermintaan);
      setIsScanning(false);
    };

    fetchInitial();
  }, [imageData, initialNoPermintaan, navigate]);

  // Handler simpan edit no permintaan
  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setExtractedData({ noPermintaan: trimmed });
    setNoPermintaanError(false);
    setIsEditing(false);
    await searchGmail(trimmed);
  };

  const handleCancelEdit = () => {
    setEditValue(extractedData.noPermintaan || '');
    setIsEditing(false);
  };

  const handleSend = async () => {
    if (!selectedThread) {
      alert('Pilih thread email untuk membalas!');
      return;
    }

    const thread = emailThreads.find(t => t.id === selectedThread);
    if (!thread) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      // Ensure we have a File with a filename based on the latest noPermintaan
      const safeNoPermintaan = (extractedData.noPermintaan || 'capture').replace(/[\/\\?%*:|"<>]/g, '_');
      const fileName = `stb_${safeNoPermintaan}.jpg`;

      let fileToSend = imageFile;
      if (fileToSend) {
        // Recreate the File object with the new custom name
        fileToSend = new File([fileToSend], fileName, { type: fileToSend.type });
      } else if (imageData) {
        const res = await fetch(imageData);
        const blob = await res.blob();
        fileToSend = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      }
      formData.append('image', fileToSend);
      formData.append('threadId', thread.id);
      formData.append('messageId', thread.messageId);
      formData.append('subject', thread.subject);
      formData.append('toEmail', thread.sender);
      formData.append('replyAll', replyType === 'replyAll' ? 'true' : 'false');
      formData.append('toEmailsAll', thread.to || '');
      formData.append('ccEmail', thread.cc || '');

      const response = await fetch(`${backendApi}/gmail/reply`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setIsEmailSent(true);
      } else {
        throw new Error(result.error || 'Gagal mengirim email');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Gagal mengirim: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveArchive = async () => {
    setIsSavingArchive(true);
    try {
      const finalNoPermintaan = extractedData.noPermintaan;

      const { data: { session } } = await supabase.auth.getSession();

      // Cari ID int8 dari tabel users berdasarkan email
      let realUserId = null;
      if (session?.user?.email) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single();
        if (dbUser) {
          realUserId = dbUser.id;
        }
      }

      // 1. Simpan data text ke Supabase
      const { error: sbError } = await supabase
        .from('stb_data')
        .insert([{
          user_id: realUserId,
          no_permintaan: finalNoPermintaan,
          nama_kapal: namaKapal,
          nama_barang: namaBarang
        }]);

      if (sbError) throw sbError;

      // 2. Simpan foto ke IndexedDB Local
      const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2) + ' MB';
      await saveImageToLocal(finalNoPermintaan, imageData, sizeMB);

      navigate('/archive');
    } catch (error) {
      console.error('Error saving to archive:', error);
      alert('Gagal menyimpan arsip: ' + error.message);
    } finally {
      setIsSavingArchive(false);
    }
  };

  /* ─── Scanning State ─── */
  if (isScanning) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        {/* Image Preview with scan line */}
        <div className="relative w-44 h-60 rounded-2xl overflow-hidden shadow-2xl mb-8 border border-white/10">
          <img src={imageData} alt="Scanning" className="w-full h-full object-cover opacity-40" />
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-scan opacity-80"></div>
          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg"></div>
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg"></div>
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg"></div>
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-indigo-400 rounded-br-lg"></div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-indigo-400 animate-pulse" size={18} />
          <h2 className="text-xl font-black text-white">Memproses STB...</h2>
        </div>
        <p className="text-slate-400 text-center text-sm">AI sedang membaca nomor & mencari thread Gmail yang cocok</p>

        {/* Step Indicators */}
        <div className="flex gap-3 mt-8">
          {['Baca Teks', 'Ekstrak No.', 'Cari Gmail'].map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulseFast" style={{ animationDelay: `${i * 0.3}s` }}></div>
              <span className="text-xs text-slate-300 font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Main Review State ─── */
  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="glass px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 transition">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-black text-slate-800 leading-tight">Balas STB ke Gmail</h1>
          <p className="text-xs text-slate-400">Pilih email lama untuk dibalas</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-52">
        {/* STB Preview + Status */}
        <div className="px-4 pt-4 pb-2 flex gap-3">
          <div className="w-16 h-20 rounded-xl overflow-hidden shadow-md border border-slate-200 flex-shrink-0">
            <img src={imageData} alt="STB" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            {isEditing ? (
              /* ── Mode Edit ── */
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3 h-full flex flex-col justify-between">
                <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">Edit No Permintaan</p>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  autoFocus
                  placeholder="contoh: ID298/4/2026/010"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-xl active:scale-95 transition"
                  >
                    <Check size={13} /> Simpan & Cari
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center justify-center gap-1 bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : noPermintaanError ? (
              /* ── Error State + tombol edit manual ── */
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 h-full flex flex-col justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold text-red-800 text-sm">No Permintaan Tidak Terbaca</p>
                    <p className="text-red-500 text-xs mt-0.5">OCR gagal. Ketik manual di bawah.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setEditValue(''); setIsEditing(true); }}
                  className="mt-2 flex items-center justify-center gap-1.5 w-full bg-red-600 text-white text-xs font-bold py-1.5 rounded-xl active:scale-95 transition"
                >
                  <Pencil size={12} /> Input Manual
                </button>
              </div>
            ) : (
              /* ── Success State + tombol edit ── */
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 h-full flex flex-col justify-between">
                <div>
                  <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider">No Permintaan</p>
                  <p className="text-indigo-900 font-black text-base mt-0.5">{extractedData.noPermintaan}</p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-semibold">Terdeteksi</span>
                  </div>
                  <button
                    onClick={() => { setEditValue(extractedData.noPermintaan || ''); setIsEditing(true); }}
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 text-xs font-bold transition"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email Thread Search Results */}
        {!noPermintaanError && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              {isSearchingGmail ? (
                <RefreshCw size={14} className="text-indigo-400 animate-spin" />
              ) : (
                <Search size={14} className="text-slate-400" />
              )}
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {isSearchingGmail
                  ? 'Mencari ulang Gmail...'
                  : `Hasil Pencarian Gmail (${emailThreads.length} ditemukan)`}
              </p>
            </div>
            {isSearchingGmail && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-100 bg-white p-4 animate-pulse">
                    <div className="h-3 bg-slate-200 rounded-full w-2/3 mb-2"></div>
                    <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {emailThreads.map((thread) => {
                const isSelected = selectedThread === thread.id;
                const matchColor = thread.matchScore >= 90 ? 'text-emerald-600 bg-emerald-50'
                  : thread.matchScore >= 80 ? 'text-amber-600 bg-amber-50'
                    : 'text-slate-500 bg-slate-100';
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread.id)}
                    className={`rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${isSelected
                      ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-100 scale-[1.01]'
                      : 'border-slate-200 bg-white/60 hover:border-indigo-300'
                      }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className={isSelected ? 'text-indigo-500' : 'text-slate-400'} />
                          <span className="text-xs font-bold text-slate-500">{thread.sender}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${matchColor}`}>
                            {thread.matchScore}% cocok
                          </span>
                          <span className="text-[10px] text-slate-400">{thread.date}</span>
                        </div>
                      </div>
                      <p className={`text-sm font-bold leading-snug ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {thread.subject}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{thread.snippet}</p>
                    </div>
                    {isSelected && (
                      <div className="bg-indigo-600 px-4 py-2 flex items-center gap-1.5">
                        <Reply size={12} className="text-white" />
                        <span className="text-white text-xs font-bold">Dipilih — foto STB akan dibalas di sini</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Spacer (extra room to sit above bottom nav) */}
      <div className="h-[calc(88px+env(safe-area-inset-bottom,16px))]" />

      {/* Render action bar into document.body to avoid being covered by Layout bottom nav */}
      {typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(8px + env(safe-area-inset-bottom,12px))', padding: '0 1rem', zIndex: 99999 }}>
          <div className="glass border border-slate-100 rounded-3xl p-3 shadow-xl shadow-slate-200/40 pointer-events-auto max-w-3xl mx-auto">
            {!isEmailSent ? (
              <div className="flex flex-col gap-3">
                {selectedThread && (
                  <div className="flex flex-col gap-1.5 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipe Balasan:</span>
                    <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                      <button
                        type="button"
                        onClick={() => setReplyType('reply')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                          replyType === 'reply'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/30'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Reply (Hanya Pengirim)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyType('replyAll')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                          replyType === 'replyAll'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/30'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Reply to All (Termasuk Cc)
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSend}
                  disabled={noPermintaanError || isSending || isEditing || isSearchingGmail}
                  className={`w-full py-3 px-3 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 font-black shadow-lg text-base ${noPermintaanError || isSending || isEditing || isSearchingGmail
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-200'
                    }`}>
                  {isSending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Mengirim Balasan...</span>
                    </div>
                  ) : (
                    <>
                      <Reply size={20} />
                      <span>{replyType === 'replyAll' ? 'Balas Semua ke Gmail' : 'Balas ke Gmail'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3 justify-center text-emerald-600 bg-emerald-50 py-2 rounded-xl border border-emerald-100">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-bold">Email Balasan Terkirim!</span>
                </div>
                <button
                  onClick={handleSaveArchive}
                  disabled={isSavingArchive}
                  className="w-full py-4 px-4 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 font-black shadow-lg text-base bg-slate-800 text-white hover:bg-slate-700">
                  {isSavingArchive ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </div>
                  ) : (
                    <>
                      <DatabaseBackup size={20} className="text-emerald-400" />
                      <span>Simpan ke Arsip STB</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Review;
