import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Email provider types
type EmailProvider = 'resend' | 'gmail' | 'none';

// Detect available email provider
function detectEmailProvider(): EmailProvider {
  // Debug logging
  console.log('Email provider detection:');
  console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
  console.log('  GMAIL_USER:', process.env.GMAIL_USER ? process.env.GMAIL_USER : 'NOT SET');
  console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET (length: ' + process.env.GMAIL_APP_PASSWORD.length + ')' : 'NOT SET');

  // Check for Resend API key (preferred for portability)
  if (process.env.RESEND_API_KEY) {
    return 'resend';
  }

  // Check for Gmail credentials
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return 'gmail';
  }

  return 'none';
}

// Get Gmail transporter
function getGmailTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  // Remove any spaces from the app password (Google shows them with spaces)
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');

  if (!gmailUser || !gmailPassword) {
    throw new Error('Gmail credentials not configured');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Send email via Resend
async function sendViaResend(
  to: string,
  username: string,
  otp: string,
  subject: string
): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'Daily Tracker <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: getEmailHTML(username, otp),
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`✓ OTP email sent successfully via Resend to ${to}`);
    return true;
  } catch (error: any) {
    console.error('Resend send failed:', error.message);
    return false;
  }
}

// Send email via Gmail
async function sendViaGmail(
  to: string,
  username: string,
  otp: string,
  subject: string
): Promise<boolean> {
  try {
    const transporter = getGmailTransporter();
    const mailOptions = {
      from: `"Daily Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: getEmailHTML(username, otp),
      text: `Hello ${username},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nDaily Tracker Team`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ OTP email sent successfully via Gmail to ${to}`);
    return true;
  } catch (error: any) {
    console.error(`Gmail send failed:`, error.message);

    if (error.code === 'EAUTH') {
      console.error(`  → Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD`);
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error(`  → Connection failed. Check internet connection.`);
    }

    return false;
  }
}

// Get email HTML template
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

// Main function to send OTP email with automatic provider detection
export async function sendOTPEmail(
  to: string,
  username: string,
  otp: string,
  subject: string = 'Your OTP Code'
): Promise<boolean> {
  const provider = detectEmailProvider();

  console.log(`Attempting to send OTP to ${to} using provider: ${provider}`);

  // Try providers in order of preference
  if (provider === 'resend') {
    const success = await sendViaResend(to, username, otp, subject);
    if (success) return true;

    // If Resend fails, try Gmail as fallback
    console.log('Resend failed, trying Gmail as fallback...');
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return await sendViaGmail(to, username, otp, subject);
    }
  } else if (provider === 'gmail') {
    return await sendViaGmail(to, username, otp, subject);
  }

  // No provider available
  console.error('✗ Failed to send OTP: No email provider configured');
  console.error('Please configure one of the following:');
  console.error('  Option 1 (Recommended): Add RESEND_API_KEY to environment');
  console.error('  Option 2: Add GMAIL_USER and GMAIL_APP_PASSWORD to environment');
  return false;
}

// Verify email configuration on startup (non-blocking)
export async function verifyEmailConfig(): Promise<void> {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  if (!hasResend && !hasGmail) {
    console.warn('\n⚠️  Email provider not configured - OTP emails will fail');
    console.warn('To enable OTP email functionality, configure one of:');
    console.warn('  • RESEND_API_KEY (recommended for portability)');
    console.warn('  • GMAIL_USER + GMAIL_APP_PASSWORD\n');
    return;
  }

  if (hasGmail) {
    console.log('📧 Testing Gmail SMTP connection...');
    try {
      // Verify Gmail SMTP connection
      const transporter = getGmailTransporter(); // Ensure transporter is created here
      await transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
      console.log('✅ OTP emails will be sent from:', process.env.GMAIL_USER);
    } catch (error: any) {
      console.error('❌ Gmail SMTP verification failed:', error.message);
      console.error('❌ Full error:', error);
      console.error('⚠️  OTP emails will NOT work. Please check:');
      console.error('   1. GMAIL_APP_PASSWORD is correct (16 characters, no spaces)');
      console.error('   2. 2-Step Verification is enabled in Google Account');
      console.error('   3. App Password was generated recently');
    }
  }
}
