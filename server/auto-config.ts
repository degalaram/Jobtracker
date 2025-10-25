// Auto-configuration system for automatic setup when importing from GitHub

export function autoConfigureEnvironment() {
  console.log('\n=== Auto-Configuration Check ===\n');

  // Check Database Configuration
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl.includes('supabase.co') && !dbUrl.includes('sslmode')) {
      console.warn('⚠️  Supabase DATABASE_URL detected without SSL mode');
      console.warn('   Please update your DATABASE_URL to include: ?sslmode=require');
      console.warn('   Example: postgresql://user:pass@host:5432/db?sslmode=require\n');
    } else if (dbUrl.includes('supabase.co') && dbUrl.includes('sslmode')) {
      console.log('✓ Supabase database configured with SSL');
    } else {
      console.log('✓ Database URL configured');
    }
  } else {
    console.log('ℹ Using in-memory storage (data will be lost on restart)');
    console.log('  To enable persistent storage:');
    console.log('  - Add DATABASE_URL to Secrets in Replit');
    console.log('  - Or use Replit\'s built-in PostgreSQL database\n');
  }

  // Check Email Configuration
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  if (!hasResend && !hasGmail) {
    console.warn('⚠️  No email provider configured');
    console.warn('   OTP emails (forgot password, login) will not work');
    console.warn('   To fix: Add one of these to Secrets:');
    console.warn('   Option 1: RESEND_API_KEY (recommended)');
    console.warn('   Option 2: GMAIL_USER + GMAIL_APP_PASSWORD\n');
  }

  // Check Session Secret
  if (!process.env.SESSION_SECRET) {
    console.log('ℹ Using default SESSION_SECRET (not recommended for production)');
    console.log('  Add SESSION_SECRET to Secrets for better security\n');
  } else {
    console.log('✓ SESSION_SECRET configured');
  }

  // Check Node Environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`✓ Running in ${nodeEnv} mode`);

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
    console.log('      • Perfect for Render deployment\n');
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
  }

  // Check if it's a Supabase URL without SSL mode
  if (dbUrl.includes('supabase.co') && !dbUrl.includes('sslmode=')) {
    const fixedUrl = dbUrl + '?sslmode=require';
    console.log('🔧 Auto-fixed Supabase URL to include SSL mode');
    console.log('✅ Fixed Supabase URL:', fixedUrl.substring(0, 50) + '...');
    return fixedUrl;
  }

  console.log('✅ Using DATABASE_URL as-is:', dbUrl.substring(0, 50) + '...');
  return dbUrl;
}
