import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolveMx);

interface EmailVerificationResult {
  isValid: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface MXRecord {
  exchange: string;
  priority: number;
}

/**
 * Comprehensive email verification service using SMTP protocol
 * Checks email existence without sending actual emails
 */
export class EmailVerificationService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly COMMON_DISPOSABLE_DOMAINS = new Set([
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    'throwaway.email',
    'temp-mail.org',
    'getnada.com'
  ]);

  /**
   * Main email verification method
   */
  static async verifyEmail(email: string): Promise<EmailVerificationResult> {
    try {
      // Step 1: Basic format validation
      const formatResult = this.validateEmailFormat(email);
      if (!formatResult.isValid) {
        return formatResult;
      }

      const domain = email.split('@')[1].toLowerCase();

      // Step 2: Check for disposable email domains
      if (this.COMMON_DISPOSABLE_DOMAINS.has(domain)) {
        return {
          isValid: false,
          reason: 'Disposable email address detected',
          confidence: 'high'
        };
      }

      // Step 3: DNS MX record validation
      const mxResult = await this.checkMXRecords(domain);
      if (!mxResult.isValid) {
        return mxResult;
      }

      // Step 4: SMTP verification
      const smtpResult = await this.performSMTPVerification(email, mxResult.mxRecords!);
      return smtpResult;

    } catch (error) {
      console.error('[EMAIL-VERIFICATION] Verification failed:', error);
      return {
        isValid: false,
        reason: 'Verification service temporarily unavailable',
        confidence: 'low'
      };
    }
  }

  /**
   * Validate email format using RFC 5322 compliant regex
   */
  private static validateEmailFormat(email: string): EmailVerificationResult {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!email || !emailRegex.test(email)) {
      return {
        isValid: false,
        reason: 'Invalid email format',
        confidence: 'high'
      };
    }

    // Check for common invalid patterns
    if (email.length > 254 || email.split('@')[0].length > 64) {
      return {
        isValid: false,
        reason: 'Email address too long',
        confidence: 'high'
      };
    }

    return { isValid: true, confidence: 'high' };
  }

  /**
   * Check MX records for the domain
   */
  private static async checkMXRecords(domain: string): Promise<EmailVerificationResult & { mxRecords?: MXRecord[] }> {
    try {
      const mxRecords = await dnsResolve(domain);
      
      if (!mxRecords || mxRecords.length === 0) {
        return {
          isValid: false,
          reason: 'No mail servers found for domain',
          confidence: 'high'
        };
      }

      // Sort by priority (lower number = higher priority)
      const sortedMXRecords = mxRecords.sort((a, b) => a.priority - b.priority);

      return {
        isValid: true,
        confidence: 'medium',
        mxRecords: sortedMXRecords
      };

    } catch (error) {
      return {
        isValid: false,
        reason: 'Domain does not exist or has no mail servers',
        confidence: 'high'
      };
    }
  }

  /**
   * Perform SMTP verification without sending emails
   */
  private static async performSMTPVerification(email: string, mxRecords: MXRecord[]): Promise<EmailVerificationResult> {
    const userPart = email.split('@')[0];
    const domain = email.split('@')[1];

    // Try each MX record in order of priority
    for (const mx of mxRecords) {
      try {
        const result = await this.testSMTPConnection(mx.exchange, email, userPart, domain);
        if (result.isValid !== undefined) {
          return result;
        }
      } catch (error) {
        console.log(`[EMAIL-VERIFICATION] Failed to connect to ${mx.exchange}:`, error);
        continue; // Try next MX record
      }
    }

    return {
      isValid: false,
      reason: 'Unable to verify email existence - mail servers not responding',
      confidence: 'low'
    };
  }

  /**
   * Test SMTP connection and verify email existence
   */
  private static async testSMTPConnection(
    mxHost: string, 
    email: string, 
    userPart: string, 
    domain: string
  ): Promise<EmailVerificationResult> {
    return new Promise((resolve) => {
      const socket = net.createConnection(25, mxHost);
      let step = 0;
      let responseBuffer = '';

      const cleanup = () => {
        socket.removeAllListeners();
        if (!socket.destroyed) {
          socket.destroy();
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve({
          isValid: false,
          reason: 'SMTP server timeout',
          confidence: 'low'
        });
      }, this.TIMEOUT);

      socket.on('connect', () => {
        console.log(`[EMAIL-VERIFICATION] Connected to ${mxHost}`);
      });

      socket.on('data', (data) => {
        responseBuffer += data.toString();
        const lines = responseBuffer.split('\r\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          console.log(`[EMAIL-VERIFICATION] Server response: ${line}`);
          
          try {
            switch (step) {
              case 0: // Initial connection
                if (line.startsWith('220')) {
                  socket.write(`HELO btechnos.com\r\n`);
                  step = 1;
                } else if (line.startsWith('4') || line.startsWith('5')) {
                  clearTimeout(timeout);
                  cleanup();
                  resolve({
                    isValid: false,
                    reason: 'Mail server rejected connection',
                    confidence: 'medium'
                  });
                  return;
                }
                break;

              case 1: // HELO response
                if (line.startsWith('250')) {
                  socket.write(`MAIL FROM:<admin@kronogon.com>\r\n`);
                  step = 2;
                } else {
                  clearTimeout(timeout);
                  cleanup();
                  resolve({
                    isValid: false,
                    reason: 'HELO command failed',
                    confidence: 'medium'
                  });
                  return;
                }
                break;

              case 2: // MAIL FROM response
                if (line.startsWith('250')) {
                  socket.write(`RCPT TO:<${email}>\r\n`);
                  step = 3;
                } else {
                  clearTimeout(timeout);
                  cleanup();
                  resolve({
                    isValid: false,
                    reason: 'MAIL FROM command failed',
                    confidence: 'medium'
                  });
                  return;
                }
                break;

              case 3: // RCPT TO response - This is the crucial step
                clearTimeout(timeout);
                socket.write(`QUIT\r\n`);
                
                if (line.startsWith('250')) {
                  cleanup();
                  resolve({
                    isValid: true,
                    confidence: 'high'
                  });
                  return;
                } else if (line.startsWith('550') || line.startsWith('551') || line.startsWith('553')) {
                  cleanup();
                  resolve({
                    isValid: false,
                    reason: 'Email address does not exist',
                    confidence: 'high'
                  });
                  return;
                } else if (line.startsWith('452') || line.startsWith('421')) {
                  cleanup();
                  resolve({
                    isValid: false,
                    reason: 'Mail server temporarily unavailable',
                    confidence: 'low'
                  });
                  return;
                } else {
                  cleanup();
                  resolve({
                    isValid: false,
                    reason: 'Unknown SMTP response',
                    confidence: 'low'
                  });
                  return;
                }
            }
          } catch (stepError) {
            console.error('[EMAIL-VERIFICATION] Step processing error:', stepError);
            clearTimeout(timeout);
            cleanup();
            resolve({
              isValid: false,
              reason: 'SMTP verification error',
              confidence: 'low'
            });
            return;
          }
        }
        
        responseBuffer = lines[lines.length - 1];
      });

      socket.on('error', (error) => {
        console.error(`[EMAIL-VERIFICATION] Socket error for ${mxHost}:`, error);
        clearTimeout(timeout);
        cleanup();
        resolve({
          isValid: false,
          reason: 'Connection failed to mail server',
          confidence: 'medium'
        });
      });

      socket.on('close', () => {
        clearTimeout(timeout);
        cleanup();
      });
    });
  }

  /**
   * Quick validation for common email providers (fallback method)
   */
  static async quickValidation(email: string): Promise<EmailVerificationResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    
    // List of reliable email providers that we can trust exist
    const trustedProviders = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'icloud.com', 'aol.com', 'protonmail.com', 'zoho.com'
    ]);

    if (trustedProviders.has(domain)) {
      return {
        isValid: true,
        confidence: 'medium'
      };
    }

    // For other domains, just check format and MX records
    const formatResult = this.validateEmailFormat(email);
    if (!formatResult.isValid) {
      return formatResult;
    }

    const mxResult = await this.checkMXRecords(domain);
    return {
      isValid: mxResult.isValid,
      reason: mxResult.reason,
      confidence: mxResult.isValid ? 'medium' : 'high'
    };
  }
}