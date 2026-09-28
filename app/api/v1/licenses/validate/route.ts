import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { signLicensePayload } from '@/lib/crypto';
import { verifyClientApp } from '@/lib/auth';

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  if (!verifyClientApp(req)) {
    return NextResponse.json(
      { success: false, status: 'UNAUTHORIZED', message: 'Unauthorized client application.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { license_id, machine_id } = body;
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!license_id || !machine_id) {
      return NextResponse.json(
        { success: false, status: 'INVALID', message: 'License ID and Machine ID are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch license
    const { data: license } = await db
      .from('licenses')
      .select('*')
      .eq('license_key', license_id.trim().toUpperCase())
      .single();

    if (!license) {
      return NextResponse.json(
        { success: false, status: 'INVALID', message: 'License does not exist.' },
        { status: 404 }
      );
    }

    if (license.is_revoked) {
      return NextResponse.json(
        { success: false, status: 'REVOKED', message: 'Your license has been revoked.' },
        { status: 403 }
      );
    }

    const now = new Date();
    if (now > new Date(license.expires_at)) {
      return NextResponse.json(
        { success: false, status: 'EXPIRED', message: 'Your license has expired.' },
        { status: 403 }
      );
    }

    // 2. Verify active seat
    const { data: seat } = await db
      .from('device_seats')
      .select('*')
      .eq('license_id', license.id)
      .eq('machine_id', machine_id)
      .eq('is_active', true)
      .single();

    if (!seat) {
      return NextResponse.json(
        { success: false, status: 'DEVICE_NOT_AUTHORIZED', message: 'Device seat has been deactivated.' },
        { status: 403 }
      );
    }

    // 3. Update last validation time
    await db
      .from('device_seats')
      .update({ last_validated_at: now.toISOString() })
      .eq('id', seat.id);

    // 4. Extend offline grace period
    const graceDays = license.offline_grace_days || 14;
    const offlineUntil = new Date(now.getTime() + graceDays * 86400000).toISOString();

    const licensePayload = {
      license_id: license.license_key,
      company_id: license.company_id,
      company_name: license.company_name,
      plan: license.plan,
      machine_id,
      device_name: seat.device_name || 'This Windows PC',
      issued_at: license.created_at,
      expires_at: license.expires_at,
      offline_until: offlineUntil,
      features: license.features || ['*'],
    };

    const signature = signLicensePayload(licensePayload);

    await db.from('license_logs').insert([{
      license_id: license.id,
      machine_id,
      event_type: 'VALIDATE',
      ip_address: clientIp,
    }]);

    return NextResponse.json({
      success: true,
      status: 'ACTIVE',
      license: licensePayload,
      signature,
    });
  } catch (err: any) {
    console.error('Validation API error:', err);
    return NextResponse.json({ success: false, status: 'ERROR', message: err.message }, { status: 500 });
  }
}
