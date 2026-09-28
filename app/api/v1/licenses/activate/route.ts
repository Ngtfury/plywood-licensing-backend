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
      { success: false, error_code: 'UNAUTHORIZED', message: 'Unauthorized client application.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { license_key, machine_id, device_name, platform, app_version } = body;

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!license_key || !machine_id) {
      return NextResponse.json(
        { success: false, error_code: 'INVALID_KEY', message: 'License key and machine ID are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch license from Supabase
    const { data: license, error: licErr } = await db
      .from('licenses')
      .select('*')
      .eq('license_key', license_key.trim().toUpperCase())
      .single();

    if (licErr || !license) {
      await db.from('license_logs').insert([{
        license_id: license_key,
        machine_id,
        event_type: 'REJECTED',
        ip_address: clientIp,
        metadata: { reason: 'License key not found' }
      }]);

      return NextResponse.json(
        { success: false, error_code: 'INVALID_KEY', message: 'The entered license key does not exist or has expired.' },
        { status: 404 }
      );
    }

    // 2. Check if revoked
    if (license.is_revoked) {
      await db.from('license_logs').insert([{
        license_id: license.id,
        machine_id,
        event_type: 'REJECTED',
        ip_address: clientIp,
        metadata: { reason: 'License is revoked' }
      }]);

      return NextResponse.json(
        { success: false, error_code: 'REVOKED', message: 'This license has been revoked by your administrator.' },
        { status: 403 }
      );
    }

    // 3. Check expiration
    const now = new Date();
    if (now > new Date(license.expires_at)) {
      await db.from('license_logs').insert([{
        license_id: license.id,
        machine_id,
        event_type: 'REJECTED',
        ip_address: clientIp,
        metadata: { reason: 'License is expired' }
      }]);

      return NextResponse.json(
        { success: false, error_code: 'EXPIRED', message: 'This software license has expired.' },
        { status: 403 }
      );
    }

    // 4. Check device seats
    const { data: activeSeats, error: seatErr } = await db
      .from('device_seats')
      .select('machine_id, is_active')
      .eq('license_id', license.id)
      .eq('is_active', true);

    const isCurrentMachineActive = activeSeats?.some(s => s.machine_id === machine_id);

    if (!isCurrentMachineActive && (activeSeats?.length || 0) >= license.max_devices) {
      await db.from('license_logs').insert([{
        license_id: license.id,
        machine_id,
        event_type: 'REJECTED',
        ip_address: clientIp,
        metadata: { reason: 'Max devices exceeded', active_count: activeSeats?.length, max: license.max_devices }
      }]);

      return NextResponse.json(
        {
          success: false,
          error_code: 'DEVICE_NOT_AUTHORIZED',
          message: `All authorized device seats for this license are currently in use (${license.max_devices} PC limit). Please deactivate an existing device first.`
        },
        { status: 409 }
      );
    }

    // 5. Register or update device seat
    await db.from('device_seats').upsert(
      {
        license_id: license.id,
        machine_id,
        device_name: device_name || 'This Windows PC',
        platform: platform || 'windows',
        app_version: app_version || '0.1.0',
        is_active: true,
        last_validated_at: now.toISOString(),
      },
      { onConflict: 'license_id,machine_id' }
    );

    // 6. Calculate offline grace period
    const graceDays = license.offline_grace_days || 14;
    const offlineUntil = new Date(now.getTime() + graceDays * 86400000).toISOString();

    // 7. Construct license payload
    const licensePayload = {
      license_id: license.license_key,
      company_id: license.company_id,
      company_name: license.company_name,
      plan: license.plan,
      machine_id,
      device_name: device_name || 'This Windows PC',
      issued_at: license.created_at,
      expires_at: license.expires_at,
      offline_until: offlineUntil,
      features: license.features || ['*'],
    };

    // 8. Sign with Ed25519
    const signature = signLicensePayload(licensePayload);

    // 9. Log activation
    await db.from('license_logs').insert([{
      license_id: license.id,
      machine_id,
      event_type: 'ACTIVATE',
      ip_address: clientIp,
      metadata: { device_name, platform, app_version }
    }]);

    return NextResponse.json({
      success: true,
      license: licensePayload,
      signature,
    });
  } catch (err: any) {
    console.error('Activation API error:', err);
    return NextResponse.json(
      { success: false, error_code: 'SERVER_ERROR', message: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
