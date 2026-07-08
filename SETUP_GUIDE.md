# IMMS Supabase Setup Guide - CRITICAL FIX

## ⚠️ Critical Errors Fixed

### ✅ Fixed Issues:
1. ✅ **login.html** now loads Supabase SDK
2. ✅ Created proper seed scripts using Supabase Admin API
3. ✅ Created comprehensive RLS security policies
4. ✅ Provided corrected SQL seed process

---

## 🚀 Step-by-Step Setup Instructions

### **Phase 1: Database Setup (One-time)**

#### 1. Enable PostgreSQL Extensions in Supabase
Go to **Supabase Dashboard → SQL Editor** → Run this:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
```

#### 2. Apply RLS Policies
- Open **SQL Editor** in Supabase
- Copy all content from `RLS_POLICIES.sql` 
- Run it completely
- **Critical**: This protects your data from unauthorized access

#### 3. Seed Initial Data
Run the SQL from `SEED_DATA_CORRECTED.sql` (data tables only)

---

### **Phase 2: Create First User (Two Methods)**

#### **Method A: Using Node.js Admin API** (RECOMMENDED)

**Prerequisites:**
```bash
npm install @supabase/supabase-js
```

**Setup:**
1. Get your **Service Role Key** from:
   - Supabase Dashboard → Settings (gear icon) → API
   - Copy the **service_role** key (NOT the anon key!)

2. Create `.env` file in your project root:
```env
SUPABASE_URL=https://afujoysgsoluozufbbrg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

3. Run the seed script:
```bash
node seed-user-admin.js
```

**Output will show:**
```
✨ Seeding completed successfully!

📝 Login credentials:
   Email: kodidarmk@gmail.com
   Password: KodiDarm
```

---

#### **Method B: Manual Setup** (If Node.js unavailable)

1. Use **Supabase Dashboard → Authentication → Users**
   - Click "Add user"
   - Email: `kodidarmk@gmail.com`
   - Password: `KodiDarm`
   - Mark as "Confirmed"

2. Note the generated User ID (UUID)

3. Run in SQL Editor:
```sql
INSERT INTO public.profiles (id, first_name, last_name, full_name, email, phone, role)
VALUES (
  '<PASTE_USER_UUID_HERE>',
  'Kochere Djiomegni',
  'Arilic Riveti Merwan',
  'Kochere Djiomegni Arilic Riveti Merwan',
  'kodidarmk@gmail.com',
  '+237688760026',
  'administrator'
);

-- Then link to chain
INSERT INTO public.chaine_members (profile_id, chaine_id, role)
SELECT '<PASTE_USER_UUID_HERE>', id, 'administrator'
FROM public.chaines
WHERE name = 'chaine 9'
LIMIT 1;
```

---

### **Phase 3: Test the Application**

1. **Start your web server** (if running locally)
2. **Open login.html** in browser
3. **Login with:**
   - Email: `kodidarmk@gmail.com`
   - Password: `KodiDarm`
   - Check "I agree with terms"
   - Click "Login to account"

---

## 🔒 Security Checklist

- [ ] RLS policies enabled on all tables (check `RLS_POLICIES.sql`)
- [ ] Service Role Key NEVER exposed in frontend code
- [ ] Supabase API Key (public) is OK in frontend
- [ ] Password reset emails configured in Supabase
- [ ] Authentication domain verified in Supabase settings
- [ ] CORS allowed for your Vercel domain

---

## 📋 File Reference

| File | Purpose |
|------|---------|
| `login.html` | ✅ FIXED - Now loads SDK |
| `RLS_POLICIES.sql` | Security policies (RUN ONCE) |
| `SEED_DATA_CORRECTED.sql` | Data seeding without auth |
| `seed-user-admin.js` | Create users via Admin API |

---

## ❓ Troubleshooting

### **"Cannot read property '_supabase' of undefined"**
- ✅ **Fixed**: login.html now loads SDK

### **Login fails with "Network error"**
- Check browser console (F12)
- Verify Supabase URL in supabase-config.js
- Check CORS settings in Supabase

### **User created but profile not found**
- Ensure profile was created in `public.profiles` table
- Check RLS policies aren't blocking reads

### **RLS policies too restrictive**
- Modify policies in `RLS_POLICIES.sql`
- Key: Each table's policy should match your security model

---

## 🎯 Next Steps After Setup

1. **Create more users** using `seed-user-admin.js` as template
2. **Add machines** to chaine 9 using the UI
3. **Assign members** to chains using member management
4. **Configure email notifications** in Supabase (optional)
5. **Backup database regularly**

---

## 📞 Common Error Messages

| Error | Solution |
|-------|----------|
| `Unauthorized` | Check RLS policies, user role, and auth token |
| `Row not found` | RLS policy is blocking access; check policies |
| `CORS error` | Add domain to Supabase CORS settings |
| `Invalid email` | Email not confirmed; use admin API or mark as confirmed |

---

## 🔐 Important Security Notes

1. **NEVER commit `.env` file** to GitHub
2. **Service Role Key** = Full database access (keep secret!)
3. **Public Key** = Safe in frontend (RLS protects data)
4. **RLS is your safety net** - Always have policies enabled
5. **Test RLS policies** with different user roles

---

Generated: 2026-07-08
IMMS Platform v1.0
