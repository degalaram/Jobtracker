# Email Setup Guide for OTP Delivery

This application supports **automatic email provider detection** for OTP delivery. It works seamlessly across **Replit**, **VS Code**, and any other environment.

## 🚀 Quick Start (Choose One Option)

### Option 1: Resend (Recommended - Most Portable)

**Why Resend?**
- ✅ Works instantly in any environment (Replit, VS Code, etc.)
- ✅ No complex SMTP configuration
- ✅ Free tier: 100 emails/day, 3,000 emails/month
- ✅ Better deliverability

**Setup Steps:**

1. **Get Resend API Key:**
   - Visit [resend.com](https://resend.com)
   - Sign up for free account
   - Go to API Keys section
   - Create new API key

2. **Add to Your Environment:**

   **For Replit:**
   ```
   1. Go to Tools → Secrets (lock icon)
   2. Add new secret:
      Key: RESEND_API_KEY
      Value: re_xxxxxxxxxxxxx (your API key)
   3. Restart the application
   ```

   **For VS Code / Local:**
   ```bash
   # Add to .env file
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

3. **Verify:** OTP emails will now be sent via Resend automatically!

---

### Option 2: Gmail SMTP

**Setup Steps:**

1. **Enable 2-Step Verification:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. **Create App Password:**
   - Visit [App Passwords](https://myaccount.google.com/apppasswords)
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "Daily Tracker"
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Add to Your Environment:**

   **For Replit:**
   ```
   1. Go to Tools → Secrets
   2. Add two secrets:
      Key: GMAIL_USER
      Value: your-email@gmail.com
      
      Key: GMAIL_APP_PASSWORD
      Value: abcdefghijklmnop (16 chars, no spaces)
   3. Restart the application
   ```

   **For VS Code / Local:**
   ```bash
   # Add to .env file
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

---

## 🔄 How Auto-Detection Works

The application automatically detects and uses the available email provider:

1. **First Priority:** Resend (if `RESEND_API_KEY` is set)
2. **Fallback:** Gmail (if `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set)
3. **If both configured:** Uses Resend, falls back to Gmail if Resend fails

---

## ✅ Verification

After adding credentials:

1. **Restart the application** (important!)
2. Check console logs for:
   - `✓ Email provider configured: RESEND` or
   - `✓ Email provider configured: GMAIL`
3. Test forgot password feature
4. Check email inbox for OTP

---

## 🔧 Troubleshooting

### Issue: "No email provider configured"
**Solution:** Add either `RESEND_API_KEY` or both `GMAIL_USER` + `GMAIL_APP_PASSWORD` to your environment secrets.

### Issue: Gmail authentication fails
**Solution:**
- Verify 2-Step Verification is enabled
- Generate a fresh App Password
- Remove any spaces from the App Password
- Use App Password, NOT your regular Gmail password

### Issue: Resend emails not arriving
**Solution:**
- Check spam folder
- Verify API key is correct (starts with `re_`)
- Check Resend dashboard for logs

### Issue: Works in Replit but not VS Code
**Solution:**
- Create `.env` file in project root
- Add the same secrets as in Replit
- Make sure `.env` is in `.gitignore`
- Restart the application

---

## 📋 Environment Variables Summary

| Variable | Required For | Example Value |
|----------|-------------|---------------|
| `RESEND_API_KEY` | Resend (Option 1) | `re_abc123...` |
| `GMAIL_USER` | Gmail (Option 2) | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail (Option 2) | `abcdefghijklmnop` |

---

## 🔐 Security Notes

- Never commit `.env` file to Git (already in `.gitignore`)
- App passwords are safer than regular passwords
- OTP codes are NEVER logged to console
- OTPs expire after 5 minutes
- Email credentials are only stored in environment variables

---

## 📧 Support

If you continue to have issues:
1. Check application console logs for detailed error messages
2. Verify all credentials are correct
3. Ensure application has been restarted after adding secrets
4. Try the alternative email provider

**Recommended:** Use Resend for the best cross-platform experience.
