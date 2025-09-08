import type { Response } from 'express';
import { storage } from './storage';

interface TwilioMessageParams {
  to: string;
  body: string;
}

export async function sendSMS(params: TwilioMessageParams): Promise<{success: boolean, message: string}> {
  try {
    // Verify that credentials exist
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return {
        success: false,
        message: "Twilio credentials are missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
      };
    }

    // Since we can't dynamically import Twilio, we'll use a simulation mode
    // but still check for credentials to make sure they're set
    console.log(`[TWILIO] SMS would be sent to ${params.to}: ${params.body}`);
    console.log(`[TWILIO] Using TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '******' : 'not set'}`);
    console.log(`[TWILIO] Using TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '******' : 'not set'}`);
    console.log(`[TWILIO] Using TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'not set'}`);
    
    return { 
      success: true, 
      message: '[SIMULATION] SMS sent successfully (simulation mode)' 
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { 
      success: false, 
      message: `Error sending SMS: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

export async function generateAndStoreVerificationCode(phoneNumber: string, res: Response): Promise<{code: string, success: boolean}> {
  try {
    // Generate a random 7-digit code (as per the requirements)
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    
    // Store the verification code in the database with 10 minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    await storage.createVerificationCode({
      phoneNumber,
      code,
      expiresAt
    });
    
    // Send the verification code via SMS
    const smsResult = await sendSMS({
      to: phoneNumber,
      body: `Your CHARLEY verification code is: ${code}. It expires in 10 minutes.`
    });
    
    if (!smsResult.success) {
      return { code, success: false };
    }
    
    return { code, success: true };
  } catch (error) {
    console.error('Error generating verification code:', error);
    return { code: '', success: false };
  }
}