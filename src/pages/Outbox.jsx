import { useState } from 'react';
import { Send, Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const Outbox = () => {
  const [pendingItems, setPendingItems] = useState([
    { id: 1, ship: 'Maju Daya 23', noPermintaan: 'MD23/2026/04/013', time: '14:35', size: '312 KB', status: 'pending' },
    { id: 2, ship: 'Makmur Jaya 7', noPermintaan: 'MJ07/2026/04/006', time: '11:20', size: '180 KB', status: 'pending' },
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setPendingItems(items => items.map(item => ({ ...item, status: 'success' })));
      setTimeout(() => setPendingItems([]), 1500);
    }, 2500);
  };

  const statusConfig = {
    pending: { icon: <Clock size={14} />, label: 'Menunggu', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    success: { icon: <CheckCircle2 size={14} />, label: 'Terkirim', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    error: { icon: <AlertCircle size={14} />, label: 'Gagal', color: 'text-red-600 bg-red-50 border-red-100' },
  };

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-slate-800">Outbox</h1>
        <p className="text-slate-400 text-sm mt-1">Antrean pengiriman STB saat offline</p>
      </div>

      {/* Status Banner */}
      <div className="px-4 mb-5">
        {pendingItems.length > 0 ? (
          <div className="bg-amber-500/10 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <WifiOff size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-800 text-sm">{pendingItems.length} item menunggu</p>
                <p className="text-amber-600 text-xs">Terhubung internet untuk kirim</p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-70 shadow-md shadow-amber-200"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Mengirim...' : 'Sinkron'}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Wifi size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">Semua terkirim!</p>
              <p className="text-emerald-600 text-xs">Outbox kosong, tidak ada antrean</p>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-4 space-y-3">
        {pendingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Send size={32} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-400">Tidak ada antrean</p>
            <p className="text-slate-300 text-sm mt-1">Semua STB sudah berhasil dikirim</p>
          </div>
        ) : (
          pendingItems.map((item) => {
            const s = statusConfig[item.status];
            return (
              <div key={item.id} className={`glass rounded-2xl p-4 transition-all duration-500 ${item.status === 'success' ? 'opacity-60 scale-95' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow shadow-indigo-200 flex-shrink-0">
                      <Send size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.noPermintaan}</p>
                      <p className="text-xs text-slate-400">{item.ship} • {item.time} • {item.size}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${s.color}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Outbox;
