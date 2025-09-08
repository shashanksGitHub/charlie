import { Request, Response } from 'express';
import Stripe from 'stripe';

// Prioritize live keys for production, fallback to test keys
const stripeSecretKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const isLiveMode = !!process.env.STRIPE_LIVE_SECRET_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any
}) : null;

if (stripe) {
  console.log(`[STRIPE-PAYMENT] Initialized in ${isLiveMode ? 'LIVE' : 'TEST'} mode`);
}

// Confirm payment endpoint (bypasses CardElement mounting issues)
export async function confirmPayment(req: Request, res: Response, storage: any) {
  try {
    const { clientSecret, paymentDetails } = req.body;
    
    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: "Payment processing not available"
      });
    }

    console.log("[STRIPE-BACKEND] Confirming payment with client secret:", clientSecret.substring(0, 30) + "...");
    
    // Extract payment intent ID from client secret
    const paymentIntentId = clientSecret.split('_secret_')[0];
    
    // First check the current status of the payment intent
    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("[STRIPE-SECURITY] Payment intent current status:", paymentIntent.status);
    
    // Only confirm if it hasn't been confirmed yet
    if (paymentIntent.status === 'requires_confirmation' || paymentIntent.status === 'requires_payment_method') {
      if (isLiveMode) {
        // In live mode, we cannot use test payment methods - return error
        console.log("[STRIPE-SECURITY] Cannot confirm payment in live mode without real payment method");
        return res.status(400).json({
          success: false,
          error: "Payment confirmation requires a valid payment method in live mode. Please use the Stripe Elements form instead."
        });
      } else {
        console.log("[STRIPE-SECURITY] Confirming payment intent with test payment method");
        const testPaymentMethodId = 'pm_card_visa'; // Stripe's test payment method
        
        paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: testPaymentMethodId,
        });
      }
    } else if (paymentIntent.status === 'succeeded') {
      console.log("[STRIPE-SECURITY] Payment intent already succeeded, skipping confirmation");
    } else {
      console.log("[STRIPE-SECURITY] Payment intent in unexpected state:", paymentIntent.status);
    }

    console.log("[STRIPE-BACKEND] Payment confirmation result:", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

    if (paymentIntent.status === 'succeeded') {
      // Update user premium access
      const userId = req.user!.id;
      await storage.updateUser(userId, { premiumAccess: true });
      
      console.log("[STRIPE-BACKEND] Payment successful, premium access granted to user:", userId);
      
      res.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        },
        error: null
      });
    } else {
      console.log("[STRIPE-BACKEND] Payment not successful, status:", paymentIntent.status);
      res.json({
        success: false,
        error: `Payment ${paymentIntent.status}`,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status
        }
      });
    }

  } catch (error) {
    console.error("[STRIPE-BACKEND] Payment confirmation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Payment confirmation failed"
    });
  }
}