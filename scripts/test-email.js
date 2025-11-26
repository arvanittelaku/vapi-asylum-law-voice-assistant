/**
 * Test Email Configuration
 */
require('dotenv').config();

console.log('=== TEST: EMAIL CONFIGURATION ===\n');

// Check email config
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL;
const legalAidEmail = process.env.LEGAL_AID_PARTNER_EMAIL;
const teamEmail = process.env.TEAM_NOTIFICATION_EMAIL;

console.log('SMTP Config:');
console.log('  Host:', smtpHost || 'NOT SET');
console.log('  User:', smtpUser || 'NOT SET');
console.log('  Pass:', smtpPass ? 'Set (' + smtpPass.length + ' chars)' : 'NOT SET');
console.log('  From:', fromEmail || 'NOT SET');
console.log('');
console.log('Email Recipients:');
console.log('  Legal Aid Partner:', legalAidEmail || 'NOT SET');
console.log('  Team Notifications:', teamEmail || 'NOT SET');
console.log('');

if (!smtpHost || !smtpUser || !smtpPass) {
  console.log('⚠️  SMTP not fully configured');
  console.log('   Referral emails will be LOGGED but not actually sent\n');
  console.log('To enable real email sending, add to .env:');
  console.log('  SMTP_HOST=smtp.gmail.com');
  console.log('  SMTP_PORT=587');
  console.log('  SMTP_USER=your-email@gmail.com');
  console.log('  SMTP_PASS=your-app-password');
  console.log('  FROM_EMAIL=noreply@asylumlaw.co.uk\n');
  console.log('NOTE: For Gmail, you need to create an "App Password"');
} else {
  console.log('✅ SMTP is configured\n');
  
  // Try to verify connection
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ SMTP connection failed:', error.message);
    } else {
      console.log('✅ SMTP connection verified!');
      console.log('   Ready to send emails');
    }
  });
}

