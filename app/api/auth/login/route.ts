// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_jelantahub_super_aman_123';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ message: 'Username dan Password wajib diisi!' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: identifier },
    });

    if (!user) {
      return NextResponse.json({ message: 'Username tidak ditemukan.' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ message: 'Akun Anda dinonaktifkan. Hubungi Admin.' }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Password salah.' }, { status: 401 });
    }

    const payload = {
      id: user.id_user,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    const response = NextResponse.json({
      access_token: token,
      user: {
        id_user: user.id_user,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    }, { status: 200 });

    // Set cookie untuk auth middleware
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    
    response.cookies.set('role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;

  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      message: `Error Server: ${message}` 
    }, { status: 500 });
  }
}