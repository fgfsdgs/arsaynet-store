'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuickPinchZoom from 'react-quick-pinch-zoom';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limit, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import {
  LayoutDashboard,
  CreditCard,
  ShoppingBag,
  ClipboardList,
  LogOut,
  Wallet,
  CheckCircle2,
  TrendingUp,
  QrCode,
  XCircle,
  AlertTriangle,
  Layers,
  UserPlus,
  HelpCircle,
  Smartphone,
  ChevronRight,
  X,
  Clock,
  Package,
  Inbox
} from 'lucide-react';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? ''
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const STATIC_QRIS_URL = "/qris.jpg";
const ADMIN_PHONE = "+6281779892016";
const ADMIN_PHONE_DISPLAY = "+62 817-7989-2016";
const DEPOSIT_FEE = 153;
const MAX_DEPOSIT = 499000;
const MIN_DEPOSIT = 10000;
const XLA_PRICE_MARKUP = 1000;

// ─── Nav items ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'beli',      label: 'Beli',      icon: ShoppingBag },
  { id: 'deposit',   label: 'Top Up',    icon: CreditCard },
  { id: 'riwayat',   label: 'Riwayat',   icon: ClipboardList },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
function WhatsappLogo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">
      <path d="M16.01 3.5C9.12 3.5 3.5 9.06 3.5 15.89c0 2.2.59 4.34 1.7 6.22L3.62 28.5l6.56-1.53a12.61 12.61 0 0 0 5.83 1.44c6.89 0 12.49-5.55 12.49-12.39S22.9 3.5 16.01 3.5Zm0 22.78c-1.82 0-3.61-.48-5.18-1.38l-.37-.21-3.89.91.93-3.77-.24-.39a10.14 10.14 0 0 1-1.56-5.55c0-5.66 4.62-10.27 10.31-10.27 5.68 0 10.3 4.61 10.3 10.27 0 5.67-4.62 10.39-10.3 10.39Zm5.65-7.71c-.31-.15-1.83-.9-2.11-1-.28-.1-.49-.15-.7.15-.2.31-.8 1-.98 1.19-.18.2-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.52-.92-.82-1.53-1.82-1.71-2.13-.18-.31-.02-.47.14-.63.14-.14.31-.36.46-.54.15-.18.2-.31.31-.51.1-.2.05-.38-.03-.54-.08-.15-.7-1.67-.95-2.29-.25-.6-.5-.52-.7-.53h-.59c-.2 0-.54.08-.82.38-.28.31-1.08 1.05-1.08 2.56 0 1.51 1.11 2.97 1.26 3.18.15.2 2.18 3.31 5.28 4.64.74.32 1.31.51 1.76.65.74.23 1.41.2 1.94.12.59-.09 1.83-.74 2.09-1.46.26-.72.26-1.33.18-1.46-.08-.13-.28-.2-.59-.35Z" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success:    { label: 'Berhasil',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    berhasil:   { label: 'Berhasil',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    pending:    { label: 'Menunggu',   cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
    proses:     { label: 'Diproses',   cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
    cancelled:  { label: 'Dibatalkan', cls: 'bg-zinc-700/30   text-zinc-400   border-zinc-700/50'   },
    dibatalkan: { label: 'Dibatalkan', cls: 'bg-zinc-700/30   text-zinc-400   border-zinc-700/50'   },
  };
  const s = map[status] ?? { label: 'Gagal', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ n, onClose }: { n: any; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed z-[999] bottom-24 left-1/2 -translate-x-1/2 md:bottom-auto md:top-5 md:right-5 md:left-auto md:translate-x-0 w-[calc(100vw-2rem)] max-w-sm bg-[#1a1a1f] border rounded-xl shadow-2xl p-4 flex items-start gap-3 ${n.type === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
      <div className={`mt-0.5 shrink-0 ${n.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
        {n.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">{n.title}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
      </div>
      <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [apiProductsMPA, setApiProductsMPA] = useState<any[]>([]);
  const [apiProductsXLA, setApiProductsXLA] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'MPA' | 'XLA'>('MPA');
  const [targetPhoneNumber, setTargetPhoneNumber] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);

  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string } | null>(null);

  const qrisRef = useRef<HTMLDivElement>(null);
  const pinchZoomRef = useRef<any>(null);

  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    if (qrisRef.current) {
      qrisRef.current.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
    }
  }, []);

  const [user, setUser] = useState({ name: '...', initials: '--', status: '...', balance: 0, successfulTransactions: 0, totalSpent: 0 });

  const triggerPopup = (type: 'success' | 'error', title: string, message: string) =>
    setNotification({ show: true, type, title, message });

  const getTotalBayar = () => (parseInt(depositAmount) || 0) + DEPOSIT_FEE;
  const isDepositValid = () => { const n = parseInt(depositAmount) || 0; return n >= MIN_DEPOSIT && n <= MAX_DEPOSIT; };

  // ─── Helper: harga efektif (XLA +1000) ────────────────────────────────────
  const getEffectivePrice = useCallback((prod: any) => {
    return (prod?.price || 0) + (activeCategory === 'XLA' ? XLA_PRICE_MARKUP : 0);
  }, [activeCategory]);

  const getProductDescription = (prod: any) => {
    const desc = prod?.description ?? prod?.deskripsi ?? prod?.keterangan ?? prod?.detail;

    if (Array.isArray(desc)) {
      return desc
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return Object.values(item).filter(Boolean).join(' ');
          return '';
        })
        .filter(Boolean)
        .join(' • ');
    }

    if (desc && typeof desc === 'object') {
      return Object.values(desc).filter(Boolean).join(' • ');
    }

    return typeof desc === 'string' ? desc.trim() : '';
  };

  const fetchAllProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [resMPA, resXLA] = await Promise.all([
        fetch("/api/products", { method: "POST" }),
        fetch("/api/products-xla", { method: "POST" }),
      ]);
      const [rMPA, rXLA] = await Promise.all([resMPA.json(), resXLA.json()]);
      if (rMPA.success && rMPA.data) setApiProductsMPA(Array.isArray(rMPA.data) ? rMPA.data : [rMPA.data]);
      if (rXLA.success && rXLA.data) setApiProductsXLA(Array.isArray(rXLA.data) ? rXLA.data : [rXLA.data]);
    } catch (err) { console.error(err); }
    finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => { if (activeMenu === 'beli') fetchAllProducts(); }, [activeMenu, fetchAllProducts]);
  useEffect(() => { setSelectedProduct(null); }, [activeCategory]);

  useEffect(() => {
    let unsubFirestore = () => {};
    let unsubTx = () => {};
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { router.push('/'); return; }
      setCurrentUserUid(currentUser.uid);
      unsubFirestore = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const name = d.name || 'Sobat';
          setUser({ name, initials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2), status: d.status || 'Member Aktif', balance: d.balance || 0, successfulTransactions: d.successfulTransactions || 0, totalSpent: d.totalSpent || 0 });
        }
        setPageLoading(false);
      }, () => setPageLoading(false));
      const qTx = query(collection(db, "users", currentUser.uid, "transactions"), orderBy("createdAt", "desc"), limit(30));
      unsubTx = onSnapshot(qTx, (snap) => {
        setTransactions(snap.docs.map(d => {
          const tx = d.data();
          let date = '-';
          if (tx.createdAt) { const obj = tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt); date = obj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
          return { id: d.id, ...tx, date };
        }));
      });
    });
    return () => { unsubAuth(); unsubFirestore(); unsubTx(); };
  }, [router]);

  useEffect(() => {
    if (!activeTxId || !currentUserUid || !isModalOpen) return;
    return onSnapshot(doc(db, "users", currentUserUid, "transactions", activeTxId), (snap) => {
      if (!snap.exists()) return;
      const s = snap.data().status;
      if (s === 'success' || s === 'berhasil') {
        setIsModalOpen(false); setActiveTxId(null);
        triggerPopup('success', 'Deposit Berhasil', 'Pembayaran sudah di-approve oleh admin.');
        setActiveMenu('dashboard');
      } else if (s === 'failed' || s === 'cancelled') {
        setIsModalOpen(false); setActiveTxId(null);
        triggerPopup('error', 'Deposit Dibatalkan', 'Transaksi dibatalkan atau ditolak admin.');
      }
    });
  }, [activeTxId, currentUserUid, isModalOpen]);

  const handleCreateDeposit = async () => {
    if (!depositAmount || !isDepositValid() || !currentUserUid) return;
    setActionLoading(true);
    try {
      const ref = await addDoc(collection(db, "users", currentUserUid, "transactions"), {
        title: "Isi Saldo (QRIS)", amount: parseInt(depositAmount), fee: DEPOSIT_FEE,
        totalPaid: parseInt(depositAmount) + DEPOSIT_FEE, status: "pending", type: "deposit",
        method: "in", createdAt: serverTimestamp(), note: "Menunggu validasi manual oleh admin"
      });
      setActiveTxId(ref.id); setIsModalOpen(true);
    } catch (e: any) { triggerPopup('error', 'Gagal', 'Gagal membuat tiket deposit.'); }
    finally { setActionLoading(false); }
  };

  const handleCancelDeposit = async () => {
    if (!activeTxId || !currentUserUid) return;
    await updateDoc(doc(db, "users", currentUserUid, "transactions", activeTxId), { status: 'cancelled' });
    setIsModalOpen(false); setActiveTxId(null);
    triggerPopup('success', 'Dibatalkan', 'Transaksi berhasil dibatalkan.');
  };

  const preCheckBeliPaket = () => {
    if (!targetPhoneNumber || targetPhoneNumber.length < 10) { triggerPopup('error', 'Nomor Tidak Valid', 'Periksa kembali nomor pelanggan tujuan.'); return; }
    if (!selectedProduct) return;
    // Cek saldo pakai harga efektif (XLA sudah +1000)
    if (user.balance < getEffectivePrice(selectedProduct)) {
      triggerPopup('error', 'Saldo Tidak Cukup', `Saldo Rp ${user.balance.toLocaleString('id-ID')} tidak cukup untuk produk ini.`);
      return;
    }
    setIsConfirmOrderModalOpen(true);
  };

  const handleBeliPaketAkrab = async () => {
    if (!selectedProduct || !currentUserUid) return;
    setIsConfirmOrderModalOpen(false); setActionLoading(true);
    const endpoint = activeCategory === 'MPA' ? '/api/invite' : '/api/invite-xla';
    const effectivePrice = getEffectivePrice(selectedProduct);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: targetPhoneNumber,
          productCode: selectedProduct.code,
          productPrice: effectivePrice,          // ← harga +1000 untuk XLA
          productName: selectedProduct.name,
          uid: currentUserUid,
          category: activeCategory
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        triggerPopup('success', 'Pembelian Berhasil!', `Paket ${selectedProduct.name} dikirim ke ${targetPhoneNumber}.`);
        setTargetPhoneNumber(''); setSelectedProduct(null); setActiveMenu('riwayat');
      } else {
        triggerPopup('error', 'Transaksi Gagal', result.message || 'Ditolak oleh sistem gateway.');
      }
    } catch { triggerPopup('error', 'Koneksi Bermasalah', 'Periksa koneksi internet kamu.'); }
    finally { setActionLoading(false); }
  };

  const buildWaMessage = () => {
    const nominal = parseInt(depositAmount) || 0;
    const msg = `Halo Admin, saya *${user.name}* sudah transfer Rp ${getTotalBayar().toLocaleString('id-ID')} (saldo Rp ${nominal.toLocaleString('id-ID')} + fee Rp ${DEPOSIT_FEE.toLocaleString('id-ID')}). Mohon di-approve. 🙏`;
    return `https://wa.me/${ADMIN_PHONE.replace('+', '')}?text=${encodeURIComponent(msg)}`;
  };

  const openAdminWhatsapp = () => {
    window.open(`https://wa.me/${ADMIN_PHONE.replace('+', '')}`, '_blank', 'width=480,height=720,noopener,noreferrer');
  };

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Selamat datang kembali</p>
        <h1 className="text-2xl font-bold text-white">{user.name}</h1>
      </div>

      {/* Saldo utama */}
      <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Saldo tersedia</p>
          <p className="text-3xl font-bold text-white tabular-nums">Rp {user.balance.toLocaleString('id-ID')}</p>
          <p className="text-xs text-zinc-600 mt-1">{user.status}</p>
        </div>
        <button onClick={() => setActiveMenu('deposit')} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0">
          <CreditCard className="w-4 h-4" /> Isi Saldo
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setActiveCategory('XLA'); setActiveMenu('beli'); }}
          className="bg-[#1a1a1f] border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900 rounded-xl p-4 text-left transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-sm font-bold text-white mt-3">Stok XLA</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Cek produk XLA</p>
        </button>
        <a
          href="https://juraganxl.my.id"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#1a1a1f] border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 rounded-xl p-4 text-left transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-sm font-bold text-white mt-3">Stok XDA</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">juraganxl.my.id</p>
        </a>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white tabular-nums">{user.successfulTransactions}</p>
          <p className="text-xs text-zinc-500 mt-1">Transaksi berhasil</p>
        </div>
        <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white tabular-nums">Rp {(user.totalSpent / 1000).toFixed(0)}k</p>
          <p className="text-xs text-zinc-500 mt-1">Total belanja</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Transaksi Terakhir</h2>
          <button onClick={() => setActiveMenu('riwayat')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
            Lihat semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
          {transactions.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Inbox className="w-8 h-8 text-zinc-700" />
              <p className="text-xs text-zinc-500">Belum ada transaksi</p>
              <button onClick={() => setActiveMenu('beli')} className="text-xs text-indigo-400 hover:underline mt-1">Mulai belanja →</button>
            </div>
          ) : (
            transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    {tx.type === 'deposit' ? <Wallet className="w-3.5 h-3.5 text-indigo-400" /> : <Package className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{tx.title || 'Layanan Digital'}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={tx.status} />
                  <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">Rp {(tx.amount||0).toLocaleString('id-ID')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ─── DEPOSIT ────────────────────────────────────────────────────────────────
  const renderDeposit = () => {
    const nominal = parseInt(depositAmount) || 0;
    const isOver = nominal > MAX_DEPOSIT;
    const isUnder = nominal > 0 && nominal < MIN_DEPOSIT;
    const showPreview = nominal >= MIN_DEPOSIT && nominal <= MAX_DEPOSIT;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Isi Saldo</h1>
          <p className="text-xs text-zinc-500 mt-1">Transfer via QRIS statis, admin verifikasi manual.</p>
        </div>
        <div className="max-w-md space-y-4">
          <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">Nominal (Rp)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder={`${MIN_DEPOSIT.toLocaleString('id-ID')} – ${MAX_DEPOSIT.toLocaleString('id-ID')}`}
                className={`w-full px-3 py-2.5 bg-zinc-950 border rounded-lg text-white text-sm focus:outline-none transition-colors placeholder-zinc-700 ${isOver||isUnder ? 'border-rose-500/60 focus:border-rose-400' : 'border-zinc-800 focus:border-indigo-500'}`}
              />
              {isOver && <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Maks. Rp {MAX_DEPOSIT.toLocaleString('id-ID')} per transaksi</p>}
              {isUnder && <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Min. Rp {MIN_DEPOSIT.toLocaleString('id-ID')}</p>}
            </div>
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[20000,50000,100000,200000].map(amt => (
                <button key={amt} onClick={() => setDepositAmount(amt.toString())} className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[11px] text-zinc-300 font-medium transition-colors">
                  {(amt/1000).toFixed(0)}rb
                </button>
              ))}
            </div>
            {showPreview && (
              <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800/60 text-xs overflow-hidden">
                <div className="flex justify-between px-3 py-2.5 text-zinc-400"><span>Nominal saldo</span><span className="tabular-nums">Rp {nominal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between px-3 py-2.5 text-amber-400"><span>Biaya admin</span><span className="tabular-nums">+Rp {DEPOSIT_FEE.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between px-3 py-2.5 text-indigo-400 font-bold bg-indigo-500/5"><span>Total ke QRIS</span><span className="tabular-nums">Rp {(nominal+DEPOSIT_FEE).toLocaleString('id-ID')}</span></div>
              </div>
            )}
            <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-lg p-3 flex items-center gap-3">
              <QrCode className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">QRIS Statis</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">E-Wallet & Mobile Banking</p>
              </div>
              <div className="ml-auto w-3.5 h-3.5 rounded-full border border-indigo-500 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-indigo-500" /></div>
            </div>
            <button onClick={handleCreateDeposit} disabled={!depositAmount||!isDepositValid()||actionLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
              {actionLoading ? 'Membuat tiket...' : 'Tampilkan QRIS'}
            </button>
          </div>
        </div>

        {/* QRIS Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-[#1a1a1f] border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
              {/* Drag handle mobile */}
              <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-zinc-700 rounded-full" /></div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Selesaikan Pembayaran</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Scan QR di bawah, lalu konfirmasi ke admin</p>
                </div>
                {/* Total */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Total Dibayar</p>
                  <p className="text-2xl font-bold text-white tabular-nums">Rp {getTotalBayar().toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">termasuk fee Rp {DEPOSIT_FEE.toLocaleString('id-ID')}</p>
                </div>
                {/* QR */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`bg-white rounded-xl p-3 shadow transition-all duration-300 overflow-hidden ${isZoomed ? 'w-64 h-64' : 'w-48 h-48'}`}>
                    <QuickPinchZoom ref={pinchZoomRef} onUpdate={onUpdate} wheelScaleFactor={1.05} draggableUnZoomed={false}>
                      <div ref={qrisRef} className="w-full h-full flex items-center justify-center origin-center">
                        <img src={STATIC_QRIS_URL} alt="QRIS" onClick={() => setIsZoomed(!isZoomed)} className="w-full h-full object-contain cursor-zoom-in" draggable="false" />
                      </div>
                    </QuickPinchZoom>
                  </div>
                  <p className="text-[10px] text-zinc-600">Ketuk untuk perbesar</p>
                </div>
                {/* Warning */}
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 text-[11px] text-amber-300 space-y-1">
                  <p className="font-semibold">Setelah transfer:</p>
                  <p>Hubungi admin via WhatsApp agar saldo segera ditambahkan.</p>
                </div>
                {/* Actions */}
                <div className="space-y-2">
                  <a href={buildWaMessage()} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    Konfirmasi ke Admin — {ADMIN_PHONE_DISPLAY}
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleCancelDeposit} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg transition-colors">Batalkan</button>
                    <button onClick={() => { setIsModalOpen(false); setActiveTxId(null); setDepositAmount(''); triggerPopup('success', 'Konfirmasi Terkirim', 'Admin akan segera memproses pembayaran kamu.'); }} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                      Sudah Bayar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── BELI ────────────────────────────────────────────────────────────────────
  const renderBeli = () => {
    const products = activeCategory === 'MPA' ? apiProductsMPA : apiProductsXLA;
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Beli Produk</h1>
          <p className="text-xs text-zinc-500 mt-1">Pilih kategori, cari produk, lalu masukkan nomor tujuan.</p>
        </div>
        {/* Category tabs */}
        <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
          {(['MPA','XLA'] as const).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Smartphone className="w-3 h-3" /> AKRAB {cat}
            </button>
          ))}
        </div>

        {loadingProducts ? (
          <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-10 text-center text-xs text-zinc-500 animate-pulse">Mengambil katalog produk...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Produk list — 3 col */}
            <div className="lg:col-span-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pilih Produk</p>
              {products.length === 0 ? (
                <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-600">
                  Produk AKRAB {activeCategory} tidak tersedia.
                </div>
              ) : (
                <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl divide-y divide-zinc-800/60 overflow-hidden">
                  {products.map((prod: any, i: number) => {
                    const isSelected = selectedProduct?.code === prod.code;
                    const displayPrice = (prod.price || 0) + (activeCategory === 'XLA' ? XLA_PRICE_MARKUP : 0);
                    const description = getProductDescription(prod);
                    return (
                      <div key={i} onClick={() => setSelectedProduct(prod)} className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500' : 'hover:bg-zinc-800/40 border-l-2 border-l-transparent'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <Layers className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-600'}`} />
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{prod.name || 'Paket Layanan'}</p>
                            {description && (
                              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed line-clamp-2">{description}</p>
                            )}
                            <p className="text-[10px] text-zinc-600 mt-0.5">
                              Stok: <span className={prod.stock === 'Tersedia' || prod.stock > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                {typeof prod.stock === 'string' ? prod.stock : prod.stock || 0}
                              </span>
                              {prod.is_trial && <span className="ml-2 text-amber-500">Trial</span>}
                            </p>
                          </div>
                        </div>
                        {/* Harga tampilan: XLA +1000 */}
                        <p className={`text-xs font-bold tabular-nums shrink-0 ${isSelected ? 'text-indigo-300' : 'text-zinc-400'}`}>
                          Rp {displayPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order form — 2 col */}
            <div className="lg:col-span-2">
              <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl p-5 space-y-4 lg:sticky lg:top-6">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Informasi Pesanan</p>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Nomor Pelanggan</label>
                  <input type="text" value={targetPhoneNumber} onChange={e => setTargetPhoneNumber(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-700" />
                </div>
                {selectedProduct ? (
                  <>
                    <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800/60 text-xs overflow-hidden">
                      <div className="flex justify-between px-3 py-2.5"><span className="text-zinc-500">Kategori</span><span className="text-indigo-400 font-semibold">AKRAB {activeCategory}</span></div>
                      <div className="flex justify-between px-3 py-2.5"><span className="text-zinc-500">Produk</span><span className="text-white font-medium text-right max-w-[60%] truncate">{selectedProduct.name}</span></div>
                      <div className="flex justify-between px-3 py-2.5"><span className="text-zinc-500">Kode</span><span className="text-amber-400 font-mono">{selectedProduct.code}</span></div>
                      {getProductDescription(selectedProduct) && (
                        <div className="px-3 py-2.5">
                          <p className="text-zinc-500 mb-1">Deskripsi</p>
                          <p className="text-zinc-300 leading-relaxed">{getProductDescription(selectedProduct)}</p>
                        </div>
                      )}
                      {/* Harga di order form: XLA +1000 */}
                      <div className="flex justify-between px-3 py-2.5 bg-emerald-500/5">
                        <span className="text-zinc-500">Harga</span>
                        <span className="text-emerald-400 font-bold tabular-nums">
                          Rp {getEffectivePrice(selectedProduct).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <button onClick={preCheckBeliPaket} disabled={actionLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                      {actionLoading ? 'Memproses...' : 'Beli Sekarang'}
                    </button>
                  </>
                ) : (
                  <div className="py-6 text-center text-xs text-zinc-600 flex flex-col items-center gap-2">
                    <Package className="w-6 h-6 text-zinc-700" />
                    Pilih produk di sebelah kiri
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm modal */}
        {isConfirmOrderModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
            <div className="bg-[#1a1a1f] border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
              <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-zinc-700 rounded-full" /></div>
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-3">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Konfirmasi Pesanan</h3>
                  <p className="text-xs text-zinc-500 mt-1">Pastikan nomor tujuan sudah benar.</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Nomor Tujuan</p>
                  <p className="text-xl font-bold text-white font-mono tracking-wider">{targetPhoneNumber}</p>
                </div>
                <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800/60 text-xs overflow-hidden">
                  <div className="flex justify-between px-3 py-2.5"><span className="text-zinc-500">Produk</span><span className="text-white font-medium">{selectedProduct.name}</span></div>
                  {getProductDescription(selectedProduct) && (
                    <div className="px-3 py-2.5">
                      <p className="text-zinc-500 mb-1">Deskripsi</p>
                      <p className="text-zinc-300 leading-relaxed">{getProductDescription(selectedProduct)}</p>
                    </div>
                  )}
                  {/* Harga di modal konfirmasi: XLA +1000 */}
                  <div className="flex justify-between px-3 py-2.5 bg-emerald-500/5">
                    <span className="text-zinc-500">Harga</span>
                    <span className="text-emerald-400 font-bold">
                      Rp {getEffectivePrice(selectedProduct).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setIsConfirmOrderModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2.5 rounded-lg transition-colors">Periksa Lagi</button>
                  <button onClick={handleBeliPaketAkrab} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors">Ya, Lanjutkan</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── RIWAYAT ─────────────────────────────────────────────────────────────────
  const renderRiwayat = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Riwayat</h1>
        <p className="text-xs text-zinc-500 mt-1">Seluruh mutasi dan tiket kamu.</p>
      </div>
      <div className="bg-[#1a1a1f] border border-zinc-800 rounded-xl overflow-hidden">
        {/* Mobile: card list */}
        <div className="lg:hidden divide-y divide-zinc-800/60">
          {transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <Inbox className="w-8 h-8 text-zinc-700" />
              <p className="text-xs text-zinc-500">Belum ada transaksi</p>
            </div>
          ) : transactions.map((tx: any) => (
            <div key={tx.id} className="flex items-start justify-between px-4 py-4 gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  {tx.type === 'deposit' ? <Wallet className="w-3.5 h-3.5 text-indigo-400" /> : <Package className="w-3.5 h-3.5 text-zinc-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{tx.title || 'Layanan Digital'}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 font-mono truncate">{tx.id}</p>
                  {(tx.destination||tx.note) && <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{tx.destination||tx.note}</p>}
                  <p className="text-[10px] text-zinc-600 flex items-center gap-1 mt-1"><Clock className="w-2.5 h-2.5" />{tx.date}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <StatusBadge status={tx.status} />
                <p className="text-xs font-semibold text-zinc-300 tabular-nums mt-1.5">Rp {(tx.amount||0).toLocaleString('id-ID')}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Layanan</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Target</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Nominal</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Tanggal</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-xs text-zinc-600">Belum ada transaksi.</td></tr>
              ) : transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-white">{tx.title||'Layanan Digital'}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{tx.id}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-400">{tx.destination||tx.note||'-'}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-zinc-200 tabular-nums">Rp {(tx.amount||0).toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{tx.date}</td>
                  <td className="px-5 py-3.5 text-right"><StatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  if (pageLoading) return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-500">Memuat dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Toast */}
      {notification?.show && (
        <Toast n={notification} onClose={() => setNotification(null)} />
      )}

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-56 lg:w-60 shrink-0 border-r border-zinc-800/60 bg-[#0f0f11] sticky top-0 h-screen flex flex-col">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">A</div>
              <span className="font-bold text-sm text-white">Arsynet Store</span>
            </div>
          </div>

          {/* User */}
          <div className="px-4 py-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center">{user.initials}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{user.status}</p>
              </div>
            </div>
            {/* WhatsApp button */}
            <button
              onClick={openAdminWhatsapp}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg border border-emerald-500/40 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Hubungi Admin</span>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-3 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border-l-2 ${isActive ? 'border-l-indigo-500 bg-zinc-800/60 text-white' : 'border-l-transparent text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30'}`}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-zinc-800/60">
            <button onClick={() => signOut(auth).then(() => router.push('/'))} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
            {activeMenu === 'dashboard' && renderDashboard()}
            {activeMenu === 'deposit'   && renderDeposit()}
            {activeMenu === 'beli'      && renderBeli()}
            {activeMenu === 'riwayat'   && renderRiwayat()}
          </div>
        </main>
      </div>

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 bg-[#0f0f11]/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-black text-[10px]">A</div>
            <span className="font-bold text-sm text-white">Arsynet Store</span>
          </div>
        </header>

        <button
          onClick={openAdminWhatsapp}
          aria-label={`Hubungi admin WhatsApp ${ADMIN_PHONE_DISPLAY}`}
          className="fixed right-4 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-transform hover:scale-105 active:scale-95"
        >
          <WhatsappLogo className="h-5 w-5" />
        </button>

        {/* Mobile content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24">
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'deposit'   && renderDeposit()}
          {activeMenu === 'beli'      && renderBeli()}
          {activeMenu === 'riwayat'   && renderRiwayat()}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0f0f11]/95 backdrop-blur-md border-t border-zinc-800/60 flex">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-semibold uppercase tracking-wide">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => signOut(auth).then(() => router.push('/'))} className="flex-1 flex flex-col items-center gap-1 py-3 text-zinc-700 hover:text-rose-400 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Keluar</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
