import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyClientApp } from '@/lib/auth';

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  if (!verifyClientApp(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized client application.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { license_id, machine_id } = body;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!license_id || !machine_id) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const { data: license } = await db
      .from('licenses')
      .select('id')
      .eq('license_key', license_id.trim().toUpperCase())
      .single();

    if (license) {
      await db
        .from('device_seats')
        .update({ is_active: false })
        .eq('license_id', license.id)
        .eq('machine_id', machine_id);

      await db.from('license_logs').insert([{
        license_id: license.id,
        machine_id,
        event_type: 'DEACTIVATE',
        ip_address: clientIp,
      }]);
    }

    return NextResponse.json({
      success: true,
      message: 'Device seat released successfully.',
    });
  } catch (err: any) {
    console.error('Deactivation API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
