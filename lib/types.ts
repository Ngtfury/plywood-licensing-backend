export interface License {
  id: string;
  license_key: string;
  company_id: string;
  company_name: string;
  plan: string;
  max_devices: number;
  features: string[];
  offline_grace_days: number;
  is_revoked: boolean;
  expires_at: string;
  created_at: string;
}

export interface DeviceSeat {
  id: string;
  license_id: string;
  machine_id: string;
  device_name: string;
  platform: string;
  app_version: string;
  is_active: boolean;
  activated_at: string;
  last_validated_at: string;
}

export interface LicenseLog {
  id: string;
  license_id: string;
  machine_id?: string;
  event_type: 'ACTIVATE' | 'VALIDATE' | 'DEACTIVATE' | 'REJECTED' | 'REVOKED';
  ip_address?: string;
  metadata?: Record<string, any>;
  created_at: string;
}
