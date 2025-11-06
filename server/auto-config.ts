// Auto-configuration system for automatic setup when importing from GitHub
export function autoConfigureEnvironment() {
  console.log('\n=== Auto-Configuration Check ===\n');

  // Check database
  if (process.env.DATABASE_URL) {
    console.log('✓ Database URL configured');
  } else {
    console.log('⚠️  No DATABASE_URL found - using in-memory storage');
  }

  // Email configuration check
  const hasGmailOAuth = !!(process.env.GMAIL_USER && process.env.GMAIL_CLIENT_ID &&
                          process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);

  const hasGmailSMTP = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  if (hasGmailOAuth) {
    console.log('✓ Gmail OAuth2 configured');
    console.log(`  User: ${process.env.GMAIL_USER}`);
    console.log(`  Client ID: ${process.env.GMAIL_CLIENT_ID?.substring(0, 20)}...`);
    console.log(`  Refresh Token: ${process.env.GMAIL_REFRESH_TOKEN?.substring(0, 20)}...`);
  } else if (hasGmailSMTP) {
    console.log('✓ Gmail App Password configured');
  } else {
    console.log('⚠️  No email provider configured');
    console.log('   OTP emails (forgot password, login) will not work');
    console.log('   To fix: Add these environment variables:');
    console.log('   Option 1 - Gmail OAuth2 (Recommended for Render):');
    console.log('   - GMAIL_USER (your Gmail address)');
    console.log('   - GMAIL_CLIENT_ID (OAuth2 Client ID)');
    console.log('   - GMAIL_CLIENT_SECRET (OAuth2 Client Secret)');
    console.log('   - GMAIL_REFRESH_TOKEN (OAuth2 Refresh Token)');
    console.log('   Option 2 - Gmail App Password:');
    console.log('   - GMAIL_USER (your Gmail address)');
    console.log('   - GMAIL_APP_PASSWORD (16-char App Password)');
  }

  // Check session secret
  if (process.env.SESSION_SECRET) {
    console.log('✓ SESSION_SECRET configured');
  } else {
    console.log('⚠️  SESSION_SECRET not set - using default (not secure for production)');
  }

  // Check environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log(`✓ Running in ${isDevelopment ? 'development' : 'production'} mode`);

  console.log('\n=== Configuration Check Complete ===\n');
}

// Auto-fix common configuration issues
export function autoFixDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log('\n⚠️  WARNING: No DATABASE_URL found!');
    console.log('   Your data will NOT persist between restarts.');
    console.log('   \n📌 RECOMMENDED: Set up Neon PostgreSQL (FREE, UNLIMITED TIME)');
    console.log('   1. Go to https://console.neon.tech');
    console.log('   2. Sign up (free, no credit card required)');
    console.log('   3. Create new project → Copy POOLED connection string');
    console.log('   4. Add to Replit Secrets as DATABASE_URL');
    console.log('   \n✅ Benefits:');
    console.log('      • 500MB storage (50,000+ jobs, 100,000+ tasks)');
    console.log('      • Unlimited time - never expires');
    console.log('      • 7-day automatic backups');
    console.log('      • 10 free projects');
    console.log('      • Perfect for Replit deployment\n');
    return '';
  }

  console.log('🔍 Original DATABASE_URL:', dbUrl.substring(0, 50) + '...');

  // Auto-fix Neon URLs
  if (dbUrl.includes('neon.tech')) {
    let fixedUrl = dbUrl.trim();

    // Remove any surrounding quotes
    fixedUrl = fixedUrl.replace(/^['"]|['"]$/g, '');

    // Remove unsupported channel_binding parameter
    if (fixedUrl.includes('channel_binding=')) {
      fixedUrl = fixedUrl.replace(/[&?]channel_binding=[^&]*(&|$)/, '$1');
      console.log('🔧 Removed unsupported channel_binding parameter from Neon URL');
    }

    // Clean up any trailing ampersands or question marks
    fixedUrl = fixedUrl.replace(/[?&]$/, '');

    // Ensure sslmode=require is present
    if (!fixedUrl.includes('sslmode=')) {
      const separator = fixedUrl.includes('?') ? '&' : '?';
      fixedUrl = `${fixedUrl}${separator}sslmode=require`;
      console.log('🔧 Added sslmode=require to Neon URL');
    }

    // Use pooled connection for better performance if not already using it
    if (!fixedUrl.includes('-pooler.')) {
      const pooledUrl = fixedUrl.replace(/(ep-[^.]+)\./, '$1-pooler.');
      if (pooledUrl !== fixedUrl) {
        fixedUrl = pooledUrl;
        console.log('🔧 Auto-optimized Neon URL to use connection pooling');
      }
    }

    if (fixedUrl !== dbUrl.trim()) {
      console.log('✅ Fixed Neon URL:', fixedUrl.substring(0, 50) + '...');
      return fixedUrl;
    }

    console.log('✅ Using Neon URL as-is:', fixedUrl.substring(0, 50) + '...');
    return fixedUrl;
  }

  // Auto-fix Supabase URLs
  if (dbUrl.includes('supabase.co')) {
    let fixedUrl = dbUrl.trim();
    fixedUrl = fixedUrl.replace(/^['"]|['"]$/g, '');

    // Supabase should NOT have sslmode parameter - remove it if present
    if (fixedUrl.includes('?sslmode=')) {
      fixedUrl = fixedUrl.replace(/\?sslmode=[^&]*/, '');
      console.log('🔧 Removed sslmode parameter from Supabase URL (not needed)');
    } else if (fixedUrl.includes('&sslmode=')) {
      fixedUrl = fixedUrl.replace(/&sslmode=[^&]*/, '');
      console.log('🔧 Removed sslmode parameter from Supabase URL (not needed)');
    }

    if (fixedUrl !== dbUrl.trim()) {
      console.log('✅ Fixed Supabase URL:', fixedUrl.substring(0, 50) + '...');
      return fixedUrl;
    }

    console.log('✅ Using Supabase URL as-is:', fixedUrl.substring(0, 50) + '...');
    return fixedUrl;
  }

  console.log('✅ Using DATABASE_URL as-is:', dbUrl.substring(0, 50) + '...');
  return dbUrl;
}
