'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        router.push('/dashboard');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: formData.username,
          email: formData.email,
          balance: 0,
          status: 'verified'
        });
        await signOut(auth);
        setMode('login');
        alert("Akun berhasil dibuat. Silakan login.");
      }
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/invalid-credential).' ? 'Email atau password salah.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 font-sans text-zinc-100">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tighter">Arsynet<span className="text-blue-500">Store</span></h1>
        <p className="text-zinc-500 text-sm mt-1">Kelola kebutuhan digital Anda di satu tempat</p>
      </div>

      <div className="w-full max-w-[360px]">
        {/* Card */}
        <div className="bg-[#18181b] p-6 rounded-2xl border border-[#27272a] shadow-xl">
          <h2 className="text-lg font-semibold mb-6">{mode === 'login' ? 'Masuk ke Akun' : 'Daftar Akun'}</h2>
          
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <input 
                placeholder="Nama Lengkap" className="w-full bg-[#0e0e10] p-3 rounded-lg border border-[#27272a] text-sm focus:border-blue-500 outline-none"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            )}
            <input 
              type="email" placeholder="Alamat Email" className="w-full bg-[#0e0e10] p-3 rounded-lg border border-[#27272a] text-sm focus:border-blue-500 outline-none"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <input 
              type="password" placeholder="Kata Sandi" className="w-full bg-[#0e0e10] p-3 rounded-lg border border-[#27272a] text-sm focus:border-blue-500 outline-none"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50">
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftar Sekarang'}
            </button>
          </form>
        </div>

        {/* Footer Toggle */}
        <button 
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-full mt-6 text-zinc-500 text-xs hover:text-white transition-colors"
        >
          {mode === 'login' ? 'Belum punya akun? Registrasi' : 'Sudah punya akun? Kembali login'}
        </button>
      </div>
    </div>
  );
}