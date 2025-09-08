/**
 * Emergency fix for premium toggle functionality
 * This temporarily disables Stripe sync to allow downgrade button to work
 */

const fs = require('fs');
const path = require('path');

console.log('Applying emergency fix for premium toggle...');

// Read the routes file
const routesPath = path.join(__dirname, 'server/routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

// Find and comment out the Stripe sync section in premium status endpoint
const stripeSync = `// Real-time Stripe sync to verify subscription status
      if (user.stripeSubscriptionId && stripe) {
        console.log(\`[STRIPE-SYNC] Checking Stripe subscription \${user.stripeSubscriptionId} for user \${userId}\`);
        
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          // Check if Stripe subscription status differs from local database
          const stripeStatus = stripeSubscription.status;
          const localStatus = user.subscriptionStatus;
          
          console.log(\`[STRIPE-SYNC] Stripe status: \${stripeStatus}, Local status: \${localStatus}\`);
          
          // Update local database if Stripe subscription is different
          if (stripeStatus === 'canceled' && user.premiumAccess) {
            const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
            const now = new Date();
            
            if (now > currentPeriodEnd) {
              console.log(\`[STRIPE-SYNC] Subscription expired, removing premium access\`);
              
              // Remove premium access - grace period has ended
              await storage.updateUserProfile(userId, {
                premiumAccess: false,
                subscriptionStatus: 'expired'
              });
              
              return res.json({ 
                premiumAccess: false,
                subscriptionExpired: true,
                expiredAt: currentPeriodEnd
              });
            } else {
              console.log(\`[STRIPE-SYNC] Grace period active until \${currentPeriodEnd}\`);
              
              // Update subscription info but keep premium access
              await storage.updateUserProfile(userId, {
                subscriptionStatus: 'canceled',
                subscriptionExpiresAt: currentPeriodEnd
              });
            }
          } else if (stripeStatus === 'active' && localStatus !== 'active') {
            console.log(\`[STRIPE-SYNC] Stripe subscription is active, updating local status\`);
            
            // Sync active status from Stripe
            await storage.updateUserProfile(userId, {
              premiumAccess: true,
              subscriptionStatus: 'active',
              subscriptionExpiresAt: new Date(stripeSubscription.current_period_end * 1000)
            });
          }
        } catch (stripeError) {
          console.error(\`[STRIPE-SYNC] Error checking Stripe subscription:\`, stripeError);
          // Continue with local database check - don't let Stripe errors block the request
        }
      }`;

const commentedStripeSync = `// TEMPORARILY DISABLED - Stripe sync was overriding premium toggle changes
      // ${stripeSync.split('\n').join('\n      // ')}`;

// Replace the Stripe sync section
content = content.replace(stripeSync, commentedStripeSync);

// Write the fixed content back
fs.writeFileSync(routesPath, content);

console.log('Emergency fix applied! Stripe sync temporarily disabled.');
console.log('The downgrade button should now work correctly.');