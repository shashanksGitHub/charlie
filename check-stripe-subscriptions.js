/**
 * Script to check all Stripe subscriptions for a customer
 * This will help identify if there are multiple subscriptions or a newer active one
 */

import Stripe from 'stripe';
// Force using LIVE keys to check real subscriptions
const stripe = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY);

async function checkUserSubscriptions() {
  try {
    // First, let's search for customers by email to find the correct customer ID
    console.log('Searching for customer by email: obedamissah800@gmail.com');
    
    const customers = await stripe.customers.list({
      email: 'obedamissah800@gmail.com',
      limit: 10
    });
    
    console.log(`Found ${customers.data.length} customers with this email:`);
    
    if (customers.data.length === 0) {
      console.log('No customers found with this email in LIVE environment');
      return;
    }
    
    const customer = customers.data[0];
    console.log(`Customer found: ${customer.id}`);
    console.log(`Customer created: ${new Date(customer.created * 1000)}`);
    
    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
      expand: ['data.latest_invoice', 'data.default_payment_method']
    });
    
    console.log(`Found ${subscriptions.data.length} subscriptions:`);
    
    subscriptions.data.forEach((sub, index) => {
      console.log(`\n--- Subscription ${index + 1} ---`);
      console.log(`ID: ${sub.id}`);
      console.log(`Status: ${sub.status}`);
      console.log(`Cancel at period end: ${sub.cancel_at_period_end}`);
      console.log(`Current period start: ${new Date(sub.current_period_start * 1000)}`);
      console.log(`Current period end: ${new Date(sub.current_period_end * 1000)}`);
      console.log(`Created: ${new Date(sub.created * 1000)}`);
      if (sub.canceled_at) {
        console.log(`Canceled at: ${new Date(sub.canceled_at * 1000)}`);
      }
      if (sub.latest_invoice) {
        console.log(`Latest invoice status: ${sub.latest_invoice.status}`);
        console.log(`Latest invoice amount: $${(sub.latest_invoice.amount_paid / 100).toFixed(2)}`);
      }
    });
    
    // Find the most recent active subscription
    const activeSubscriptions = subscriptions.data.filter(sub => 
      sub.status === 'active' || 
      (sub.status === 'canceled' && new Date(sub.current_period_end * 1000) > new Date())
    );
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total subscriptions: ${subscriptions.data.length}`);
    console.log(`Active/Grace period subscriptions: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length > 0) {
      const newest = activeSubscriptions.sort((a, b) => b.created - a.created)[0];
      console.log(`\nNewest active/grace subscription:`);
      console.log(`ID: ${newest.id}`);
      console.log(`Status: ${newest.status}`);
      console.log(`Should be used: ${newest.id !== 'sub_1RhrGUCEnma3eoA3DO5mI3jY' ? 'YES - DIFFERENT FROM DATABASE' : 'NO - MATCHES DATABASE'}`);
    }
    
  } catch (error) {
    console.error('Error checking subscriptions:', error.message);
  }
}

checkUserSubscriptions();