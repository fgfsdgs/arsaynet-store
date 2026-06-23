'use client';

import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, runTransaction, updateDoc } from 'firebase/firestore';
import {
  Users,
  CreditCard,
  Clock,
  ShieldCheck,
  RefreshCw,
  Check,
  X,
  Wallet,
  Coins,
  Search,
  ChevronRight,
  AlertCircle,
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
const db = getFirestore(app);

// ─── Avatar component ────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = (name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    'from-indigo-500 to-violet-600',
    'from-sky-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
  ];
  const colorIdx = initials.charCodeAt(0) % colors.length;
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[11px]';
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, pulse }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub: string; accent: 'indigo' | 'amber'; pulse?: boolean;
}) {
  const ring = accent === 'indigo'
    ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400'
    : 'border-amber-500/20 bg-amber-500/5 text-amber-400';
  const val = accent === 'indigo' ? 'text-white' : 'text-amber-300';

  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-hidden group hover:border-zinc-700 transition-all duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent === 'indigo' ? 'from-indigo-500/3' : 'from-amber-500/3'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-3xl font-bold tracking-tight ${val} leading-none`}>{value}</p>
          <p className="text-xs text-zinc-600 mt-1.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl border ${ring} flex items-center justify-center shrink-0`}>
          {pulse ? <span className="relative flex items-center justify-center">{icon}<span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" /></span> : icon}
        </div>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 tracking-wide">
      {label}
    </span>
  );
}

// ─── Mobile Deposit Card ──────────────────────────────────────────────────────
function DepositCard({ dep, onApprove, onReject, btnLoading }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={dep.userName} size="sm" />
          <div>
            <p className="text-xs font-semibold text-white">{dep.userName}</p>
            <p className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate max-w-[140px]">{dep.id}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-400 font-mono">Rp {(dep.amount || 0).toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{dep.date}</p>
        </div>
      </div>
      <div className="flex gap-2 pt-1 border-t border-zinc-800/60">
        <button
          onClick={() => onApprove(dep.id, dep.userUid, dep.amount)}
          disabled={btnLoading !== null}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[11px] font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" /> Setujui
        </button>
        <button
          onClick={() => onReject(dep.id, dep.userUid)}
          disabled={btnLoading !== null}
          className="flex-1 bg-zinc-800 hover:bg-rose-950/60 border border-zinc-700/60 hover:border-rose-900/50 text-zinc-400 hover:text-rose-400 text-[11px] font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <X className="w-3.5 h-3.5" /> Tolak
        </button>
      </div>
    </div>
  );
}

// ─── Mobile User Card ─────────────────────────────────────────────────────────
function UserCard({ usr, onAdjust }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={usr.name || 'U'} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{usr.name || 'Tanpa Nama'}</p>
            <p className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">{usr.uid}</p>
            <div className="mt-1.5"><Badge label={usr.status || 'Klien Aktif'} /></div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white font-mono">Rp {(usr.balance || 0).toLocaleString('id-ID')}</p>
          <button
            onClick={() => onAdjust(usr.uid, usr.balance, usr.name || 'User')}
            className="mt-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-indigo-500 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer font-medium text-zinc-400 text-[10px]"
          >
            <Wallet className="w-3 h-3" /> Atur
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'deposits' | 'users'>('deposits');

  useEffect(() => {
    let subTxUnsubscribers: (() => void)[] = [];
    const usersRef = collection(db, "users");

    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersData: any[] = [];
      subTxUnsubscribers.forEach(unsub => unsub());
      subTxUnsubscribers = [];
      setPendingDeposits([]);

      snapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        usersData.push({ uid: userDoc.id, ...userData });

        const txRef = collection(db, "users", userDoc.id, "transactions");
        const unsubTx = onSnapshot(txRef, (txSnapshot) => {
          txSnapshot.forEach((txDoc) => {
            const txData = txDoc.data();
            if ((txData.type === 'deposit' || txData.method === 'in') && txData.status === 'pending') {
              setPendingDeposits(prev => {
                const filtered = prev.filter((item: any) => item.id !== txDoc.id);
                let formattedDate = '-';
                if (txData.createdAt) {
                  const dateObj = txData.createdAt.toDate ? txData.createdAt.toDate() : new Date(txData.createdAt);
                  formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' });
                }
                return [...filtered, { id: txDoc.id, userUid: userDoc.id, userName: userData.name || 'Tanpa Nama', ...txData, date: formattedDate }];
              });
            } else {
              setPendingDeposits(prev => prev.filter((item: any) => item.id !== txDoc.id));
            }
          });
        }, (error) => console.error(`Gagal memuat transaksi user ${userDoc.id}:`, error));

        subTxUnsubscribers.push(unsubTx);
      });

      setUsersList(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Gagal memuat database users:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      subTxUnsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const handleApproveDeposit = async (txId: string, userUid: string, amount: number) => {
    if (!confirm(`Setujui isi saldo sebesar Rp ${amount.toLocaleString('id-ID')}?`)) return;
    setBtnLoading(txId);
    try {
      const userDocRef = doc(db, "users", userUid);
      const txDocRef = doc(db, "users", userUid, "transactions", txId);
      await runTransaction(db, async (transaction) => {
        const userSnapshot = await transaction.get(userDocRef);
        if (!userSnapshot.exists()) throw new Error("User tidak ditemukan!");
        const currentBalance = userSnapshot.data().balance || 0;
        transaction.update(userDocRef, { balance: currentBalance + parseInt(String(amount)) });
        transaction.update(txDocRef, { status: 'success' });
      });
      alert("Deposit disetujui! Saldo berhasil ditambahkan.");
    } catch (error: any) {
      alert("Gagal memproses: " + error.message);
    } finally {
      setBtnLoading(null);
    }
  };

  const handleRejectDeposit = async (txId: string, userUid: string) => {
    if (!confirm("Tolak permintaan deposit ini?")) return;
    setBtnLoading(txId);
    try {
      await updateDoc(doc(db, "users", userUid, "transactions", txId), { status: 'failed' });
      alert("Permintaan deposit ditolak.");
    } catch (error: any) {
      alert("Gagal menolak: " + error.message);
    } finally {
      setBtnLoading(null);
    }
  };

  const handleAdjustBalance = async (userUid: string, currentBalance: number, name: string) => {
    const input = prompt(`Saldo baru untuk ${name}:\n(Contoh: 50000)`);
    if (input === null || input.trim() === "") return;
    const newAmount = parseInt(input);
    if (isNaN(newAmount) || newAmount < 0) { alert("Nominal tidak valid!"); return; }
    try {
      await updateDoc(doc(db, "users", userUid), { balance: newAmount });
      alert(`Saldo ${name} diperbarui → Rp ${newAmount.toLocaleString('id-ID')}`);
    } catch (error: any) {
      alert("Gagal: " + error.message);
    }
  };

  const filteredUsers = usersList.filter((user: any) =>
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Membuka Panel Admin…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-zinc-300 min-h-screen antialiased selection:bg-indigo-500/20">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-white hidden sm:block">Panel Admin</span>
            <span className="text-sm font-bold text-white sm:hidden">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            {pendingDeposits.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                {pendingDeposits.length} Menunggu
              </div>
            )}
            <div className="bg-zinc-900 border border-zinc-800 text-[10px] px-2.5 py-1 rounded-full font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Live
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">

        {/* ── Page Title ── */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Panel Kendali</h1>
          <p className="text-sm text-zinc-500 mt-1">Konfirmasi deposit QRIS dan manajemen saldo pengguna secara real-time.</p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Total Pengguna"
            value={usersList.length}
            sub="Akun terdaftar"
            accent="indigo"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Menunggu Verifikasi"
            value={pendingDeposits.length}
            sub="Antrean masuk"
            accent="amber"
            pulse={pendingDeposits.length > 0}
          />
        </div>

        {/* ── Mobile Tab Navigation ── */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 lg:hidden">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg transition-all ${activeTab === 'deposits' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Verifikasi
            {pendingDeposits.length > 0 && (
              <span className="bg-amber-500 text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">{pendingDeposits.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg transition-all ${activeTab === 'users' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Coins className="w-3.5 h-3.5" />
            Pengguna
          </button>
        </div>

        {/* ── Deposit Section ── */}
        <div className={`${activeTab !== 'deposits' ? 'hidden lg:block' : ''}`}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Section Header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Verifikasi Pembayaran QRIS</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Tinjau dan konfirmasi transfer masuk</p>
                </div>
              </div>
              {pendingDeposits.length > 0 && (
                <span className="text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  {pendingDeposits.length} antrean
                </span>
              )}
            </div>

            {/* Mobile: Card List */}
            <div className="lg:hidden p-4 space-y-3">
              {pendingDeposits.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                    <Inbox className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Semua transaksi aman</p>
                    <p className="text-xs text-zinc-700 mt-0.5">Belum ada antrean baru saat ini</p>
                  </div>
                </div>
              ) : (
                pendingDeposits.map((dep: any) => (
                  <DepositCard key={dep.id} dep={dep} onApprove={handleApproveDeposit} onReject={handleRejectDeposit} btnLoading={btnLoading} />
                ))
              )}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Pengguna</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">ID Transaksi</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Waktu</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Jumlah</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {pendingDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                            <Inbox className="w-5 h-5 text-zinc-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-500">Semua transaksi aman</p>
                            <p className="text-xs text-zinc-700 mt-0.5">Belum ada antrean baru saat ini</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingDeposits.map((dep: any) => (
                      <tr key={dep.id} className="hover:bg-zinc-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={dep.userName} />
                            <span className="text-sm font-semibold text-white">{dep.userName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-zinc-500">{dep.id}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">{dep.date}</td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-sm">
                          Rp {(dep.amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveDeposit(dep.id, dep.userUid, dep.amount)}
                              disabled={btnLoading !== null}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[11px] font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-emerald-500/20 hover:shadow-md"
                            >
                              <Check className="w-3.5 h-3.5" /> Setujui
                            </button>
                            <button
                              onClick={() => handleRejectDeposit(dep.id, dep.userUid)}
                              disabled={btnLoading !== null}
                              className="bg-zinc-800 hover:bg-rose-950/60 border border-zinc-700 hover:border-rose-900/50 text-zinc-400 hover:text-rose-400 text-[11px] font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                              <X className="w-3.5 h-3.5" /> Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Users Section ── */}
        <div className={`${activeTab !== 'users' ? 'hidden lg:block' : ''}`}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Section Header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Kelola Saldo Member</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{usersList.length} akun terdaftar</p>
                </div>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama atau UID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-8 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-zinc-600"
                />
              </div>
            </div>

            {/* Mobile: Card List */}
            <div className="lg:hidden p-4 space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">Akun tidak ditemukan</p>
                </div>
              ) : (
                filteredUsers.map((usr: any) => (
                  <UserCard key={usr.uid} usr={usr} onAdjust={handleAdjustBalance} />
                ))
              )}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Pengguna</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">UID Firebase</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Saldo</th>
                    <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-zinc-600" />
                          </div>
                          <p className="text-sm text-zinc-500">Akun tidak ditemukan</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr: any) => (
                      <tr key={usr.uid} className="hover:bg-zinc-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={usr.name || 'U'} />
                            <span className="text-sm font-semibold text-white">{usr.name || 'Tanpa Nama'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-zinc-500 max-w-[160px] truncate">{usr.uid}</td>
                        <td className="px-6 py-4"><Badge label={usr.status || 'Klien Aktif'} /></td>
                        <td className="px-6 py-4 font-mono font-semibold text-white text-sm">
                          Rp {(usr.balance || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleAdjustBalance(usr.uid, usr.balance, usr.name || 'User')}
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-indigo-500 hover:text-indigo-300 rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer font-medium text-zinc-400 text-[11px] group/btn"
                          >
                            <Wallet className="w-3 h-3" /> Atur Saldo
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 -ml-0.5 transition-all" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            {filteredUsers.length > 0 && (
              <div className="px-5 py-3 border-t border-zinc-800/40 flex items-center justify-between">
                <p className="text-[11px] text-zinc-600">Menampilkan {filteredUsers.length} dari {usersList.length} pengguna</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}