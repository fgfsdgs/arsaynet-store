import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'produk-kedua.json');

    // Cek apakah file data produk sudah ada atau belum
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        message: "Belum ada data produk dari webhook Flazdata. Silakan jalankan 'Push/Send' dari web Flazdata." 
      }, { status: 400 });
    }

    // Baca datanya
    const fileData = fs.readFileSync(filePath, 'utf-8');
    const dataProduk = JSON.parse(fileData);

    return NextResponse.json({
      success: true,
      data: dataProduk
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}