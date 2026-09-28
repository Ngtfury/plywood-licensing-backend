import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Admin key required.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { is_revoked = true } = body;

    const { error } = await db
      .from('licenses')
      .update({ is_revoked })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, is_revoked });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
