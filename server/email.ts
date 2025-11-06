import nodemailer from 'nodemailer';

async function sendViaGmailOAuth(
  to: string,
  username: string,
  otp: string,
  subject: string
): Promise<boolean> {
  try {
    console.log('Creating Gmail OAuth2 transporter...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER);
    console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID?.substring(0, 20) + '...');
    console.log('GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN?.substring(0, 20) + '...');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessUrl: 'https://oauth2.googleapis.com/token'
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
      rateDelta: 1000,
      rateLimit: 5,
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      socketTimeout: 60000,
      debug: true,
      logger: true
    });

    const mailOptions = {
      from: `"Daily Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: getEmailHTML(username, otp),
      text: `Hello ${username},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nDaily Tracker Team`,
    };

    console.log(`Sending email via Gmail OAuth2 to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully via Gmail OAuth2 to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    
    transporter.close();
    return true;
  } catch (error: any) {
    console.error(`❌ Gmail OAuth2 send failed:`, error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.response) {
      console.error(`Response:`, error.response);
    }
    if (error.responseCode) {
      console.error(`Response code: ${error.responseCode}`);
    }

    if (error.code === 'EAUTH') {
      console.error('⚠️  OAUTH2 AUTHENTICATION FAILED');
      console.error('   Your OAuth2 refresh token has expired or is invalid.');
      console.error('   Steps to fix:');
      console.error('   1. Go to https://developers.google.com/oauthplayground');
      console.error('   2. Click settings icon (top right) and check "Use your own OAuth credentials"');
      console.error('   3. Enter your GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET');
      console.error('   4. In Step 1, select "Gmail API v1" > "https://mail.google.com/"');
      console.error('   5. Click "Authorize APIs" and sign in with your Gmail account');
      console.error('   6. In Step 2, click "Exchange authorization code for tokens"');
      console.error('   7. Copy the "Refresh token" and update GMAIL_REFRESH_TOKEN on Render');
      console.error('   8. Redeploy your application on Render');
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error('⚠️  CONNECTION TIMEOUT - Network issue or firewall blocking SMTP');
      console.error('   This can happen if:');
      console.error('   1. Render is blocking outbound SMTP connections (check Render docs)');
      console.error('   2. Your OAuth2 token is expired (see EAUTH error above)');
      console.error('   3. Gmail is temporarily unavailable');
    }

    return false;
  }
}

function getEmailHTML(username: string, otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Daily Tracker</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${username}</strong>,</p>
          <p>You requested a One-Time Password (OTP) for your account. Please use the code below to continue:</p>

          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>

          <p><strong>Important:</strong> This code will expire in 5 minutes for security purposes.</p>
          <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>

          <p>Best regards,<br><strong>Daily Tracker Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendViaGmailAppPassword(
  to: string,
  username: string,
  otp: string,
  subject: string
): Promise<boolean> {
  try {
    console.log('Creating Gmail App Password transporter...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      socketTimeout: 60000,
      debug: true,
      logger: true
    });

    const mailOptions = {
      from: `"Daily Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: getEmailHTML(username, otp),
      text: `Hello ${username},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nDaily Tracker Team`,
    };

    console.log(`Sending email via Gmail App Password to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully via Gmail App Password to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    
    transporter.close();
    return true;
  } catch (error: any) {
    console.error(`❌ Gmail App Password send failed:`, error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }

    if (error.code === 'EAUTH') {
      console.error('⚠️  GMAIL APP PASSWORD AUTHENTICATION FAILED');
      console.error('   Steps to fix:');
      console.error('   1. Go to https://myaccount.google.com/apppasswords');
      console.error('   2. Sign in and create a new App Password');
      console.error('   3. Select "Mail" as app and "Other" as device');
      console.error('   4. Copy the 16-character password (no spaces)');
      console.error('   5. Update GMAIL_APP_PASSWORD on Render');
      console.error('   6. Make sure 2-Step Verification is enabled on your Google account');
    }

    return false;
  }
}

export async function sendOTPEmail(
  to: string,
  username: string,
  otp: string,
  subject: string = 'Your OTP Code'
): Promise<boolean> {
  const hasGmailOAuth = !!(process.env.GMAIL_USER && process.env.GMAIL_CLIENT_ID &&
                          process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);

  if (!hasGmailOAuth) {
    console.error('❌ Failed to send OTP: Gmail OAuth2 not configured');
    console.error('Please configure these environment variables:');
    console.error('  GMAIL_USER - Your Gmail address');
    console.error('  GMAIL_CLIENT_ID - OAuth2 Client ID');
    console.error('  GMAIL_CLIENT_SECRET - OAuth2 Client Secret');
    console.error('  GMAIL_REFRESH_TOKEN - OAuth2 Refresh Token');
    console.error('\n🔧 To regenerate refresh token:');
    console.error('  1. Visit: https://developers.google.com/oauthplayground');
    console.error('  2. Click settings (gear icon) → "Use your own OAuth credentials"');
    console.error('  3. Enter your GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET');
    console.error('  4. Select "Gmail API v1" → "https://mail.google.com/"');
    console.error('  5. Click "Authorize APIs" and sign in');
    console.error('  6. Click "Exchange authorization code for tokens"');
    console.error('  7. Copy the "Refresh token" and update GMAIL_REFRESH_TOKEN in Secrets');
    return false;
  }

  console.log(`Attempting to send OTP to ${to} using Gmail OAuth2`);
  return await sendViaGmailOAuth(to, username, otp, subject);
}

export async function verifyEmailConfig(): Promise<void> {
  const hasGmailOAuth = !!(process.env.GMAIL_USER && process.env.GMAIL_CLIENT_ID &&
                          process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  
  const hasGmailAppPassword = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  if (!hasGmailOAuth && !hasGmailAppPassword) {
    console.warn('\n⚠️  No email configuration found - OTP emails will fail');
    console.warn('Configure ONE of these options on Render:');
    console.warn('\nOption 1 - Gmail OAuth2:');
    console.warn('  GMAIL_USER=your-email@gmail.com');
    console.warn('  GMAIL_CLIENT_ID=your-client-id');
    console.warn('  GMAIL_CLIENT_SECRET=your-client-secret');
    console.warn('  GMAIL_REFRESH_TOKEN=your-refresh-token');
    console.warn('\nOption 2 - Gmail App Password (Recommended - Simpler):');
    console.warn('  GMAIL_USER=your-email@gmail.com');
    console.warn('  GMAIL_APP_PASSWORD=your-16-char-app-password\n');
    return;
  }

  console.log('\n=== Email Configuration Status ===');
  
  if (hasGmailOAuth && hasGmailAppPassword) {
    console.log('✅ Email provider: Gmail OAuth2 (primary) + App Password (fallback)');
    console.log('📧 Sender email:', process.env.GMAIL_USER);
    console.log('🔑 OAuth2 Client ID:', process.env.GMAIL_CLIENT_ID?.substring(0, 20) + '...');
    console.log('🔑 App Password: Configured as fallback');
  } else if (hasGmailOAuth) {
    console.log('✅ Email provider: Gmail OAuth2');
    console.log('📧 Sender email:', process.env.GMAIL_USER);
    console.log('🔑 OAuth2 Client ID:', process.env.GMAIL_CLIENT_ID?.substring(0, 20) + '...');
  } else {
    console.log('✅ Email provider: Gmail App Password');
    console.log('📧 Sender email:', process.env.GMAIL_USER);
    console.log('🔑 App Password: Configured');
  }
  
  console.log('⚠️  Skipping connection test to speed up startup');
  console.log('   Email will be tested when first OTP is sent');
  console.log('=================================\n');
}
