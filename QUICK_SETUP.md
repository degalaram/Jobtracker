# Quick Setup for New Environments

This guide helps you quickly set up the application when importing from GitHub to **Replit** or **VS Code**.

## ✅ What Works Out of the Box

- ✅ Application code (from GitHub)
- ✅ All dependencies (automatically installed)
- ✅ Session management (file-based)
- ✅ In-memory storage (temporary)

## 🔧 Required Setup (5 Minutes)

### Step 1: Choose Email Provider

**Option A: Resend (Recommended)**
```
1. Sign up at resend.com (free)
2. Get API key
3. Add to Secrets: RESEND_API_KEY=re_xxxxx
4. Done! ✓
```

**Option B: Gmail**
```
1. Enable 2-Step Verification on Gmail
2. Get App Password from myaccount.google.com/apppasswords
3. Add to Secrets:
   - GMAIL_USER=your-email@gmail.com
   - GMAIL_APP_PASSWORD=xxxxxxxxxxxx
4. Done! ✓
```

### Step 2: Database (Optional - for persistent storage)

**Use Replit Database (Automatic):**
```
1. In Replit: Click "Database" icon on left sidebar
2. Database will be auto-created
3. DATABASE_URL is set automatically
4. Done! ✓
```

**OR Use Custom Database:**
```
Add to Secrets:
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Step 3: Restart Application
```
1. Stop the workflow
2. Start it again
3. Verify logs show:
   ✓ Email provider configured: RESEND (or GMAIL)
   ✓ Database connected (or using memory)
```

## 📝 Environment Variables Summary

### Replit Secrets (Tools → Secrets)
```
# Email (choose one provider)
RESEND_API_KEY=re_xxxxx                    # Option A
GMAIL_USER=your-email@gmail.com            # Option B
GMAIL_APP_PASSWORD=xxxxxxxxxxxx            # Option B

# Database (optional)
DATABASE_URL=postgresql://...              # Auto-set by Replit DB

# Session (auto-generated if not set)
SESSION_SECRET=your-random-secret
```

### VS Code (.env file)
```bash
# Create .env file in project root
RESEND_API_KEY=re_xxxxx
# OR
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxx

# Database (optional)
DATABASE_URL=postgresql://...

# Session
SESSION_SECRET=your-random-secret
```

## 🚀 First-Time Import Checklist

- [ ] Clone/import GitHub repo
- [ ] Run `npm install` (or automatic in Replit)
- [ ] Add email provider secrets (Resend OR Gmail)
- [ ] (Optional) Set up database
- [ ] Restart application
- [ ] Test forgot password feature
- [ ] Verify OTP email arrives

## 🔍 Troubleshooting

**OTP emails not sending?**
1. Check logs for: `✓ Email provider configured`
2. Verify secrets are added (no typos)
3. Restart the application
4. See detailed guide: `EMAIL_SETUP.md`

**Data not persisting?**
1. Check if DATABASE_URL is set
2. If using Replit DB, enable it from sidebar
3. Restart application

**Application won't start?**
1. Run: `npm install`
2. Check if `cross-env` is installed
3. Verify Node.js version (v18+)

## 📚 Additional Resources

- **Email Setup:** See `EMAIL_SETUP.md` for detailed email configuration
- **Database Setup:** Use Replit Database or external PostgreSQL
- **Security:** All secrets stored in environment variables (not in code)

---

**Time to fully set up:** 5-10 minutes  
**Works in:** Replit ✓ | VS Code ✓ | Any Node.js environment ✓
