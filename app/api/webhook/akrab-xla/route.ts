import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Log ini akan muncul di terminal npm run dev Anda
    console.log("Data AKRAB XLA diterima:", data);

    // Untuk sementara kita simpan di file JSON atau Database
    // Tapi untuk tes awal, kita kembalikan respons sukses
    return NextResponse.json({ status: 'success', message: 'Data diterima' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Gagal' }, { status: 500 });
  }
}