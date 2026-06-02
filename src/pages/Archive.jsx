import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Ship, Calendar, CheckCircle2, Clock, X, Package, Mail, ExternalLink, RefreshCw, AlertCircle, Image as ImageIcon, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { getImageFromLocal, deleteImageFromLocal } from '../utils/indexedDB';

// ─── Detail Modal ────────────────────────────────────────────────────────────
const DetailModal = ({ entry, onClose, onDelete }) => {
  if (!entry) return null;
  const isSent = entry.status === 'sent';
  const [localImage, setLocalImage] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const data = await getImageFromLocal(entry.no_permintaan);
        if (data && data.image) {
          setLocalImage(data.image);
          setImageSize(data.size);
        }
      } catch (err) {
        console.error('Failed to load local image', err);
      }
    };
    fetchImage();
  }, [entry.no_permintaan]);

  // Pisah nama_barang jadi array dari string yang dipisah koma
  const items = entry.nama_barang
    ? entry.nama_barang.split(',').map(i => i.trim()).filter(Boolean)
    : [];

  const handleForwardWA = async () => {
    const text = `*STB Scanner Info*\n\nNo Permintaan: ${entry.no_permintaan}\nKapal: ${entry.nama_kapal || '-'}\nDaftar Barang:\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;

    // Jika ada foto lokal dan browser mendukung fitur Share File (umum di HP/PWA)
    if (localImage && navigator.canShare) {
      try {
        const res = await fetch(localImage);
        const blob = await res.blob();
        const file = new File([blob], `STB_${entry.no_permintaan.replace(/\//g, '_')}.jpg`, { type: 'image/jpeg' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'STB Document',
            text: text,
            files: [file]
          });
          return; // Berhasil share, keluar fungsi
        }
      } catch (err) {
        console.error('Share image failed:', err);
        // Lanjut ke fallback jika gagal
      }
    }

    // Fallback: Buka WA Web/App hanya dengan teks (jika foto tidak ada atau tidak support)
    const fallbackText = localImage
      ? text + '\n\n*(Kirim foto secara manual dari galeri/email)*'
      : text;
    window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus FOTO STB ${entry.no_permintaan} dari perangkat ini?\n\n(Hanya foto yang dihapus untuk menghemat memori. Data teks tetap ada di arsip)`)) return;

    setIsDeleting(true);
    try {
      // HANYA hapus dari IndexedDB (lokal)
      await deleteImageFromLocal(entry.no_permintaan);

      // Update UI langsung
      setLocalImage(null);
      setImageSize(null);

      alert('Foto lokal berhasil dihapus');
    } catch (err) {
      console.error('Gagal menghapus foto:', err);
      alert('Gagal menghapus foto lokal: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Bottom Sheet */}
      <div
        className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between border-b border-slate-100">
          <div>
            <h2 className="font-black text-slate-800 text-lg leading-tight">{entry.no_permintaan}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">
                {new Date(entry.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {new Date(entry.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSent ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <CheckCircle2 size={12} /> Terkirim
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                <Clock size={12} /> Pending
              </span>
            )}
            <button onClick={onClose} className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Info Kapal */}
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Ship size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Nama Kapal</p>
              <p className="text-slate-800 font-bold">{entry.nama_kapal || '-'}</p>
            </div>
          </div>

          {/* Foto STB Local */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto STB</p>
              {imageSize && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{imageSize}</span>}
            </div>
            {localImage ? (
              <div className="w-full h-48 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                <img src={localImage} alt="STB Capture" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                <ImageIcon size={32} className="text-slate-300 mb-2" />
                <p className="text-slate-400 text-xs">Foto tidak tersedia di perangkat ini</p>
              </div>
            )}
          </div>

          {/* Daftar Barang */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package size={12} /> Daftar Barang
            </p>
            {items.length > 0 ? (
              <div className="glass rounded-2xl divide-y divide-slate-100">
                {items.map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-slate-700 text-sm font-medium">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-4 text-center text-slate-400 text-sm">
                Tidak ada data barang
              </div>
            )}
          </div>

          {/* Thread Email */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail size={12} /> Cari di Gmail
            </p>
            <div className="glass rounded-2xl p-4">
              <p className="text-slate-800 text-sm font-semibold leading-snug">Subjek: {entry.no_permintaan}</p>
              <p className="text-slate-400 text-xs mt-1">Cari email dengan No. Permintaan ini di Gmail Anda</p>
              <a
                href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(entry.no_permintaan)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1.5 text-indigo-600 text-xs font-bold"
              >
                <ExternalLink size={12} /> Buka di Gmail
              </a>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleForwardWA}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-200"
            >
              <MessageCircle size={18} /> Teruskan ke WA
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || !localImage}
              className="w-14 flex-shrink-0 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Hapus foto lokal"
            >
              <Trash2 size={18} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition-all active:scale-95 text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Halaman Utama Archive ────────────────────────────────────────────────────
const Archive = () => {
  const [rawData, setRawData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedShip, setExpandedShip] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        setRawData([]);
        return;
      }

      // 1. Ambil ID asli (int8) dari tabel users
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
        
      if (userError) throw new Error('Gagal mengambil data profil pengguna (ID).');

      // 2. Gunakan ID asli tersebut untuk memfilter stb_data
      const { data, error: sbError } = await supabase
        .from('stb_data')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;

      setRawData(data);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      if (err.message && err.message.toLowerCase().includes('column')) {
        setError(`Error Database: Kolom belum lengkap (${err.message}). Pastikan kolom user_id ada di tabel stb_data.`);
      } else {
        setError(err.message || 'Gagal memuat data. Periksa koneksi internet Anda.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const lowerQuery = searchQuery.toLowerCase();
    return rawData.filter(item => {
      const kapalMatch = item.nama_kapal?.toLowerCase().includes(lowerQuery);
      const barangMatch = item.nama_barang?.toLowerCase().includes(lowerQuery);
      return kapalMatch || barangMatch;
    });
  }, [rawData, searchQuery]);

  const groupedData = useMemo(() => {
    const grouped = filteredData.reduce((acc, row) => {
      const kapal = row.nama_kapal || 'Tidak Diketahui';
      if (!acc[kapal]) acc[kapal] = [];
      acc[kapal].push({ ...row, status: 'sent' });
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([ship, entries]) => ({ ship, entries }));
  }, [filteredData]);

  // Auto-expand kapal pertama only when there's a single ship group
  useEffect(() => {
    if (groupedData.length === 1 && expandedShip === null) {
      setExpandedShip(groupedData[0].ship);
    }
  }, [groupedData, expandedShip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Detail Modal */}
      <DetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />

      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">MyArchive</h1>
          <p className="text-slate-400 text-sm mt-1">Riwayat STB yang sudah diproses</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-500' : ''} />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="Cari nama kapal atau barang..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total STB</p>
          <p className="text-3xl font-black text-slate-800">{loading ? '...' : filteredData.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kapal Aktif</p>
          <p className="text-3xl font-black text-indigo-600">{loading ? '...' : groupedData.length}</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="px-4 space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="glass rounded-3xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-200 rounded-2xl"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
                  <div className="h-3 bg-slate-200 rounded-lg w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && groupedData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
            <Package size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-bold text-lg">Belum Ada Data</p>
          <p className="text-slate-400 text-sm mt-1">Upload STB pertama Anda untuk memulai</p>
        </div>
      )}

      {/* Ship Groups */}
      {!loading && !error && (
        <div className="px-4 space-y-4 pb-6">
          {groupedData.map((group) => (
            <div key={group.ship} className="glass rounded-3xl overflow-hidden shadow-sm">
              {/* Ship Header */}
              <button
                onClick={() => setExpandedShip(expandedShip === group.ship ? null : group.ship)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
                    <Ship size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">{group.ship}</p>
                    <p className="text-xs text-slate-400">{group.entries.length} dokumen</p>
                  </div>
                </div>
                {expandedShip === group.ship
                  ? <ChevronUp size={18} className="text-slate-400" />
                  : <ChevronDown size={18} className="text-slate-400" />
                }
              </button>

              {/* Entries */}
              {expandedShip === group.ship && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {group.entries.map((entry) => {
                    const items = entry.nama_barang
                      ? entry.nama_barang.split(',').map(i => i.trim()).filter(Boolean)
                      : [];
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className="w-full p-4 bg-white/50 hover:bg-indigo-50/50 active:bg-indigo-50 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{entry.no_permintaan}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <Calendar size={11} />
                              <span>
                                {new Date(entry.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {' · '}
                                {new Date(entry.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex-shrink-0">
                            <CheckCircle2 size={11} /> Tersimpan
                          </span>
                        </div>
                        {items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {items.slice(0, 3).map((item, i) => (
                              <span key={i} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-medium">
                                {item}
                              </span>
                            ))}
                            {items.length > 3 && (
                              <span className="text-[11px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">
                                +{items.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-indigo-500 font-semibold mt-2.5">Ketuk untuk detail →</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Archive;
