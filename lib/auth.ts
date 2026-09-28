import { NextRequest } from 'next/server';

export const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'balaji_admin_sec_master_2026';
export const APP_CLIENT_SECRET = process.env.APP_CLIENT_SECRET || 'ply_client_sec_e7b29a14d8';

export function verifyAdmin(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(key && key === ADMIN_SECRET_KEY);
}

export function verifyClientApp(req: NextRequest): boolean {
  const secret = req.headers.get('x-app-secret');
  return Boolean(secret && secret === APP_CLIENT_SECRET);
}
