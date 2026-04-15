import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  
  // Hapus cookie token dan role dengan mengeset Max-Age ke 0
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  response.cookies.set('role', '', { maxAge: 0, path: '/' });

  return response;
}
