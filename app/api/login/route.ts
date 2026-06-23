import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();

  // Memeriksa password dari .env.local
  if (password === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false }, { status: 401 });
  }
}