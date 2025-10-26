import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { google } from 'googleapis';

type EmailProvider = 'gmail_api' | 'resend' | 'none';

function detectEmailProvider(): EmailProvider {
  console.log('Email provider detection:');
  console.log('  GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('  GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
  console.log('  GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT SET');
  console.log('  GMAIL_USER:', process.env.GMAIL_USER ? process.env.GMAIL_USER : 'NOT SET');
  console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');

  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_USER) {
    return 'gmail_api';
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
    console.log('Initializing Gmail API OAuth2 client...');
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    console.log('Getting access token from refresh token...');
    const accessToken = await oauth2Client.getAccessToken();

    if (!accessToken.token) {
      throw new Error('Failed to get access token from refresh token');
    }

    console.log('Access token obtained successfully');

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
    console.log(`✅ OTP email sent successfully via Gmail API to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Gmail API send failed:`, error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.response) {
      console.error(`Response:`, error.response);
    }
    console.error(`Full error:`, error);
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

    console.log(`✅ OTP email sent successfully via Resend to ${to}`);
    return true;
  } catch (error: any) {
    console.error('❌ Resend send failed:', error.message);
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
  } else if (provider === 'resend') {
    return await sendViaResend(to, username, otp, subject);
  }

  console.error('❌ Failed to send OTP: No email provider configured');
  console.error('Please configure one of the following in Render Environment Variables:');
  console.error('  Option 1 (Recommended): Gmail API OAuth2');
  console.error('    - GMAIL_CLIENT_ID');
  console.error('    - GMAIL_CLIENT_SECRET');
  console.error('    - GMAIL_REFRESH_TOKEN');
  console.error('    - GMAIL_USER');
  console.error('  Option 2: Resend');
  console.error('    - RESEND_API_KEY');
  return false;
}

export async function verifyEmailConfig(): Promise<void> {
  const hasGmailAPI = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_USER);
  const hasResend = !!process.env.RESEND_API_KEY;

  if (!hasGmailAPI && !hasResend) {
    console.warn('\n⚠️  Email provider not configured - OTP emails will fail');
    console.warn('To enable OTP email functionality for Render deployment, configure:');
    console.warn('  Gmail API OAuth2 (recommended):');
    console.warn('    GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN + GMAIL_USER');
    console.warn('  OR Resend:');
    console.warn('    RESEND_API_KEY\n');
    return;
  }

  if (hasGmailAPI) {
    console.log('✅ Email provider configured: Gmail API (OAuth2)');
    console.log('📧 OTP emails will be sent from:', process.env.GMAIL_USER);
    console.log('✓ Gmail API works perfectly on Render and all cloud platforms');
  } else if (hasResend) {
    console.log('✅ Email provider configured: Resend');
    console.log('✓ Resend works perfectly on Render and all cloud platforms');
  }
}
