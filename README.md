# Plywood POS - Licensing Authority Backend (Next.js + Vercel)

This is the production licensing backend for Plywood POS. It provides:
1. **Device Activation Authority**: Binds license keys to unique Windows PC hardware fingerprints.
2. **Ed25519 Cryptographic Signatures**: Signs license tokens with the private key; desktop apps verify signatures locally.
3. **Web Admin Dashboard**: Issue new license keys, manage device seats, and revoke access in real time.

---

## 1. Setup Database

Ensure the 3 tables (`licenses`, `device_seats`, `license_logs`) are created in your Supabase project using the SQL schema provided.

---

## 2. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Fill in your `.env.local`:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   LICENSE_PRIVATE_KEY=312a68ad1507727852dfccac88deac9197d7c365aeba84167145bcaeec79959d
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3001](http://localhost:3001) to view the Admin License Management Portal.

---

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Go to [Vercel Dashboard](https://vercel.com) -> **Add New Project** -> Select your repo.
3. Under **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LICENSE_PRIVATE_KEY` = `312a68ad1507727852dfccac88deac9197d7c365aeba84167145bcaeec79959d`
4. Click **Deploy**.

Vercel will assign a production URL (e.g. `https://plywood-licensing.vercel.app`).

---

## 4. Connect Desktop App

In the desktop Tauri app [c:/Workspace/plywood-pos-tracker/.env](file:///c:/Workspace/plywood-pos-tracker/.env):
```bash
VITE_LICENSE_API_URL=https://plywood-licensing.vercel.app
VITE_LICENSE_MOCK=false
```
