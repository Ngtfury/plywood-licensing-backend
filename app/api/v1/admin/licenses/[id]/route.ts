import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Admin key required.' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 1. Fetch license details first
    const { data: license, error: fetchErr } = await db
      .from('licenses')
      .select('id, license_key')
      .eq('id', id)
      .single();

    if (fetchErr || !license) {
      return NextResponse.json({ success: false, message: 'License not found.' }, { status: 404 });
    }

    // 2. Remove associated device seats
    await db.from('device_seats').delete().eq('license_id', license.id);

    // 3. Remove associated logs
    await db.from('license_logs').delete().eq('license_id', license.id);
    await db.from('license_logs').delete().eq('license_id', license.license_key);

    // 4. Delete the license permanently
    const { error: delErr } = await db.from('licenses').delete().eq('id', license.id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'License permanently deleted.' });
  } catch (err: any) {
    console.error('Delete license error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
