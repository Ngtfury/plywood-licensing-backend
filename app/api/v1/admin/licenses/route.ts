import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

// GET all licenses with active device seat counts (Admin Only)
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Admin key required.' }, { status: 401 });
  }

  try {
    const { data: licenses, error } = await db
      .from('licenses')
      .select(`
        *,
        device_seats (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, licenses });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST create a new license (Admin Only)
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Admin key required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { company_name, plan = 'enterprise', max_devices = 1, months = 12, offline_grace_days = 14 } = body;

    if (!company_name) {
      return NextResponse.json({ success: false, message: 'Company name is required' }, { status: 400 });
    }

    // Generate unique license key: PLY-XXXX-XXXX-XXXX-XXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const genBlock = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const license_key = `PLY-${genBlock()}-${genBlock()}-${genBlock()}-${genBlock()}`;

    const now = new Date();
    const expires_at = new Date(now.getTime() + months * 30 * 86400000).toISOString();
    const company_id = 'COMP-' + Math.floor(1000 + Math.random() * 9000);
    const id = 'lic_' + Date.now();

    const newLic = {
      id,
      license_key,
      company_id,
      company_name,
      plan,
      max_devices: parseInt(max_devices, 10) || 1,
      features: ['*'],
      offline_grace_days: parseInt(offline_grace_days, 10) || 14,
      expires_at,
      is_revoked: false,
    };

    const { error: insErr } = await db.from('licenses').insert([newLic]);
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, license: newLic });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
