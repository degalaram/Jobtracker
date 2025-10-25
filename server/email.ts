import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { google } from 'googleapis';

type EmailProvider = 'gmail_api' | 'gmail_smtp' | 'resend' | 'none';

function detectEmailProvider(): EmailProvider {
  console.log('Email provider detection:');
  console.log('  GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('  GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
  console.log('  GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT SET');
  console.log('  GMAIL_USER:', process.env.GMAIL_USER ? process.env.GMAIL_USER : 'NOT SET');
  console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
  console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');

  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_USER) {
    return 'gmail_api';
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return 'gmail_smtp';
  }

  if (process.env.RESEND_API_KEY) {
    return 'resend';
  }

  return 'none';
}

async function sendViaGmailAPI(
  to: string,
  username: string,
  otp: string,
  subject: string
): Promise<boolean> {
  try {
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const accessToken = await oauth2Client.getAccessToken();

    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });

    const mailOptions = {
      from: `"Daily Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: getEmailHTML(username, otp),
      text: `Hello ${username},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nDaily Tracker Team`,
    };

    console.log(`Sending email via Gmail API to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully via Gmail API to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`Gmail API send failed:`, error.message);
    console.error(`Full error:`, error);
    return false;
  }
}

function getGmailTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');

  if (!gmailUser || !gmailPassword) {
    throw new Error('Gmail credentials not configured');
  }

  console.log('Gmail SMTP Config:');
  console.log('   User:', gmailUser);
  console.log('   Password length:', gmailPassword.length, '(should be 16)');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
    debug: false
  });
}

async function sendViaGmailSMTP(
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

    console.log(`Attempting to send email via Gmail SMTP to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully via Gmail SMTP to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`Gmail SMTP send failed:`, error.message);

    if (error.code === 'EAUTH') {
      console.error(`  Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD`);
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error(`  Connection failed. SMTP ports may be blocked on this platform.`);
    }

    return false;
  }
}

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

    console.log(`OTP email sent successfully via Resend to ${to}`);
    return true;
  } catch (error: any) {
    console.error('Resend send failed:', error.message);
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

export async function sendOTPEmail(
  to: string,
  username: string,
  otp: string,
  subject: string = 'Your OTP Code'
): Promise<boolean> {
  const provider = detectEmailProvider();

  console.log(`Attempting to send OTP to ${to} using provider: ${provider}`);

  if (provider === 'gmail_api') {
    return await sendViaGmailAPI(to, username, otp, subject);
  } else if (provider === 'gmail_smtp') {
    return await sendViaGmailSMTP(to, username, otp, subject);
  } else if (provider === 'resend') {
    return await sendViaResend(to, username, otp, subject);
  }

  console.error('Failed to send OTP: No email provider configured');
  console.error('Please configure one of the following:');
  console.error('  Option 1 (Best for Render): GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN + GMAIL_USER');
  console.error('  Option 2 (Local only): GMAIL_USER + GMAIL_APP_PASSWORD');
  console.error('  Option 3: RESEND_API_KEY');
  return false;
}

export async function verifyEmailConfig(): Promise<void> {
  const hasGmailAPI = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  const hasGmailSMTP = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const hasResend = !!process.env.RESEND_API_KEY;

  if (!hasGmailAPI && !hasGmailSMTP && !hasResend) {
    console.warn('\nEmail provider not configured - OTP emails will fail');
    console.warn('To enable OTP email functionality, configure one of:');
    console.warn('  Gmail API (works on Render): GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN + GMAIL_USER');
    console.warn('  Gmail SMTP (local only): GMAIL_USER + GMAIL_APP_PASSWORD');
    console.warn('  Resend: RESEND_API_KEY\n');
    return;
  }

  if (hasGmailAPI) {
    console.log('Email provider configured: Gmail API (OAuth2)');
    console.log('OTP emails will be sent from:', process.env.GMAIL_USER);
  } else if (hasGmailSMTP) {
    console.log('Testing Gmail SMTP connection...');
    try {
      const transporter = getGmailTransporter();
      await transporter.verify();
      console.log('Gmail SMTP connection verified successfully');
      console.log('OTP emails will be sent from:', process.env.GMAIL_USER);
      console.log('NOTE: SMTP may not work on Render (ports blocked). Consider Gmail API instead.');
    } catch (error: any) {
      console.error('Gmail SMTP verification failed:', error.message);
      console.error('OTP emails will NOT work. SMTP ports may be blocked.');
      console.error('Consider switching to Gmail API for production deployment.');
    }
  } else if (hasResend) {
    console.log('Email provider configured: Resend');
  }
}
