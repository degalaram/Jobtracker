# Email OTP Setup Guide - Daily Tracker

## Important: OTP Not Receiving? Read This!

### Common Issues and Solutions

#### Issue 1: Wrong Email Address
**Problem**: Trying to reset password for an email that's not registered.
**Solution**: Make sure you're using the EXACT email address you registered with.

Example:
- Wrong: `john.doe@gmail.com` (if you registered with `johndoe@gmail.com`)
- Correct: `johndoe@gmail.com` (use the exact email you registered with)

#### Issue 2: Missing Environment Variables
**Problem**: Secrets don't transfer when you import to VS Code or another Replit.
**Solution**: Set up environment variables again in your new environment.

---

## Step-by-Step Email Configuration

### For Replit (Current Environment)

1. **Go to Replit Secrets** (Tools menu then Secrets, or the lock icon in sidebar)

2. **Add these 3 secrets**:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   SESSION_SECRET=any-random-long-string
   ```

3. **Get Gmail App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Enable 2-Step Verification first (if not enabled)
   - Create new App Password
   - Select "Mail" and your device
   - Copy the 16-character password (no spaces)
   - Paste it as `GMAIL_APP_PASSWORD` in Replit Secrets

4. **Restart the application** (Stop and run again)

---

### For VS Code (Local Development)

1. **Create a `.env` file** in the root directory:
   ```bash
   # Copy .env.example to .env
   cp .env.example .env
   ```

2. **Edit `.env` file** with your actual values:
   ```env
   # Email Configuration (Required for OTP)
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   
   # Session Secret (Required for authentication)
   SESSION_SECRET=your-random-secret-key-here
   
   # Database (Optional - uses in-memory by default)
   DATABASE_URL=postgresql://...
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the application**:
   ```bash
   npm run dev
   ```

---

### For Another Replit Account (Import)

1. **After importing the project**:
   - The code is copied 
   - **But secrets are NOT copied** 

2. **Set up secrets again**:
   - Go to Tools menu then Secrets (or click the lock icon in sidebar)
   - Add all 3 secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SESSION_SECRET`

3. **Restart the application**

---

## How to Test Email Configuration

### Method 1: Check Server Logs on Startup

Look for this message when the app starts:
```
Email configuration verified - Ready to send emails
```

If you see this error instead:
```
Email configuration error: Missing email credentials
```

Then your `GMAIL_USER` or `GMAIL_APP_PASSWORD` is missing.

### Method 2: Test Forgot Password

1. Make sure you're using a **registered email address**
2. Click "Forgot Password?"
3. Enter your email
4. Check your inbox (and spam folder)

If you see this in logs:
```
Forgot password attempt for non-existent email: xxx@gmail.com
```

It means that email is **not registered** in the system.

---

## Debugging Checklist

### Email Not Sending?

- [ ] Is `GMAIL_USER` set correctly?
- [ ] Is `GMAIL_APP_PASSWORD` set correctly (16 characters, no spaces)?
- [ ] Is 2-Step Verification enabled on your Google account?
- [ ] Did you restart the application after adding secrets?
- [ ] Are you using the correct email address (the one you registered with)?

### VS Code Specific Issues?

- [ ] Did you create a `.env` file?
- [ ] Did you copy values from `.env.example`?
- [ ] Are all environment variables in the `.env` file?
- [ ] Did you run `npm install`?

### Replit Import Issues?

- [ ] Did you add secrets to the NEW Replit environment?
- [ ] Did you restart the application?
- [ ] Are the secrets spelled correctly (`GMAIL_USER` not `GMAIL_USERNAME`)?

---

## Quick Reference

### Required Environment Variables

| Variable | Example | Where to Get It |
|----------|---------|----------------|
| `GMAIL_USER` | `yourname@gmail.com` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | `xxxxxxxxxxxxxxxx` (16 chars) | https://myaccount.google.com/apppasswords |
| `SESSION_SECRET` | Long random string | Generate with: `openssl rand -base64 32` |

### Optional Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://...` | For persistent database (uses in-memory by default) |

---

## Still Having Issues?

1. **Check the console logs** for specific error messages
2. **Verify your email** is registered in the system (try logging in first)
3. **Check spam folder** for OTP emails
4. **Try a different browser** or clear cookies
5. **Make sure Gmail App Password is correct** (16 characters, no spaces)

---

## Success Indicators

When everything is working correctly, you should see:

1. **On startup**:
   ```
   Email configuration verified - Ready to send emails
   ```

2. **When sending OTP**:
   ```
   Email sent successfully to your-email@gmail.com
   ```

3. **In your inbox**:
   - Subject: "Password Reset OTP - Daily Tracker"
   - 6-digit OTP code in the email

---

## Security Notes

- **Never commit** `.env` file to Git (it's in `.gitignore`)
- **Never share** your `GMAIL_APP_PASSWORD` publicly
- **OTP codes are never logged** to console for security
- **App Password** is different from your Gmail password
