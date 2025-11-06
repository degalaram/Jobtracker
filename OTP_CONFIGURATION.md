# OTP Email Configuration Guide

## Overview

This application sends One-Time Passwords (OTPs) **exclusively via email**. Console logging of OTP codes has been completely removed for security reasons.

## ⚠️ Important Security Notice

- **OTPs are NEVER logged to console** under any circumstances
- **OTPs are ONLY sent via email** to registered user addresses
- If email sending fails, the application returns an error message (without exposing the OTP)

## Gmail Configuration (Required)

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/security
2. Scroll down to "How you sign in to Google"
3. Click on "2-Step Verification"
4. Follow the prompts to enable it

### Step 2: Generate an App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in if prompted
3. In the "Select app" dropdown, choose **Mail**
4. In the "Select device" dropdown, choose your device type (e.g., **Other**)
5. Enter a custom name like "Daily Tracker App"
6. Click **Generate**
7. Google will display a 16-character password
8. **Copy this password** (remove any spaces)

### Step 3: Configure Environment Variables

#### For Replit:

1. Open your Replit project
2. Click the **Secrets** tab (lock icon in left sidebar)
3. Add two secrets:
   ```
   Key: GMAIL_USER
   Value: your-email@gmail.com
   
   Key: GMAIL_APP_PASSWORD
   Value: your-16-character-app-password
   ```
4. **Restart the application** (it will automatically pick up the secrets)

#### For VS Code / Local Development:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-app-password
   ```

3. **Restart the application**

#### For Other Environments:

Set the following environment variables using your platform's configuration system:
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

## Verification

### On Application Startup

Check the console logs for:
```
✅ Email configuration verified - Ready to send emails
```

If you see this message, your Gmail configuration is correct.

### If Email Configuration Fails

You'll see error messages like:
```
❌ Email configuration error: Error: Missing email credentials: GMAIL_USER, GMAIL_APP_PASSWORD
```

Or:
```
❌ Email configuration error: Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

## Troubleshooting

### Error: "Failed to send OTP email"

This error occurs when the application cannot send emails. Check:

1. **Credentials are set correctly**
   - `GMAIL_USER` matches your Gmail address
   - `GMAIL_APP_PASSWORD` is the App Password (not your regular password)

2. **2-Step Verification is enabled**
   - Required for App Passwords to work
   - Verify at: https://myaccount.google.com/security

3. **App Password is valid**
   - Not revoked or expired
   - Correctly copied (no spaces or typos)

4. **Internet connection is working**
   - Application needs to connect to Gmail SMTP servers

### Error: "Invalid login: 535-5.7.8"

This means authentication failed. Solutions:

1. **Regenerate App Password**
   - Revoke old one at: https://myaccount.google.com/apppasswords
   - Generate a new one
   - Update environment variables

2. **Check Gmail Security Settings**
   - Ensure "Less secure app access" is NOT needed (App Passwords bypass this)
   - Check for any security alerts at: https://myaccount.google.com/notifications

3. **Verify 2-Step Verification**
   - Must be enabled for App Passwords
   - Check status at: https://myaccount.google.com/security

### Error: "Connection timeout"

This indicates network issues:

1. Check your internet connection
2. Verify firewall isn't blocking port 587 (SMTP)
3. Try again in a few minutes

## Security Best Practices

1. **Never commit .env file to git**
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Never share your App Password**
   - Treat it like a password
   - Don't include it in screenshots or logs

3. **Revoke compromised App Passwords**
   - Immediately revoke at: https://myaccount.google.com/apppasswords
   - Generate a new one

4. **Use different App Passwords for different apps**
   - Makes it easier to revoke if one is compromised
   - Better security isolation

## How OTP Delivery Works

1. **User requests password reset** (clicks "Forgot Password")
2. **System generates 6-digit OTP** and stores it securely
3. **Email is sent** to the registered email address
4. **User receives OTP** via email (check inbox/spam)
5. **User enters OTP** to verify identity
6. **OTP expires** after 5 minutes for security

## Common Questions

**Q: Why am I not receiving OTP emails?**
- Check spam/junk folder
- Verify email address is correct
- Check Gmail configuration (credentials, 2-Step Verification)

**Q: Can I use a different email provider?**
- Yes, but you'll need to modify `server/email.ts`
- Change SMTP settings for your provider
- Gmail is recommended for reliability

**Q: How long are OTPs valid?**
- 5 minutes from generation
- After expiration, request a new OTP

**Q: What if I see OTPs in console?**
- This should NEVER happen
- If it does, please report it as a security issue
- The application is designed to never log OTPs

## Support Resources

- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- 2-Step Verification: https://support.google.com/accounts/answer/185839
- Gmail Security: https://support.google.com/mail/answer/7126229

## Migration to New Environments

When importing this project to a new environment:

1. **Add Gmail credentials first** (see Step 3 above)
2. **Restart the application**
3. **Verify email configuration** (check console logs)
4. **Test forgot password** to confirm OTPs are sent via email

The application will NOT work without proper Gmail configuration.
