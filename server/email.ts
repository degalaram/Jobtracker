import nodemailer from 'nodemailer';

type EmailProvider = 'gmail_smtp' | 'none';

function detectEmailProvider(): EmailProvider {
  console.log('Email provider detection:');
  console.log('  GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT SET');
  console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return 'gmail_smtp';
  }

  return 'none';
}

async function sendViaGmailSMTP(
  to: string,
  username: string,
  otp: string,
  subject: string
): Promise<boolean> {
  try {
    console.log('Creating Gmail SMTP transporter...');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Gmail SMTP connection verified');

    const mailOptions = {
      from: `"Daily Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: getEmailHTML(username, otp),
      text: `Hello ${username},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nDaily Tracker Team`,
    };

    console.log(`Sending email via Gmail SMTP to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully via Gmail SMTP to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Gmail SMTP send failed:`, error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.response) {
      console.error(`Response:`, error.response);
    }

    // Specific SMTP error handling
    if (error.code === 'EAUTH') {
      console.error('⚠️  AUTHENTICATION FAILED - Check your Gmail App Password');
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error('⚠️  CONNECTION FAILED - Check your internet connection');
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

export async function sendOTPEmail(
  to: string,
  username: string,
  otp: string,
  subject: string = 'Your OTP Code'
): Promise<boolean> {
  const provider = detectEmailProvider();

  console.log(`Attempting to send OTP to ${to} using provider: ${provider}`);

  if (provider === 'gmail_smtp') {
    return await sendViaGmailSMTP(to, username, otp, subject);
  }

  console.error('❌ Failed to send OTP: Gmail SMTP not configured');
  console.error('Please add these to Replit Secrets:');
  console.error('  GMAIL_USER - Your Gmail address');
  console.error('  GMAIL_APP_PASSWORD - Your Gmail App Password (16 characters)');
  return false;
}

export async function verifyEmailConfig(): Promise<void> {
  const hasGmailSMTP = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  if (!hasGmailSMTP) {
    console.warn('\n⚠️  Gmail SMTP not configured - OTP emails will fail');
    console.warn('To enable OTP email functionality:');
    console.warn('  1. Go to Tools → Secrets in Replit');
    console.warn('  2. Add GMAIL_USER (your Gmail address)');
    console.warn('  3. Add GMAIL_APP_PASSWORD (16-char App Password from Google)');
    console.warn('  4. Restart the application\n');
    return;
  }

  console.log('✅ Email provider configured: Gmail SMTP');
  console.log('📧 OTP emails will be sent from:', process.env.GMAIL_USER);
  console.log('✓ Gmail SMTP works on Replit Deployments');
}
