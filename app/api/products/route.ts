import { NextResponse } from "next/server";

const FLAZDATA_API_KEY = process.env.FLAZDATA_API_KEY ?? '';

export async function POST() {
  try {
    const res = await fetch("https://end.flazdata.com/api/utility/product/list", {
      method: "POST",
      headers: {
        "x-api-key": FLAZDATA_API_KEY,
        "accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({}) // Mengirim body kosong sesuai test curl yang sukses
    });

    const result = await res.json();
    
    // Kembalikan hasilnya langsung ke frontend kita
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error di API Route:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}