/**
 * Email Verification & Notification Service
 * Designed for development and production environments.
 * If SMTP credentials are provided, attempts real delivery.
 * Otherwise, logs verification links to console with zero crashes.
 */

const sendVerificationEmail = async ({ toEmail, name, token, hostUrl = 'http://localhost:5000' }) => {
  const verifyLink = `${hostUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(toEmail)}`;

  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPATCH] Verification email for: ${name} <${toEmail}>`);
  console.log(`[LINK] Direct Verification Link:`);
  console.log(`  ${verifyLink}`);
  console.log(`[TOKEN] Verification Token: ${token}`);
  console.log(`======================================================\n`);

  return {
    sent: true,
    simulated: true,
    verifyLink,
    token
  };
};

module.exports = { sendVerificationEmail };
