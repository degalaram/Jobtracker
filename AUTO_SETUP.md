# Automatic Setup Guide

This application is configured to automatically work when imported from GitHub to Replit.

## What Gets Auto-Configured

The application automatically detects and uses:
- Database (PostgreSQL or in-memory fallback)
- Email provider (Resend or Gmail)
- Session management

## One-Time Setup (After Import)

### Step 1: Add Secrets in Replit

Click the lock icon in the left sidebar and add these secrets:

#### Database (Choose one option):

**Option A: Use Replit Database (Recommended)**
- No setup needed! The app will automatically use Replit's PostgreSQL database

**Option B: Use External Supabase Database**
```
DATABASE_URL = postgresql://postgres:YOUR_PASSWORD@db.rtecmlrtbkewdldakpig.supabase.co:5432/postgres?sslmode=require
```

#### Email (Choose one option):

**Option 1: Resend (Recommended - easiest)**
```
RESEND_API_KEY = re_xxxxxxxxxx
```
Get your key from: https://resend.com

**Option 2: Gmail (requires app password)**
```
GMAIL_USER = your-email@gmail.com
GMAIL_APP_PASSWORD = xxxx xxxx xxxx xxxx
```
Get app password from: https://myaccount.google.com/apppasswords

### Step 2: Restart the Application

After adding secrets, click "Stop" then "Run" in Replit.

## For Render Deployment

Add these as Environment Variables in Render dashboard:

```
DATABASE_URL = your-database-url-with-sslmode=require
GMAIL_USER = your-email@gmail.com  
GMAIL_APP_PASSWORD = your-app-password
SESSION_SECRET = random-long-string-here
NODE_ENV = production
```

## Verify Setup

Check the console output after starting:
- `✓ Email provider configured: GMAIL` or `RESEND`
- `✓ Gmail SMTP connection verified` (if using Gmail)
- Database should connect without "falling back to in-memory"

## Common Issues

### "Email provider not configured"
- Add GMAIL_USER and GMAIL_APP_PASSWORD to Secrets
- Restart the application

### "Falling back to in-memory storage"
- Database URL is incorrect or missing `?sslmode=require`
- Check DATABASE_URL secret

### "Failed to send OTP"
- Verify GMAIL_APP_PASSWORD is correct (not your regular password)
- Enable 2-Step Verification in Google account
- Generate new app password if needed
