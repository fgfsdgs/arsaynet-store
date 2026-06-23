import { NextResponse } from 'next/server';

const XLA_API_KEY = process.env.XLA_API_KEY ?? '';

export async function POST() {
  try {
    const res = await fetch(
      `https://panel.khfy-store.com/api_v2/list_product?api_key=${XLA_API_KEY}`,
      { method: 'GET' }
    );

    const result = await res.json();

    if (!result.ok) {
      return NextResponse.json({ success: false, message: 'Gagal ambil produk XLA' }, { status: 400 });
    }

    // Normalisasi field biar sama formatnya dengan MPA di dashboard
    const normalized = result.data.map((p: any) => ({
      code: p.kode_produk,
      name: p.nama_produk,
      price: p.harga_final,
      stock: p.kosong === 0 ? 'Tersedia' : 'Kosong',
      is_available: p.kosong === 0 && p.gangguan === 0,
      is_trial: false,
    }));

    return NextResponse.json({ success: true, data: normalized });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Koneksi error ke XLA' }, { status: 500 });
  }
}