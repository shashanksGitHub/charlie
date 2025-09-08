import { sendEmail } from './sendgrid';
import crypto from 'crypto';

interface SecurityChangeNotification {
  userId: number;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  changeType: 'password' | 'email' | 'phone';
  oldValue?: string;
  newValue?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface DisputeInfo {
  userId: number;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  changeType: 'password' | 'email' | 'phone';
  oldValue?: string;
  newValue?: string;
  disputeToken: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

// Store dispute tokens in memory (in production, use Redis or database)
const disputeTokens = new Map<string, DisputeInfo>();

export async function sendSecurityChangeNotification(
  notification: SecurityChangeNotification
): Promise<boolean> {
  try {
    // Generate unique dispute token (optimized - smaller token for faster processing)
    const disputeToken = crypto.randomBytes(16).toString('hex');
    
    // Store dispute information
    const disputeInfo: DisputeInfo = {
      ...notification,
      disputeToken,
      timestamp: new Date(),
    };
    disputeTokens.set(disputeToken, disputeInfo);
    
    // Create dispute URL
    const disputeUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://your-domain.com'}/dispute?token=${disputeToken}`;
    
    // Get change type display text
    const changeTypeText = getChangeTypeText(notification.changeType);
    const oldValueDisplay = getValueDisplay(notification.changeType, notification.oldValue);
    const newValueDisplay = getValueDisplay(notification.changeType, notification.newValue);
    
    const subject = `🔒 Security Alert: Your ${changeTypeText} Has Been Changed`;
    
    // Optimized lightweight HTML template for faster email delivery
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ff4444; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">🔒 Security Alert</h1>
          <p style="margin: 10px 0 0 0;">Account Change Detected</p>
        </div>
        
        <p>Hello <strong>${notification.fullName}</strong>,</p>
        
        <div style="background: #fff5f5; border: 1px solid #ffcccb; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #e53e3e; margin-top: 0;">⚠️ Your ${changeTypeText.toLowerCase()} has been changed</h3>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ${notification.userAgent ? `<p><strong>Device:</strong> ${notification.userAgent}</p>` : ''}
          ${notification.ipAddress ? `<p><strong>IP Address:</strong> ${notification.ipAddress}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <p><strong>Did you make this change?</strong></p>
          <p>If <strong>NO</strong>, click below to dispute:</p>
          <a href="${disputeUrl}" style="background: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🚨 I Did NOT Make This Change
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          <strong>CHARLEY Security Team</strong><br>
          If you made this change, you can ignore this email.<br>
          Questions? Contact <a href="mailto:admin@kronogon.com">admin@kronogon.com</a>
        </p>
      </body>
      </html>
    `;
    
    // Optimized lightweight text content for faster processing
    const textContent = `
SECURITY ALERT - ${changeTypeText} Changed

Hello ${notification.fullName},

Your ${changeTypeText.toLowerCase()} was changed on ${new Date().toLocaleString()}.

${notification.userAgent ? `Device: ${notification.userAgent}` : ''}
${notification.ipAddress ? `IP: ${notification.ipAddress}` : ''}

If you did NOT make this change, dispute immediately:
${disputeUrl}

Otherwise, ignore this email.

CHARLEY Security Team
admin@kronogon.com
    `;
    
    const success = await sendEmail(process.env.SENDGRID_API_KEY!, {
      to: notification.email,
      from: 'admin@kronogon.com',
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    if (success) {
      console.log(`[SECURITY-NOTIFICATION] Sent ${notification.changeType} change notification to ${notification.email}`);
    } else {
      console.error(`[SECURITY-NOTIFICATION] Failed to send ${notification.changeType} change notification to ${notification.email}`);
    }
    
    return success;
  } catch (error) {
    console.error('[SECURITY-NOTIFICATION] Error sending security notification:', error);
    return false;
  }
}

export async function handleSecurityDispute(disputeToken: string, req: any): Promise<boolean> {
  try {
    const disputeInfo = disputeTokens.get(disputeToken);
    
    if (!disputeInfo) {
      console.log(`[SECURITY-DISPUTE] Invalid or expired dispute token: ${disputeToken}`);
      return false;
    }
    
    // Check if token is expired (7 days)
    const tokenAge = Date.now() - disputeInfo.timestamp.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (tokenAge > sevenDays) {
      disputeTokens.delete(disputeToken);
      console.log(`[SECURITY-DISPUTE] Expired dispute token: ${disputeToken}`);
      return false;
    }
    
    // Send alert to admin
    const success = await sendDisputeAlertToAdmin(disputeInfo, req);
    
    if (success) {
      // Mark token as used
      disputeTokens.delete(disputeToken);
      console.log(`[SECURITY-DISPUTE] Successfully processed dispute for user ${disputeInfo.userId}`);
    }
    
    return success;
  } catch (error) {
    console.error('[SECURITY-DISPUTE] Error handling security dispute:', error);
    return false;
  }
}

async function sendDisputeAlertToAdmin(disputeInfo: DisputeInfo, req: any): Promise<boolean> {
  try {
    const changeTypeText = getChangeTypeText(disputeInfo.changeType);
    const oldValueDisplay = getValueDisplay(disputeInfo.changeType, disputeInfo.oldValue);
    const newValueDisplay = getValueDisplay(disputeInfo.changeType, disputeInfo.newValue);
    
    const subject = `🚨 URGENT: Security Dispute - Unauthorized ${changeTypeText} Change`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Dispute Alert</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.5; 
      margin: 0; 
      padding: 20px; 
      background: #f7fafc;
      color: #2d3748;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 8px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #e53e3e, #c53030); 
      color: white; 
      padding: 20px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 22px; 
      font-weight: 700; 
    }
    .urgent-banner {
      background: #fed7d7;
      color: #742a2a;
      padding: 12px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
    }
    .content { 
      padding: 20px; 
    }
    .info-section {
      background: #f7fafc;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      border-left: 4px solid #e53e3e;
    }
    .info-section h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #2d3748;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 8px;
      margin: 0;
    }
    .label {
      font-weight: 600;
      color: #4a5568;
    }
    .value {
      color: #2d3748;
    }
    .action-required {
      background: #fed7d7;
      color: #742a2a;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      border: 2px solid #f56565;
    }
    .action-required h3 {
      margin: 0 0 12px 0;
      color: #742a2a;
    }
    .footer { 
      background: #edf2f7; 
      padding: 16px; 
      text-align: center; 
      font-size: 12px; 
      color: #718096;
    }
    ol { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="urgent-banner">
      🚨 URGENT SECURITY ALERT - IMMEDIATE ACTION REQUIRED
    </div>
    
    <div class="header">
      <h1>Security Dispute Reported</h1>
      <p style="margin: 8px 0 0 0;">Unauthorized account change disputed by user</p>
    </div>
    
    <div class="content">
      <div class="info-section">
        <h3>👤 User Information</h3>
        <div class="info-grid">
          <span class="label">User ID:</span>
          <span class="value">#${disputeInfo.userId}</span>
          <span class="label">Name:</span>
          <span class="value">${disputeInfo.fullName}</span>
          <span class="label">Email:</span>
          <span class="value">${disputeInfo.email}</span>
          <span class="label">Phone:</span>
          <span class="value">${disputeInfo.phoneNumber || 'Not provided'}</span>
        </div>
      </div>
      
      <div class="info-section">
        <h3>📋 Disputed Change Details</h3>
        <div class="info-grid">
          <span class="label">Change Type:</span>
          <span class="value">${changeTypeText}</span>
          ${disputeInfo.oldValue ? `<span class="label">Previous Value:</span><span class="value">${oldValueDisplay}</span>` : ''}
          ${disputeInfo.newValue ? `<span class="label">New Value:</span><span class="value">${newValueDisplay}</span>` : ''}
          <span class="label">Change Time:</span>
          <span class="value">${disputeInfo.timestamp.toLocaleString()}</span>
          <span class="label">Dispute Time:</span>
          <span class="value">${new Date().toLocaleString()}</span>
          ${disputeInfo.userAgent ? `<span class="label">Device/Browser:</span><span class="value">${disputeInfo.userAgent}</span>` : ''}
          ${disputeInfo.ipAddress ? `<span class="label">IP Address:</span><span class="value">${disputeInfo.ipAddress}</span>` : ''}
        </div>
      </div>
      
      <div class="action-required">
        <h3>🎯 Immediate Actions Required</h3>
        <ol>
          <li><strong>Contact the user within 24 hours</strong> at ${disputeInfo.email}</li>
          <li><strong>Verify the user's identity</strong> through additional security questions</li>
          <li><strong>Review account activity logs</strong> for suspicious behavior</li>
          <li><strong>Consider temporarily suspending the account</strong> if fraud is suspected</li>
          <li><strong>Reverse the unauthorized change</strong> if confirmed as fraudulent</li>
          <li><strong>Implement additional security measures</strong> if needed</li>
        </ol>
      </div>
      
      <p style="font-size: 14px; font-weight: 600; color: #742a2a; text-align: center; margin: 20px 0;">
        This is a high-priority security incident requiring immediate attention.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>CHARLEY Security System</strong></p>
      <p>Automated security dispute notification - Generated at ${new Date().toLocaleString()}</p>
      <p>For technical issues, contact the development team immediately.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    const textContent = `
URGENT SECURITY ALERT - UNAUTHORIZED ACCOUNT CHANGE DISPUTED

User Information:
- User ID: #${disputeInfo.userId}
- Name: ${disputeInfo.fullName}
- Email: ${disputeInfo.email}
- Phone: ${disputeInfo.phoneNumber || 'Not provided'}

Disputed Change Details:
- Change Type: ${changeTypeText}
${disputeInfo.oldValue ? `- Previous Value: ${oldValueDisplay}` : ''}
${disputeInfo.newValue ? `- New Value: ${newValueDisplay}` : ''}
- Change Timestamp: ${disputeInfo.timestamp.toLocaleString()}
- Dispute Timestamp: ${new Date().toLocaleString()}
${disputeInfo.userAgent ? `- Device/Browser: ${disputeInfo.userAgent}` : ''}
${disputeInfo.ipAddress ? `- IP Address: ${disputeInfo.ipAddress}` : ''}

IMMEDIATE ACTIONS REQUIRED:
1. Contact the user within 24 hours at ${disputeInfo.email}
2. Verify the user's identity through additional security questions
3. Review account activity logs for suspicious behavior
4. Consider temporarily suspending the account if fraud is suspected
5. Reverse the unauthorized change if confirmed as fraudulent
6. Implement additional security measures if needed

This is a high-priority security incident requiring immediate attention.

CHARLEY Security System
Generated at ${new Date().toLocaleString()}
    `;
    
    const success = await sendEmail(process.env.SENDGRID_API_KEY!, {
      to: 'admin@kronogon.com',
      from: 'admin@kronogon.com',
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    if (success) {
      console.log(`[SECURITY-DISPUTE] Sent dispute alert to admin for user ${disputeInfo.userId}`);
    } else {
      console.error(`[SECURITY-DISPUTE] Failed to send dispute alert to admin for user ${disputeInfo.userId}`);
    }
    
    return success;
  } catch (error) {
    console.error('[SECURITY-DISPUTE] Error sending dispute alert to admin:', error);
    return false;
  }
}

function getChangeTypeText(changeType: string): string {
  switch (changeType) {
    case 'password': return 'Password';
    case 'email': return 'Email Address';
    case 'phone': return 'Phone Number';
    default: return 'Account Information';
  }
}

function getValueDisplay(changeType: string, value?: string): string {
  if (!value) return 'Not specified';
  
  switch (changeType) {
    case 'password':
      return '••••••••'; // Never show actual passwords
    case 'email':
      return value;
    case 'phone':
      return value;
    default:
      return value;
  }
}

export function getDisputeInfo(token: string): DisputeInfo | undefined {
  return disputeTokens.get(token);
}

export function cleanupExpiredTokens(): void {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  for (const [token, info] of disputeTokens) {
    if (now - info.timestamp.getTime() > sevenDays) {
      disputeTokens.delete(token);
    }
  }
}

// Cleanup expired tokens every 24 hours
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);