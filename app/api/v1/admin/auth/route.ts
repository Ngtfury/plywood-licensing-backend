import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Invalid Admin Secret Key' }, { status: 401 });
  }
  return NextResponse.json({ success: true, message: 'Authenticated' });
}
