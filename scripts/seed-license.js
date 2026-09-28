const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Automatically parse .env.local if present
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
} catch (e) {}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or environment.");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function createInitialLicense() {
  const licenseKey = "PLY-2026-ABCD-EFGH-1001";
  console.log(`Connecting to ${supabaseUrl}...`);
  console.log(`Creating initial license: ${licenseKey}...`);

  const now = new Date();
  const future1Year = new Date(now.getTime() + 365 * 86400000).toISOString();

  const sampleLic = {
    id: "lic_sample_enterprise",
    license_key: licenseKey,
    company_id: "COMP-101",
    company_name: "Balaji Plywood Traders",
    plan: "enterprise",
    max_devices: 2,
    features: ["*"],
    offline_grace_days: 14,
    expires_at: future1Year,
    is_revoked: false
  };

  const { error } = await db.from('licenses').upsert(sampleLic, { onConflict: 'license_key' });
  if (error) {
    console.error("Failed to seed license into Supabase:", error.message);
  } else {
    console.log("✓ Initial license created successfully in Supabase!");
    console.log("  License Key :", licenseKey);
    console.log("  Company     : Balaji Plywood Traders");
    console.log("  Max Devices : 2 PCs");
    console.log("  Plan        : Enterprise");
    console.log("  Valid Until :", future1Year);
  }
}

createInitialLicense();
