import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, runTransaction, updateDoc, setDoc } from 'firebase/firestore';

// 1. FIREBASE CONFIG
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: process.env.FIREBASE_DATABASE_URL ?? '',
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.FIREBASE_APP_ID ?? ''
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const FLAZDATA_API_KEY = process.env.FLAZDATA_API_KEY ?? '';
const AKRAB_ACCOUNT_CODE = process.env.AKRAB_ACCOUNT_CODE ?? '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { destination, productCode, productPrice, productName, uid } = body;

    // 1. Validasi data input awal
    if (!destination || !productCode || !productPrice || !uid) {
      return NextResponse.json({ success: false, message: "Data request tidak lengkap." }, { status: 400 });
    }

    const userDocRef = doc(db, "users", uid);
    const invoiceId = `INV-${Date.now()}`;
    const invoiceRef = doc(db, "users", uid, "transactions", invoiceId);

    // 2. TAHAP 1: Amankan & Potong Saldo Duluan Lewat Firebase Transaction (Anti-Minus)
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userDocRef);
      
      if (!userSnap.exists()) {
        throw new Error("Data pengguna tidak ditemukan di database.");
      }

      const userData = userSnap.data();
      const currentBalance = userData.balance || 0;

      if (currentBalance < productPrice) {
        throw new Error("Saldo Anda tidak mencukupi untuk melakukan transaksi ini.");
      }

      // Potong saldo di awal
      transaction.update(userDocRef, {
        balance: currentBalance - productPrice,
        totalSpent: (userData.totalSpent || 0) + productPrice,
        successfulTransactions: (userData.successfulTransactions || 0) + 1
      });

      // Buat invoice dengan status diproses
      transaction.set(invoiceRef, {
        title: `Pembelian ${productName}`,
        amount: productPrice,
        status: "proses",
        type: "pembelian",
        method: "out",
        destination: destination,
        createdAt: new Date()
      });
    });

    // 3. TAHAP 2: Tembak API Flazdata DI LUAR TRANSACTION (Aman dari Double-Buy)
    try {
      const flazdataRes = await fetch("https://end.flazdata.com/api/utility/product/invite", {
        method: "POST",
        headers: {
          "x-api-key": FLAZDATA_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          code: AKRAB_ACCOUNT_CODE,
          destination: destination,
          product_code: productCode
        })
      });

      const flazdataResult = await flazdataRes.json();

      // JIKA API FLAZDATA BERHASIL
      if (flazdataResult.success) {
        await updateDoc(invoiceRef, {
          status: "success",
          flazdata_trx_id: flazdataResult.data?.trx_id || ""
        });

        return NextResponse.json({ success: true, data: flazdataResult.data });
      } 
      
      // JIKA API FLAZDATA GAGAL (REFUND SALDO USER)
      else {
        await runTransaction(db, async (refundTx) => {
          const userSnap = await refundTx.get(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            refundTx.update(userDocRef, {
              balance: (userData.balance || 0) + productPrice,
              totalSpent: Math.max(0, (userData.totalSpent || 0) - productPrice),
              successfulTransactions: Math.max(0, (userData.successfulTransactions || 0) - 1)
            });
          }
          refundTx.update(invoiceRef, { status: "failed", note: flazdataResult.message });
        });

        return NextResponse.json({ success: false, message: flazdataResult.message || "Ditolak oleh gateway." }, { status: 422 });
      }

    } catch (apiErr) {
      // JIKA KONEKSI INTERNET/GATEWAY CRASH (REFUND SALDO USER)
      await runTransaction(db, async (refundTx) => {
        const userSnap = await refundTx.get(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          refundTx.update(userDocRef, {
            balance: (userData.balance || 0) + productPrice,
            totalSpent: Math.max(0, (userData.totalSpent || 0) - productPrice),
            successfulTransactions: Math.max(0, (userData.successfulTransactions || 0) - 1)
          });
        }
        refundTx.update(invoiceRef, { status: "failed", note: "RTO / Gagal terhubung ke Flazdata." });
      });

      return NextResponse.json({ success: false, message: "Gagal terhubung ke server Flazdata Gateway." }, { status: 504 });
    }

  } catch (error: any) {
    console.error("Crash pada API Invite Route:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
  }
}