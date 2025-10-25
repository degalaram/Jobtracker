# VS Code Setup Guide - Daily Tracker

## Quick Start for VS Code

### Step 1: Clone/Import the Project

If you haven't already:
```bash
git clone <your-repo-url>
cd daily-tracker
```

### Step 2: Create Environment Variables File

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your actual values:
   ```env
   # Email Configuration (REQUIRED)
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   
   # Session Secret (REQUIRED)
   SESSION_SECRET=your-random-secret-key-here
   
   # Database (Optional)
   DATABASE_URL=postgresql://...
   ```

   **Important**: 
   - Replace with YOUR actual Gmail and App Password
   - Generate App Password at: https://myaccount.google.com/apppasswords
   - Never commit `.env` file to Git

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run the Application

```bash
npm run dev
```

The app will start at: http://localhost:5000

---

## Testing Email Configuration

### Method 1: Check Startup Logs

When you run `npm run dev`, look for:

**Success**:
```
Email configuration verified - Ready to send emails
```

**Error**:
```
Email configuration error: Missing email credentials: GMAIL_USER, GMAIL_APP_PASSWORD
```

### Method 2: Use Diagnostic API

Open your browser and go to:
```
http://localhost:5000/api/diagnostic/email-config
```

You'll see a JSON response like:
```json
{
  "status": "OK",
  "message": "Email configuration is complete",
  "diagnostics": {
    "emailConfigured": true,
    "gmailUserSet": true,
    "gmailPasswordSet": true,
    "gmailUserValue": "ram***@gmail.com",
    "issues": [],
    "recommendations": []
  }
}
```

If there are issues, you'll see:
```json
{
  "status": "NEEDS_CONFIGURATION",
  "message": "Email configuration needs attention",
  "diagnostics": {
    "issues": [
      "GMAIL_USER environment variable is not set"
    ],
    "recommendations": [
      "Add GMAIL_USER to your Secrets/Environment Variables"
    ]
  }
}
```

### Method 3: Test Forgot Password

1. Make sure you have an account registered
2. Go to http://localhost:5000
3. Click "Forgot Password?"
4. Enter your registered email
5. Check your inbox for OTP

---

## Common Issues & Solutions

### Issue 1: "Missing email credentials" Error

**Problem**: Environment variables not loaded.

**Solution**:
1. Make sure `.env` file exists in the root directory
2. Verify it has `GMAIL_USER` and `GMAIL_APP_PASSWORD`
3. Restart the server (`Ctrl+C` and `npm run dev`)

### Issue 2: "No OTP Received"

**Problem**: Email not registered OR wrong email address.

**Solution**:
1. Make sure you're using the EXACT email you registered with
2. Check spam folder
3. Verify email is sent to the correct address
4. Check server logs for errors

### Issue 3: "Authentication Failed" (EAUTH)

**Problem**: Gmail App Password is incorrect.

**Solution**:
1. Generate a new App Password at: https://myaccount.google.com/apppasswords
2. Make sure 2-Step Verification is enabled
3. Copy the 16-character password (no spaces)
4. Update `.env` file with new password
5. Restart server

### Issue 4: OTP Works in Replit but Not VS Code

**Problem**: Environment variables from Replit Secrets don't transfer to VS Code.

**Solution**:
1. Get your values from Replit Secrets
2. Copy them to VS Code `.env` file
3. Restart the server in VS Code

---

## Checklist for VS Code Setup

- [ ] Cloned/imported the project
- [ ] Created `.env` file from `.env.example`
- [ ] Added `GMAIL_USER` to `.env`
- [ ] Added `GMAIL_APP_PASSWORD` to `.env`
- [ ] Added `SESSION_SECRET` to `.env`
- [ ] Ran `npm install`
- [ ] Started server with `npm run dev`
- [ ] Verified email config at `/api/diagnostic/email-config`
- [ ] Tested OTP with "Forgot Password"

---

## Security Reminders

- `.env` is already in `.gitignore`
- Never commit `.env` to Git
- Never share your `GMAIL_APP_PASSWORD`
- Use different App Passwords for different environments
- Revoke unused App Passwords at: https://myaccount.google.com/apppasswords

---

## Still Having Problems?

1. **Check the diagnostic endpoint**: http://localhost:5000/api/diagnostic/email-config
2. **Review the console logs** for specific error messages
3. **Verify Gmail settings**:
   - 2-Step Verification is ON
   - App Password is correctly generated
   - App Password has no spaces
4. **Test with a simple account**:
   - Register a new account
   - Try forgot password with that email
   - Check if OTP is received

---

## Additional Resources

- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Email Setup Guide](./EMAIL_SETUP_GUIDE.md)
- [Environment Variables Documentation](./.env.example)
