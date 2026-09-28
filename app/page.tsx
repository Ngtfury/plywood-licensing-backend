'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Building2, 
  Laptop, 
  Plus, 
  RefreshCw, 
  Copy, 
  Check, 
  Ban, 
  Clock, 
  AlertTriangle,
  Lock,
  Unlock,
  LogOut,
  ShieldAlert,
  Trash2
} from 'lucide-react';

interface LicenseItem {
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
  device_seats?: Array<{
    id: string;
    machine_id: string;
    device_name: string;
    is_active: boolean;
    last_validated_at: string;
  }>;
}

export default function AdminDashboard() {
  // Auth state
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [keyInput, setKeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard state
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [plan, setPlan] = useState('enterprise');
  const [devices, setDevices] = useState('2');
  const [validityMonths, setValidityMonths] = useState('12');
  const [creating, setCreating] = useState(false);

  // Check stored credentials on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('ply_admin_key');
    if (saved) {
      verifyKey(saved);
    } else {
      setAuthChecking(false);
    }
  }, []);

  const verifyKey = async (key: string) => {
    setAuthChecking(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/admin/auth', {
        method: 'POST',
        headers: { 'x-admin-key': key }
      });
      const data = await res.json();
      if (data.success) {
        setAdminKey(key);
        setIsAuthenticated(true);
        sessionStorage.setItem('ply_admin_key', key);
        fetchLicenses(key);
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem('ply_admin_key');
        setAuthError(data.message || 'Invalid Master Admin Key');
      }
    } catch (err: any) {
      setIsAuthenticated(false);
      setAuthError('Failed to communicate with authentication server');
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    verifyKey(keyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ply_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setLicenses([]);
  };

  const fetchLicenses = async (keyToUse = adminKey) => {
    if (!keyToUse) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/licenses', {
        headers: { 'x-admin-key': keyToUse }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !adminKey) return;

    setCreating(true);
    try {
      const res = await fetch('/api/v1/admin/licenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          plan,
          max_devices: devices,
          months: validityMonths,
        }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setCompanyName('');
        fetchLicenses();
      } else {
        alert('Failed to issue license: ' + data.message);
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRevoke = async (lic: LicenseItem) => {
    const action = lic.is_revoked ? 'restore' : 'revoke';
    if (!confirm(`Are you sure you want to ${action} the license for "${lic.company_name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/licenses/${lic.id}/revoke`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ is_revoked: !lic.is_revoked }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        fetchLicenses();
      } else {
        alert('Failed: ' + data.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteLicense = async (lic: LicenseItem) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete the license for "${lic.company_name}" (${lic.license_key})?\n\nThis action cannot be undone and will immediately unauthorize all connected devices.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/licenses/${lic.id}`, {
        method: 'DELETE',
        headers: { 
          'x-admin-key': adminKey
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        fetchLicenses();
      } else {
        alert('Failed to delete license: ' + data.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // If checking initial session
  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, render Security Gatekeeper Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
        <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Licensing Authority</h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Protected administration server. Authorized credentials required to access management controls.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Master Admin Key</label>
              <input
                type="password"
                placeholder="Enter secret authorization key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoFocus
                required
                className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authChecking || !keyInput.trim()}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] font-medium text-sm text-white transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800/60 text-center">
            <p className="text-[11px] text-zinc-500">
              Balaji Plywood ERP Cryptographic Licensing Authority
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Summary Metrics
  const totalIssued = licenses.length;
  const activeLicenses = licenses.filter((l) => !l.is_revoked && new Date() <= new Date(l.expires_at)).length;
  const totalHardwareSeats = licenses.reduce((acc, l) => {
    return acc + (l.device_seats?.filter((s) => s.is_active)?.length || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Licensing Authority</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cryptographic Ed25519 Software Licensing & Device Seat Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLicenses()}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] font-medium text-xs text-white transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New License</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer text-xs"
            title="Lock Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Total Issued Licenses</p>
            <p className="text-2xl font-bold text-white mt-1">{totalIssued}</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 text-zinc-300">
            <Key className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Active Companies</p>
            <p className="text-2xl font-bold text-white mt-1">{activeLicenses}</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 text-zinc-300">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">Bound Hardware Seats</p>
            <p className="text-2xl font-bold text-white mt-1">{totalHardwareSeats}</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 text-zinc-300">
            <Laptop className="w-5 h-5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Licenses Table Card */}
      <div className="max-w-7xl mx-auto bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur">
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white text-sm">Issued Software Licenses</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Overview of all customer licenses, active PCs, and validity windows.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Client Company</th>
                <th className="py-3 px-4 font-semibold">License Key</th>
                <th className="py-3 px-4 font-semibold">Plan</th>
                <th className="py-3 px-4 font-semibold">Hardware Seats</th>
                <th className="py-3 px-4 font-semibold">Expiration</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 text-xs">
                    No licenses issued yet. Click "Issue New License" above to create your first license key.
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const activeCount = lic.device_seats?.filter((s) => s.is_active)?.length || 0;
                  const isExpired = new Date() > new Date(lic.expires_at);

                  return (
                    <tr key={lic.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span>{lic.company_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                          <span>{lic.license_key}</span>
                          <button
                            onClick={() => handleCopy(lic.license_key)}
                            className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
                            title="Copy License Key"
                          >
                            {copiedKey === lic.license_key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize font-medium text-emerald-400">{lic.plan}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-zinc-200">{activeCount}</span>
                        <span className="text-zinc-500"> / {lic.max_devices} PCs</span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {new Date(lic.expires_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {lic.is_revoked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            REVOKED
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleRevoke(lic)}
                            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                              lic.is_revoked
                                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40'
                            }`}
                            title={lic.is_revoked ? 'Restore License' : 'Revoke License'}
                          >
                            {lic.is_revoked ? 'Restore' : 'Revoke'}
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic)}
                            className="p-1 rounded text-xs transition-colors cursor-pointer text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                            title="Permanently Delete License"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue License Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Issue New Client License
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">Client / Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Timber Works"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-medium">Plan Tier</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="standard">Standard</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-medium">Max Device Seats</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={devices}
                    onChange={(e) => setDevices(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">Subscription Validity</label>
                <select
                  value={validityMonths}
                  onChange={(e) => setValidityMonths(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">1 Year (12 Months)</option>
                  <option value="24">2 Years</option>
                  <option value="60">5 Years</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !companyName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Generate License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
