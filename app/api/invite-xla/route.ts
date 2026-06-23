import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const XLA_API_KEY = process.env.XLA_API_KEY ?? '';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.FIREBASE_APP_ID ?? '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function POST(req: Request) {
  try {
    const { destination, productCode, productPrice, productName, uid } = await req.json();

    const reff_id = `XLA-${Date.now()}`;

    const res = await fetch(
      `https://panel.khfy-store.com/api_v2/trx?produk=${productCode}&tujuan=${destination}&reff_id=${reff_id}&api_key=${XLA_API_KEY}`,
      { method: 'GET' }
    );

    const result = await res.json();
    const isSuccess = result.ok === true;

    // Catat transaksi ke Firestore
    await addDoc(collection(db, 'users', uid, 'transactions'), {
      title: `AKRAB XLA - ${productName}`,
      destination,
      amount: productPrice,
      status: isSuccess ? 'success' : 'failed',
      type: 'purchase',
      method: 'out',
      reff_id,
      createdAt: serverTimestamp(),
    });

    if (isSuccess) {
      // Kurangi saldo & update statistik user
      await updateDoc(doc(db, 'users', uid), {
        balance: increment(-productPrice),
        totalSpent: increment(productPrice),
        successfulTransactions: increment(1),
      });

      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: result.msg || 'Transaksi ditolak provider' 
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Koneksi error' }, { status: 500 });
  }
}