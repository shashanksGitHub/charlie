import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Smartphone,
  Banknote,
  Globe,
  Shield,
  Check,
  Crown,
  Sparkles,
  Star,
  Zap,
  Lock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// PRODUCTION-AWARE STRIPE INITIALIZATION
// Handle environment variable mapping differences between development and production
const VITE_STRIPE_LIVE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY;
const VITE_STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Production fallback: If environment variables aren't mapped correctly, use the confirmed live key
const PRODUCTION_LIVE_KEY = "pk_live_51RgwjDCEnma3eoA3uk6kj2JDepeiIjYI9MlsYFyqLmD1yjuAiNB8qgNCIsAsLD5xwUMHhbxuJIXxPQzMplEElBTj00j3GopuSV";

let STRIPE_PUBLISHABLE_KEY: string;
let isLiveMode: boolean;

// Priority 1: Use explicit live environment variable if available
if (VITE_STRIPE_LIVE_PUBLISHABLE_KEY && VITE_STRIPE_LIVE_PUBLISHABLE_KEY.startsWith('pk_live_')) {
  STRIPE_PUBLISHABLE_KEY = VITE_STRIPE_LIVE_PUBLISHABLE_KEY;
  isLiveMode = true;
  console.log(`[STRIPE-ENV-FIX] Using VITE_STRIPE_LIVE_PUBLISHABLE_KEY from environment`);
}
// Priority 2: Check if standard key is actually the live key
else if (VITE_STRIPE_PUBLISHABLE_KEY && VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) {
  STRIPE_PUBLISHABLE_KEY = VITE_STRIPE_PUBLISHABLE_KEY;
  isLiveMode = true;
  console.log(`[STRIPE-ENV-FIX] Using VITE_STRIPE_PUBLISHABLE_KEY (detected as live key)`);
}
// Priority 3: Production fallback to confirmed working key
else {
  STRIPE_PUBLISHABLE_KEY = PRODUCTION_LIVE_KEY;
  isLiveMode = true;
  console.log(`[STRIPE-ENV-FIX] Using production fallback live key (environment variables unavailable)`);
  console.log(`[STRIPE-ENV-FIX] VITE_STRIPE_LIVE_PUBLISHABLE_KEY:`, VITE_STRIPE_LIVE_PUBLISHABLE_KEY);
  console.log(`[STRIPE-ENV-FIX] VITE_STRIPE_PUBLISHABLE_KEY:`, VITE_STRIPE_PUBLISHABLE_KEY);
}

console.log(`[STRIPE-CRITICAL-FIX] Environment: ${isLiveMode ? 'LIVE (CORRECT)' : 'TEST/WRONG (ERROR!)'}`);
console.log(`[STRIPE-CRITICAL-FIX] Key prefix:`, STRIPE_PUBLISHABLE_KEY.substring(0, 20) + "...");
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface RegionalPricing {
  id: number;
  planType: string;
  region: string;
  currency: string;
  amount: number;
  discountPercentage: number;
}

interface PricingPlan {
  type: string;
  name: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  savings?: string;
}

// Move pricingPlans inside component to access translate function
// This will be defined inside the PaymentPageWithStripe component

interface SavedMobileMoneyOption {
  id: string;
  nickname: string;
  provider: string;
  mobileNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface SavedCreditCard {
  id: string;
  nickname: string;
  cardNumber: string; // Last 4 digits for display
  expiryDate: string;
  cvv: string;
  cardType: string; // visa, mastercard, amex, etc.
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethodId?: string; // Stripe payment method ID for live mode
}

interface SavedBankAccount {
  id: string;
  nickname: string;
  accountType: string; // checking or savings
  nameOnAccount: string;
  routingNumber: string;
  accountNumber: string; // Last 4 digits for display
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface SavedDigitalWallet {
  id: string;
  nickname: string;
  provider: string; // paypal, apple_pay, google_pay, amazon_pay
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface PaymentFormData {
  planType: string;
  paymentMethod: string;
  region: string;
  promoCode?: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentDetails: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    mobileNumber?: string;
    provider?: string;
    bankCode?: string;
    accountNumber?: string;
    accountType?: string;
    nameOnAccount?: string;
    routingNumber?: string;
    reenterAccountNumber?: string;
    nickname?: string;
  };
}

// PaymentPage Component with Stripe hooks - this must be inside Elements provider
function PaymentPageWithStripe() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { translate } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [step, setStep] = useState<
    "plan" | "payment_method" | "final_payment" | "stripe_checkout" | "processing" | "success"
  >("plan");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Initialize form data with localStorage persistence
  const [formData, setFormData] = useState<PaymentFormData>(() => {
    try {
      const saved = localStorage.getItem('charley_payment_form_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to load saved form data:', error);
    }
    return {
      planType: "",
      paymentMethod: "",
      region: "global",
      customerInfo: {
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      paymentDetails: {},
    };
  });

  // Initialize selected plan with localStorage persistence
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(() => {
    try {
      const saved = localStorage.getItem('charley_selected_plan');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to load saved plan:', error);
    }
    return null;
  });

  const [promoDiscount, setPromoDiscount] = useState(0);
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string>("");
  
  // Initialize saved mobile money options with localStorage persistence
  const [savedMobileMoneyOptions, setSavedMobileMoneyOptions] = useState<SavedMobileMoneyOption[]>(() => {
    try {
      const saved = localStorage.getItem('charley_saved_mobile_money_options');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to load saved mobile money options:', error);
    }
    return [];
  });

  const [currentEditingOptionId, setCurrentEditingOptionId] = useState<string | null>(null);
  const [showAddNewMobileMoney, setShowAddNewMobileMoney] = useState(false);
  const [openAccordionValue, setOpenAccordionValue] = useState<string>("");
  const [selectedMobileMoneyOptionId, setSelectedMobileMoneyOptionId] = useState<string | null>(null);

  // Credit Card states
  const [savedCreditCards, setSavedCreditCards] = useState<SavedCreditCard[]>(() => {
    try {
      const saved = localStorage.getItem('charley_saved_credit_cards');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to load saved credit cards:', error);
    }
    return [];
  });

  const [currentEditingCardId, setCurrentEditingCardId] = useState<string | null>(null);
  const [showAddNewCreditCard, setShowAddNewCreditCard] = useState(false);
  const [openCardAccordionValue, setOpenCardAccordionValue] = useState<string>("");
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string | null>(null);

  // Bank Account states
  const [savedBankAccounts, setSavedBankAccounts] = useState<SavedBankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('charley_saved_bank_accounts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to load saved bank accounts:', error);
    }
    return [];
  });

  const [currentEditingAccountId, setCurrentEditingAccountId] = useState<string | null>(null);
  const [showAddNewBankAccount, setShowAddNewBankAccount] = useState(false);
  const [openBankAccordionValue, setOpenBankAccordionValue] = useState<string>("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);

  // Digital Wallet states
  const [savedDigitalWallets, setSavedDigitalWallets] = useState<SavedDigitalWallet[]>(() => {
    try {
      const saved = localStorage.getItem('charley_saved_digital_wallets');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to load saved digital wallets:', error);
    }
    return [];
  });

  const [currentEditingWalletId, setCurrentEditingWalletId] = useState<string | null>(null);
  const [showAddNewDigitalWallet, setShowAddNewDigitalWallet] = useState(false);
  const [openWalletAccordionValue, setOpenWalletAccordionValue] = useState<string>("");
  const [selectedDigitalWalletId, setSelectedDigitalWalletId] = useState<string | null>(null);

  // Define pricing plans with translations
  const pricingPlans: PricingPlan[] = [
    {
      type: "premium_monthly",
      name: translate("payment.monthly"),
      period: translate("payment.perMonth"),
      description: translate("payment.perfectForGettingStarted"),
      features: [
        translate("payment.unlimitedMatches"),
        translate("payment.ghostMode"),
        translate("payment.hideAge"),
        translate("payment.prioritySupport"),
      ],
    },
    {
      type: "premium_quarterly",
      name: translate("payment.quarterly"),
      period: translate("payment.perThreeMonths"),
      description: translate("payment.mostPopularChoice"),
      features: [
        translate("payment.allMonthlyFeatures"),
        translate("payment.savings15"),
        translate("payment.extendedAnalytics"),
        translate("payment.bonusRewards"),
      ],
      popular: true,
      savings: translate("payment.save15"),
    },
    {
      type: "premium_yearly",
      name: translate("payment.yearly"),
      period: translate("payment.perYear"),
      description: translate("payment.bestValueForSeriousUsers"),
      features: [
        translate("payment.allMonthlyFeatures"),
        translate("payment.save40"),
        translate("payment.prioritySupport"),
        translate("payment.bonusRewards"),
      ],
      savings: translate("payment.save40"),
    },
  ];

  // Unified payment method selection state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<{
    type: 'mobile_money' | 'credit_card' | 'bank_account' | 'digital_wallet' | null;
    id: string | null;
  }>({ type: null, id: null });

  // Utility function to handle unified payment method selection
  const selectPaymentOption = (type: 'mobile_money' | 'credit_card' | 'bank_account' | 'digital_wallet', id: string) => {
    // Clear all other selections
    setSelectedMobileMoneyOptionId(null);
    setSelectedCreditCardId(null);
    setSelectedBankAccountId(null);
    setSelectedDigitalWalletId(null);
    
    // Set the new selection
    setSelectedPaymentMethod({ type, id });
    
    // Set the specific selection for the chosen type
    if (type === 'mobile_money') {
      setSelectedMobileMoneyOptionId(id);
    } else if (type === 'credit_card') {
      setSelectedCreditCardId(id);
    } else if (type === 'bank_account') {
      setSelectedBankAccountId(id);
    } else if (type === 'digital_wallet') {
      setSelectedDigitalWalletId(id);
    }
  };

  // Utility function to clear all selections
  const clearAllSelections = () => {
    setSelectedPaymentMethod({ type: null, id: null });
    setSelectedMobileMoneyOptionId(null);
    setSelectedCreditCardId(null);
    setSelectedBankAccountId(null);
    setSelectedDigitalWalletId(null);
  };

  // Clear test mode data when transitioning to live mode - run only once when needed
  useEffect(() => {
    if (isLiveMode) {
      // Check if we've already done the live mode cleanup
      const hasCleanedForLiveMode = localStorage.getItem('charley_live_mode_cleanup_done');
      
      if (!hasCleanedForLiveMode) {
        console.log('[PAYMENT] First time in live mode - clearing test mode saved payment data');
        
        // Clear all test mode saved payment data
        localStorage.removeItem('charley_saved_credit_cards');
        localStorage.removeItem('charley_saved_bank_accounts');
        localStorage.removeItem('charley_saved_mobile_money_options');
        localStorage.removeItem('charley_saved_digital_wallets');
        
        // Reset saved payment states
        setSavedCreditCards([]);
        setSavedBankAccounts([]);
        setSavedMobileMoneyOptions([]);
        setSavedDigitalWallets([]);
        
        // Clear any selections
        clearAllSelections();
        
        // Mark that we've done the cleanup
        localStorage.setItem('charley_live_mode_cleanup_done', 'true');
        
        // Removed disruptive "Live Payment Mode" toast notification for seamless payment flow
        // Console logging provides sufficient developer feedback for live mode detection
      } else {
        console.log('[PAYMENT] Live mode detected - saved payment data preserved');
      }
    }
  }, []); // Run only once on mount

  // Persist form data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('charley_payment_form_data', JSON.stringify(formData));
    } catch (error) {
      console.warn('[PAYMENT] Failed to save form data:', error);
    }
  }, [formData]);

  // Persist selected plan to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedPlan) {
        localStorage.setItem('charley_selected_plan', JSON.stringify(selectedPlan));
      } else {
        localStorage.removeItem('charley_selected_plan');
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to save selected plan:', error);
    }
  }, [selectedPlan]);

  // Persist saved mobile money options to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('charley_saved_mobile_money_options', JSON.stringify(savedMobileMoneyOptions));
    } catch (error) {
      console.warn('[PAYMENT] Failed to save mobile money options:', error);
    }
  }, [savedMobileMoneyOptions]);

  // Auto-selection removed - users must manually select payment options

  // Persist saved credit cards to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('charley_saved_credit_cards', JSON.stringify(savedCreditCards));
    } catch (error) {
      console.warn('[PAYMENT] Failed to save credit cards:', error);
    }
  }, [savedCreditCards]);

  // Auto-selection removed - users must manually select payment options

  // Persist saved bank accounts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('charley_saved_bank_accounts', JSON.stringify(savedBankAccounts));
    } catch (error) {
      console.warn('[PAYMENT] Failed to save bank accounts:', error);
    }
  }, [savedBankAccounts]);

  // Persist saved digital wallets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('charley_saved_digital_wallets', JSON.stringify(savedDigitalWallets));
    } catch (error) {
      console.warn('[PAYMENT] Failed to save digital wallets:', error);
    }
  }, [savedDigitalWallets]);



  // Auto-selection removed - users must manually select payment options

  // Clear payment data function for testing/debugging
  const clearPaymentData = () => {
    try {
      localStorage.removeItem('charley_payment_form_data');
      localStorage.removeItem('charley_selected_plan');
      localStorage.removeItem('charley_saved_mobile_money_options');
      localStorage.removeItem('charley_saved_credit_cards');
      localStorage.removeItem('charley_saved_bank_accounts');
      localStorage.removeItem('charley_saved_digital_wallets');
      localStorage.removeItem('charley_live_mode_cleanup_done');
      console.log('[PAYMENT] All payment data cleared from localStorage');
      
      // Reset state to defaults (global region for clean testing)
      setFormData({
        planType: "",
        paymentMethod: "",
        region: "global",
        customerInfo: {
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          postalCode: "",
          country: "",
        },
        paymentDetails: {},
      });
      setSelectedPlan(null);
      setSavedMobileMoneyOptions([]);
      setExpandedPaymentMethod("");
      setOpenAccordionValue("");
      
      toast({
        title: "Payment Data Cleared",
        description: "All saved payment information has been reset. Region persistence should now work correctly.",
      });
    } catch (error) {
      console.warn('[PAYMENT] Failed to clear payment data:', error);
    }
  };

  // Add debug button to clear localStorage (temporary for testing)
  if (window.location.search.includes('debug=true')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-sm">
          <h2 className="text-white text-xl mb-4">Payment Debug Mode</h2>
          <p className="text-gray-300 mb-4">Clear all saved payment data to test region persistence</p>
          <button
            onClick={clearPaymentData}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg mr-4"
          >
            Clear All Payment Data
          </button>
          <button
            onClick={() => window.location.href = '/payment'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Return to Payment Page
          </button>
        </div>
      </div>
    );
  }

  // Helper functions for mobile money management
  const saveMobileMoneyOption = () => {
    const { provider, mobileNumber, nickname } = formData.paymentDetails;
    
    if (!provider || !mobileNumber || !nickname) {
      toast({
        title: "Missing Information",
        description: "Please fill in all mobile money details including nickname.",
        variant: "destructive",
      });
      return;
    }

    const newOption: SavedMobileMoneyOption = {
      id: `mm_${Date.now()}`,
      nickname,
      provider,
      mobileNumber,
      customerInfo: { ...formData.customerInfo },
    };

    if (currentEditingOptionId) {
      // Update existing option - preserve the same ID
      const updatedOption = {
        ...newOption,
        id: currentEditingOptionId  // Keep the original ID
      };
      
      setSavedMobileMoneyOptions(prev => 
        prev.map(option => 
          option.id === currentEditingOptionId ? updatedOption : option
        )
      );
      setCurrentEditingOptionId(null);
      setOpenAccordionValue(""); // Collapse the accordion
      toast({
        title: "Mobile Money Updated",
        description: `${nickname} has been updated successfully.`,
      });
      
      // Reset form after updating
      setFormData(prev => ({
        ...prev,
        paymentDetails: {
          ...prev.paymentDetails,
          provider: "",
          mobileNumber: "",
          nickname: "",
        }
      }));
    } else {
      // Add new option
      setSavedMobileMoneyOptions(prev => [...prev, newOption]);
      
      // Auto-select the new option and set unified payment method selection
      selectPaymentOption('mobile_money', newOption.id);
      
      toast({
        title: "Mobile Money Saved",
        description: `${nickname} has been saved successfully.`,
      });
      
      // Reset form for new entry
      setShowAddNewMobileMoney(false);
      setFormData(prev => ({
        ...prev,
        paymentDetails: {
          ...prev.paymentDetails,
          provider: "",
          mobileNumber: "",
          nickname: "",
        }
      }));
    }
  };

  const editMobileMoneyOption = (option: SavedMobileMoneyOption) => {
    setCurrentEditingOptionId(option.id);
    setShowAddNewMobileMoney(true);
    setFormData(prev => ({
      ...prev,
      customerInfo: { ...option.customerInfo },
      paymentDetails: {
        ...prev.paymentDetails,
        provider: option.provider,
        mobileNumber: option.mobileNumber,
        nickname: option.nickname,
      }
    }));
  };

  const deleteMobileMoneyOption = (id: string) => {
    setSavedMobileMoneyOptions(prev => {
      const filteredOptions = prev.filter(option => option.id !== id);
      
      // If the deleted option was selected, clear all selections
      if (selectedMobileMoneyOptionId === id) {
        setSelectedMobileMoneyOptionId(null);
        // Clear the unified payment method selection if no options remain
        if (filteredOptions.length === 0) {
          clearAllSelections();
        }
      }
      
      return filteredOptions;
    });
    
    toast({
      title: "Mobile Money Deleted",
      description: "The payment method has been removed.",
    });
  };

  const startAddNewMobileMoney = () => {
    setShowAddNewMobileMoney(true);
    setCurrentEditingOptionId(null);
    setOpenAccordionValue(""); // Close any open saved option accordion
    // Close credit card accordions when adding mobile money
    setOpenCardAccordionValue("");
    setShowAddNewCreditCard(false);
    setCurrentEditingCardId(null);
    // Close bank account accordions when adding mobile money
    setOpenBankAccordionValue("");
    setShowAddNewBankAccount(false);
    setCurrentEditingAccountId(null);
    // Pre-fill customer info but clear payment details
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        provider: "",
        mobileNumber: "",
        nickname: "",
      }
    }));
  };

  // Credit Card helper functions
  const getCardType = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
    if (cleaned.startsWith('3')) return 'amex';
    return 'card';
  };

  const formatCardNumber = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return `**** **** **** ${cleaned.slice(-4)}`;
  };

  const updateCreditCardInStorage = (card: SavedCreditCard) => {
    // Validate required fields
    if (!card.cardNumber || !card.expiryDate || !card.nickname) {
      toast({
        title: "Missing Information",
        description: "Please fill in all card details and nickname.",
        variant: "destructive",
      });
      return;
    }

    // Update the card in localStorage and state
    try {
      localStorage.setItem('charley_saved_credit_cards', JSON.stringify(savedCreditCards));
      toast({
        title: "Credit Card Updated",
        description: `${card.nickname} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save credit card changes.",
        variant: "destructive",
      });
    }
  };

  const saveCreditCardOption = async () => {
    const { nickname } = formData.paymentDetails;
    
    // For Stripe CardElement, we only need nickname from the form
    // Card details validation happens during actual payment processing
    if (!nickname) {
      toast({
        title: "Missing Information",
        description: "Please enter a nickname for your card.",
        variant: "destructive",
      });
      return;
    }

    // Create placeholder card for payment method selection
    // Actual card validation happens at payment time with the CardElement
    const newCard: SavedCreditCard = {
      id: crypto.randomUUID(),
      nickname,
      cardNumber: '**** **** **** ****', // Placeholder - real card entered at payment time
      expiryDate: 'MM/YY', // Placeholder - real expiry entered at payment time
      cvv: '***', // Placeholder - real CVV entered at payment time
      cardType: 'card', // Will be determined during payment
      customerInfo: { ...formData.customerInfo },
      paymentMethodId: null, // Will be created during payment processing
    };

    if (currentEditingCardId) {
      // Update existing card
      const updatedCard = {
        ...newCard,
        id: currentEditingCardId
      };
      
      setSavedCreditCards(prev => 
        prev.map(card => 
          card.id === currentEditingCardId ? updatedCard : card
        )
      );
      setCurrentEditingCardId(null);
      setOpenCardAccordionValue("");
      setShowAddNewCreditCard(false);
      toast({
        title: "Credit Card Updated",
        description: `${nickname} has been updated successfully.`,
      });
    } else {
      // Add new card
      setSavedCreditCards(prev => [...prev, newCard]);
      
      // Auto-select the new card and set unified payment method selection
      selectPaymentOption('credit_card', newCard.id);
      
      toast({
        title: "Credit Card Saved",
        description: `${nickname} has been saved successfully.`,
      });
      
      setShowAddNewCreditCard(false);
    }
    
    // Reset form
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        nickname: "",
      }
    }));
  };

  const editCreditCard = (card: SavedCreditCard) => {
    setCurrentEditingCardId(card.id);
    setShowAddNewCreditCard(true);
    setFormData(prev => ({
      ...prev,
      customerInfo: { ...card.customerInfo },
      paymentDetails: {
        ...prev.paymentDetails,
        cardNumber: card.cardNumber,
        expiryDate: card.expiryDate,
        nickname: card.nickname,
      }
    }));
  };

  const deleteCreditCard = (id: string) => {
    setSavedCreditCards(prev => {
      const filteredCards = prev.filter(card => card.id !== id);
      
      // If the deleted card was selected, clear all selections
      if (selectedCreditCardId === id) {
        setSelectedCreditCardId(null);
        // Clear the unified payment method selection if no cards remain
        if (filteredCards.length === 0) {
          clearAllSelections();
        }
      }
      
      return filteredCards;
    });
    
    toast({
      title: "Credit Card Deleted",
      description: "The payment method has been removed.",
    });
  };

  // Bank Account management functions
  const saveBankAccountOption = () => {
    const { accountType, nameOnAccount, routingNumber, accountNumber, reenterAccountNumber, nickname } = formData.paymentDetails;
    
    if (!accountType || !nameOnAccount || !routingNumber || !accountNumber || !reenterAccountNumber || !nickname) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bank account details and nickname.",
        variant: "destructive",
      });
      return;
    }

    if (accountNumber !== reenterAccountNumber) {
      toast({
        title: "Account Number Mismatch",
        description: "Account numbers do not match. Please check and try again.",
        variant: "destructive",
      });
      return;
    }

    const newBankAccount: SavedBankAccount = {
      id: crypto.randomUUID(),
      nickname,
      accountType,
      nameOnAccount,
      routingNumber,
      accountNumber: `****${accountNumber.slice(-4)}`, // Store only last 4 digits for display
      customerInfo: { ...formData.customerInfo },
    };

    if (currentEditingAccountId) {
      // Update existing account
      const updatedAccount = {
        ...newBankAccount,
        id: currentEditingAccountId
      };
      
      setSavedBankAccounts(prev => 
        prev.map(account => 
          account.id === currentEditingAccountId ? updatedAccount : account
        )
      );
      setCurrentEditingAccountId(null);
      setOpenBankAccordionValue("");
      setShowAddNewBankAccount(false);
      toast({
        title: "Bank Account Updated",
        description: `${nickname} has been updated successfully.`,
      });
    } else {
      // Add new account
      setSavedBankAccounts(prev => [...prev, newBankAccount]);
      
      // Auto-select the new account and set unified payment method selection
      selectPaymentOption('bank_account', newBankAccount.id);
      
      toast({
        title: "Bank Account Saved",
        description: `${nickname} has been saved successfully.`,
      });
      
      setShowAddNewBankAccount(false);
    }
    
    // Reset form
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        accountType: "",
        nameOnAccount: "",
        routingNumber: "",
        accountNumber: "",
        reenterAccountNumber: "",
        nickname: "",
      }
    }));
  };

  const editBankAccount = (account: SavedBankAccount) => {
    setCurrentEditingAccountId(account.id);
    setShowAddNewBankAccount(true);
    setFormData(prev => ({
      ...prev,
      customerInfo: { ...account.customerInfo },
      paymentDetails: {
        ...prev.paymentDetails,
        accountType: account.accountType,
        nameOnAccount: account.nameOnAccount,
        routingNumber: account.routingNumber,
        accountNumber: account.accountNumber,
        reenterAccountNumber: account.accountNumber,
        nickname: account.nickname,
      }
    }));
  };

  const deleteBankAccount = (id: string) => {
    setSavedBankAccounts(prev => {
      const filteredAccounts = prev.filter(account => account.id !== id);
      
      // If the deleted account was selected, clear all selections
      if (selectedBankAccountId === id) {
        setSelectedBankAccountId(null);
        // Clear the unified payment method selection if no accounts remain
        if (filteredAccounts.length === 0) {
          clearAllSelections();
        }
      }
      
      return filteredAccounts;
    });
    
    toast({
      title: "Bank Account Deleted", 
      description: "The bank account has been removed from your saved payment methods.",
    });
  };

  const startAddNewBankAccount = () => {
    setShowAddNewBankAccount(true);
    setCurrentEditingAccountId(null);
    setOpenBankAccordionValue("");
    // Close other payment method accordions when adding bank account
    setOpenAccordionValue("");
    setOpenCardAccordionValue("");
    setShowAddNewMobileMoney(false);
    setShowAddNewCreditCard(false);
    setCurrentEditingOptionId(null);
    setCurrentEditingCardId(null);
    // Pre-fill customer information
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        accountType: "",
        nameOnAccount: "",
        routingNumber: "",
        accountNumber: "",
        reenterAccountNumber: "",
        nickname: "",
      }
    }));
  };

  const startAddNewCreditCard = () => {
    setShowAddNewCreditCard(true);
    setCurrentEditingCardId(null);
    setOpenCardAccordionValue("");
    // Close mobile money accordions when adding credit card
    setOpenAccordionValue("");
    setShowAddNewMobileMoney(false);
    setCurrentEditingOptionId(null);
    // Close bank account accordions when adding credit card
    setOpenBankAccordionValue("");
    setShowAddNewBankAccount(false);
    setCurrentEditingAccountId(null);
    // Close digital wallet accordions when adding credit card
    setOpenWalletAccordionValue("");
    setShowAddNewDigitalWallet(false);
    setCurrentEditingWalletId(null);
    // Pre-fill customer info but clear payment details
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        nickname: "",
      }
    }));
  };

  // Digital Wallet management functions
  const saveDigitalWalletOption = () => {
    const { provider, nickname } = formData.paymentDetails;
    
    if (!provider || !nickname) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter a nickname.",
        variant: "destructive",
      });
      return;
    }

    const newDigitalWallet: SavedDigitalWallet = {
      id: crypto.randomUUID(),
      nickname,
      provider,
      customerInfo: { ...formData.customerInfo },
    };

    if (currentEditingWalletId) {
      // Update existing wallet
      setSavedDigitalWallets(prev => 
        prev.map(wallet => 
          wallet.id === currentEditingWalletId ? newDigitalWallet : wallet
        )
      );
      setCurrentEditingWalletId(null);
      setOpenWalletAccordionValue("");
      setShowAddNewDigitalWallet(false);
      toast({
        title: "Digital Wallet Updated",
        description: `${nickname} has been updated successfully.`,
      });
    } else {
      // Add new wallet
      setSavedDigitalWallets(prev => [...prev, newDigitalWallet]);
      
      // Auto-select the new wallet and set unified payment method selection
      selectPaymentOption('digital_wallet', newDigitalWallet.id);
      
      toast({
        title: "Digital Wallet Saved",
        description: `${nickname} has been saved successfully.`,
      });
      
      setShowAddNewDigitalWallet(false);
    }
    
    // Reset form
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        provider: "",
        nickname: "",
      }
    }));
  };

  const editDigitalWallet = (wallet: SavedDigitalWallet) => {
    setCurrentEditingWalletId(wallet.id);
    setShowAddNewDigitalWallet(true);
    setFormData(prev => ({
      ...prev,
      customerInfo: { ...wallet.customerInfo },
      paymentDetails: {
        ...prev.paymentDetails,
        provider: wallet.provider,
        nickname: wallet.nickname,
      }
    }));
  };

  const deleteDigitalWallet = (id: string) => {
    setSavedDigitalWallets(prev => {
      const filteredWallets = prev.filter(wallet => wallet.id !== id);
      
      // If the deleted wallet was selected, clear all selections
      if (selectedDigitalWalletId === id) {
        setSelectedDigitalWalletId(null);
        // Clear the unified payment method selection if no wallets remain
        if (filteredWallets.length === 0) {
          clearAllSelections();
        }
      }
      
      return filteredWallets;
    });
    
    toast({
      title: "Digital Wallet Deleted",
      description: "The digital wallet has been removed from your saved payment methods.",
    });
  };

  const startAddNewDigitalWallet = () => {
    setShowAddNewDigitalWallet(true);
    setCurrentEditingWalletId(null);
    setOpenWalletAccordionValue("");
    // Close other payment method accordions when adding digital wallet
    setOpenAccordionValue("");
    setOpenCardAccordionValue("");
    setOpenBankAccordionValue("");
    setShowAddNewMobileMoney(false);
    setShowAddNewCreditCard(false);
    setShowAddNewBankAccount(false);
    setCurrentEditingOptionId(null);
    setCurrentEditingCardId(null);
    setCurrentEditingAccountId(null);
    // Pre-fill customer information
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        provider: "",
        nickname: "",
      }
    }));
  };

  // Detect user's region ONLY if no saved preference exists at all
  useEffect(() => {
    // Check if user has made ANY region selection before
    try {
      const saved = localStorage.getItem('charley_payment_form_data');
      if (saved) {
        const savedData = JSON.parse(saved);
        if (savedData.region) {
          // User has made a region choice before, don't auto-detect
          console.log('[PAYMENT] User has saved region preference, skipping auto-detection:', savedData.region);
          return;
        }
      }
    } catch (error) {
      console.warn('[PAYMENT] Failed to check saved region preference:', error);
    }

    // Only auto-detect if user has never made a region choice and current region is default "global"
    if (formData.region !== "global") {
      console.log('[PAYMENT] Using existing region preference:', formData.region);
      return;
    }

    // Only auto-detect for first-time users
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes("Africa/Accra") || timezone.includes("Ghana")) {
      console.log('[PAYMENT] Auto-detecting Ghana region from timezone (first-time user)');
      setFormData((prev) => ({ ...prev, region: "ghana" }));
    } else {
      console.log('[PAYMENT] Auto-detecting Global region from timezone (first-time user)');
      setFormData((prev) => ({ ...prev, region: "global" }));
    }
  }, []);

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch regional pricing
  const { data: pricing = [], isLoading: loadingPricing } = useQuery({
    queryKey: ["/api/pricing", formData.region],
    queryFn: async () => {
      const response = await fetch(`/api/pricing?region=${formData.region}`, {
        credentials: "include",
      });
      return response.json();
    },
  });

  // Process payment
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      if (paymentData.paymentMethod === "mobile_money" && paymentData.region === "ghana") {
        // Handle mobile money payment
        const response = await fetch("/api/subscription/mobile-money", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            planType: selectedPlan?.type,
            region: paymentData.region,
            phoneNumber: paymentData.paymentDetails.mobileNumber,
            provider: paymentData.paymentDetails.provider,
          }),
        });

        if (!response.ok) {
          // Check if response is HTML (authentication error)
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            throw new Error("Authentication required. Please log in again.");
          }
          const error = await response.json();
          throw new Error(error.error || "Mobile money payment failed");
        }

        const result = await response.json();
        return { success: true, paymentInstructions: result.paymentInstructions, isMobileMoney: true };
      } else {
        // Handle card payment with Stripe
        console.log("Creating Stripe subscription...");
        const response = await fetch("/api/subscription/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            planType: selectedPlan?.type,
            region: paymentData.region,
            paymentMethod: paymentData.paymentMethod,
            // Include billing address information
            billingName: paymentData.customerInfo.name,
            billingEmail: paymentData.customerInfo.email,
            billingPhone: paymentData.customerInfo.phone,
            billingAddress: paymentData.customerInfo.address,
            billingCity: paymentData.customerInfo.city,
            billingState: paymentData.customerInfo.state,
            billingPostalCode: paymentData.customerInfo.postalCode,
            billingCountry: paymentData.customerInfo.country,
            nickname: paymentData.customerInfo.nickname,
          }),
        });

        if (!response.ok) {
          // Check if response is HTML (authentication error)
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            throw new Error("Authentication required. Please log in again.");
          }
          const error = await response.json();
          console.error("Subscription creation failed:", error);
          throw new Error(error.error || "Card payment setup failed");
        }

        const result = await response.json();
        console.log("Subscription creation successful, client secret received");
        setClientSecret(result.clientSecret);
        return { success: true, clientSecret: result.clientSecret, isStripe: true };
      }
    },
    onSuccess: (data: any) => {
      if (data.isStripe) {
        // For Stripe payments, go directly to success - no extra dialogs
        setStep("success");
        toast({
          title: "Payment Successful",
          description: "Welcome to CHARLEY Premium!",
        });
      } else if (data.isMobileMoney) {
        setStep("success");
        if (data.paymentInstructions) {
          toast({
            title: "Payment Instructions",
            description: data.paymentInstructions.message,
            duration: 10000,
          });
        }
      } else {
        setStep("success");
        toast({
          title: "Payment Successful",
          description: "Welcome to CHARLEY Premium!",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      console.error("Payment failed:", error);
      setStep("final_payment");
      toast({
        title: "Payment Failed",
        description: error.message || "Please check your payment details and try again.",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setFormData((prev) => ({ ...prev, planType: plan.type }));
    setStep("payment_method");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple simultaneous payment attempts
    if (isProcessingPayment) {
      console.log("[SMOOTH-TRANSITION] Payment already in progress, ignoring duplicate click");
      return;
    }
    
    setIsProcessingPayment(true);
    
    try {
      console.log("[PAYMENT-DEBUG] Payment submit triggered");
      console.log("[PAYMENT-DEBUG] Payment method:", formData.paymentMethod);
      console.log("[PAYMENT-DEBUG] Client secret available:", !!clientSecret);
      console.log("[PAYMENT-DEBUG] Stripe available:", !!stripe);
      console.log("[PAYMENT-DEBUG] Elements available:", !!elements);
      
      // Handle different payment methods
      if (formData.paymentMethod === "mobile_money") {
      // Process mobile money payment
      try {
        const result = await processPaymentMutation.mutateAsync(formData);
        if (result.success && result.isMobileMoney) {
          setStep("mobile_money_instructions");
          return;
        }
      } catch (error) {
        console.error("Mobile money payment failed:", error);
        toast({
          title: "Payment Failed",
          description: error instanceof Error ? error.message : "Mobile money payment failed. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }
    
    // For credit card payments, require Stripe elements
    if (formData.paymentMethod === "card") {
      if (!stripe || !elements || !clientSecret) {
        console.error("[STRIPE-SECURITY] Missing required Stripe setup:", { stripe: !!stripe, elements: !!elements, clientSecret: !!clientSecret });
        toast({
          title: "Payment Setup Error",
          description: "Payment system not ready. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // For other payment methods, show not implemented message
      toast({
        title: "Payment Method Not Available",
        description: "This payment method is not yet available. Please select Credit/Debit Card or Mobile Money.",
        variant: "destructive",
      });
      return;
    }

    console.log("[STRIPE-SECURITY] Starting payment processing with client secret:", clientSecret.substring(0, 30) + "...");
    
    try {
      // CRITICAL: Get CardElement BEFORE changing step to prevent unmounting
      console.log("[STRIPE-SECURITY] Current step:", step);
      console.log("[STRIPE-SECURITY] Form data payment method:", formData.paymentMethod);
      
      // Check if CardElement DOM element exists
      const cardElementDOM = document.getElementById("final-payment-card-element");
      console.log("[STRIPE-SECURITY] CardElement DOM found:", !!cardElementDOM);
      console.log("[STRIPE-SECURITY] CardElement DOM details:", cardElementDOM ? {
        id: cardElementDOM.id,
        parentNode: !!cardElementDOM.parentNode,
        clientHeight: cardElementDOM.clientHeight,
        clientWidth: cardElementDOM.clientWidth,
        style: cardElementDOM.style.cssText
      } : "NOT FOUND");
      
      // Get CardElement - required for confirmCardPayment
      console.log("[STRIPE-SECURITY] Retrieving CardElement for confirmCardPayment");
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        console.error("[STRIPE-SECURITY] CardElement not found - cannot proceed with payment");
        throw new Error("Card element not available. Please refresh the page and try again.");
      }

      // CRITICAL: Check if CardElement is complete before proceeding
      console.log("[STRIPE-SECURITY] Checking CardElement completeness...");
      
      // Create a test payment method to verify CardElement is working
      try {
        const { error: testError, paymentMethod: testPaymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });
        
        if (testError) {
          console.error("[STRIPE-SECURITY] CardElement validation failed:", testError);
          throw new Error("Please complete all card details before proceeding.");
        }
        
        console.log("[STRIPE-SECURITY] CardElement validation successful, payment method created:", testPaymentMethod?.id);
      } catch (validationError) {
        console.error("[STRIPE-SECURITY] CardElement validation error:", validationError);
        throw new Error("Please ensure your card details are complete and valid.");
      }

      // FIXED: Confirm payment BEFORE transitioning to success page
      console.log("[STRIPE-SECURITY] CRITICAL FIX: Using confirmCardPayment with client_secret for CardElement");
      
      // CORRECT APPROACH: Use confirmCardPayment with client_secret for CardElement
      // confirmPayment is for Payment Elements, confirmCardPayment is for CardElement
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.customerInfo.name,
            email: formData.customerInfo.email,
            phone: formData.customerInfo.phone,
            address: {
              line1: formData.customerInfo.address,
              city: formData.customerInfo.city,
              postal_code: formData.customerInfo.postalCode,
              country: formData.customerInfo.country === 'United States' ? 'US' : 
                       formData.customerInfo.country === 'Ghana' ? 'GH' : 
                       formData.customerInfo.country === 'United Kingdom' ? 'GB' : 'US',
            },
          },
        }
      });
      
      // Only transition to success AFTER payment confirmation succeeds
      if (confirmError) {
        console.error("[PAYMENT-CONFIRMATION] Payment confirmation failed:", confirmError);
        setIsProcessingPayment(false);
        toast({
          title: "Payment Failed",
          description: confirmError.message || "Payment confirmation failed. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log("[PAYMENT-CONFIRMATION] Payment confirmed successfully:", paymentIntent?.status);
      setStep("success");

      if (paymentIntent?.status === "succeeded") {
        console.log("[STRIPE-SECURITY] Payment succeeded! Payment Intent ID:", paymentIntent.id);
        console.log("[STRIPE-SECURITY] Stripe charged:", paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
        
        // Store payment intent ID for premium activation on success page
        setPaymentIntentId(paymentIntent.id);
        console.log("[AUTO-PREMIUM] Stored payment intent ID for premium activation:", paymentIntent.id);
        
        // Show success toast for completed payment
        toast({
          title: "Payment Successful",
          description: `Charged ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}. Welcome to CHARLEY Premium!`,
        });
        
        // Refresh user data to show premium status
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
        
        // Payment successful, reset processing state
        setIsProcessingPayment(false);
        
      } else {
        console.error("[STRIPE-SECURITY] Unexpected payment status:", paymentIntent?.status);
        setIsProcessingPayment(false);
        toast({
          title: "Payment Issue",
          description: "Payment was not successful. Please contact support if charged.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("[SMOOTH-TRANSITION] Payment processing error during validation:", error);
      setIsProcessingPayment(false);
      // Stay on final_payment page for validation errors that happen before payment attempt
      setStep("final_payment");
      toast({
        title: "Payment Failed", 
        description: error instanceof Error ? error.message : "Please check your card details and try again.",
        variant: "destructive",
      });
    }
    } catch (error) {
      console.error("[PAYMENT-ERROR] Outer catch - Critical payment error:", error);
      setStep("final_payment");
      toast({
        title: "Payment System Error",
        description: "A critical error occurred. Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  };

  const getPlanPrice = (planType: string, region: string) => {
    // Find the pricing for this plan type and region
    const pricingEntry = pricing.find(p => p.planType === planType && p.region === region);
    
    if (pricingEntry) {
      return {
        amount: pricingEntry.amount,
        currency: pricingEntry.currency,
      };
    }
    
    // If no regional pricing found, try fallback to global pricing
    const globalPricing = pricing.find(p => p.planType === planType && p.region === 'global');
    if (globalPricing) {
      return {
        amount: globalPricing.amount,
        currency: globalPricing.currency,
      };
    }
    
    // Final fallback for safety
    const fallbackPrices = {
      premium_monthly: 999,
      premium_quarterly: 2499,
      premium_yearly: 7999,
    };
    return {
      amount: fallbackPrices[planType as keyof typeof fallbackPrices] || 999,
      currency: "USD",
    };
  };

  const formatPrice = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(amount / 100);
  };

  if (step === "plan") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl animate-bounce"></div>
          <div className="absolute bottom-32 left-32 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl animate-bounce delay-500"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
          {/* Header with Centered Title */}
          <div className="relative flex items-center justify-between mb-6">
            {/* Back Button - Left */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/settings")}
              className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all p-2 z-50 relative -mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent whitespace-nowrap">
                  {translate("payment.charleyPremium")}
                </h1>
              </div>
              <p className="text-gray-300 text-xs">
                {translate("payment.unlockAdvancedPrivacy")}
              </p>
            </div>

            {/* Right Side Spacer for Balance */}
            <div className="w-10 h-10"></div>
          </div>

          {/* Region Selection */}
          <div className="max-w-xs mx-auto mb-6 mt-12">
            <Select
              value={formData.region}
              onValueChange={(value) =>
                setFormData((prev) => ({ 
                  ...prev, 
                  region: value,
                  paymentMethod: "" // Reset payment method when region changes
                }))
              }
            >
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white backdrop-blur-sm rounded-xl text-sm">
                <Globe className="h-3 w-3 mr-2 text-cyan-400" />
                <SelectValue placeholder={translate("payment.selectRegion")} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                <SelectItem
                  value="ghana"
                  className="text-white hover:bg-slate-700 rounded-lg text-sm"
                >
                  🇬🇭 Ghana
                </SelectItem>
                <SelectItem
                  value="global"
                  className="text-white hover:bg-slate-700 rounded-lg text-sm"
                >
                  🌎 {translate("payment.global")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 gap-3 max-w-xs mx-auto">
            {pricingPlans.map((plan) => {
              const { amount, currency } = getPlanPrice(
                plan.type,
                formData.region,
              );

              return (
                <div
                  key={plan.type}
                  onClick={() => handlePlanSelect(plan)}
                  className="relative group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-lg">
                        {translate("payment.mostPopular")}
                      </Badge>
                    </div>
                  )}

                  <Card
                    className={`h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 ${
                      plan.popular
                        ? "ring-1 ring-purple-500/50 shadow-xl shadow-purple-500/10"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4 h-full flex flex-col">
                      {/* Plan Header with Price */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {plan.name}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {plan.description}
                          </p>
                          {plan.savings && (
                            <Badge
                              variant="secondary"
                              className="mt-1 bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-0.5"
                            >
                              {plan.savings}
                            </Badge>
                          )}
                        </div>

                        {/* Price in top-right */}
                        <div className="text-right relative">
                          <div className="relative inline-block">
                            {/* Glowing background effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 rounded-lg blur-sm opacity-75 animate-pulse"></div>

                            {/* Main price with gradient and shadow */}
                            <div className="relative text-3xl font-black bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent drop-shadow-lg transform hover:scale-105 transition-transform duration-300">
                              {formatPrice(amount, currency)}
                            </div>
                          </div>

                          <div className="text-xs text-gray-300 font-medium mt-1">
                            per {plan.period}
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="flex-1 space-y-2 mb-4">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                            <span className="text-xs text-gray-300">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <Button
                        className={`w-full h-9 rounded-xl font-medium transition-all duration-300 text-sm ${
                          plan.popular
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-purple-500/25"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        }`}
                      >
                        {plan.type === "premium_monthly" ? translate("payment.chooseMonthly") : plan.type === "premium_quarterly" ? translate("payment.chooseQuarterly") : "Choose " + plan.name}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Security Notice */}
          <div className="max-w-lg mx-auto mt-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-medium">
                    {translate("payment.bankLevelSecurity")}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {translate("payment.paymentDataEncrypted")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "payment_method") {
    const { amount, currency } = getPlanPrice(
      formData.planType,
      formData.region,
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-32 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
          {/* Header with Centered Title */}
          <div className="relative flex items-center justify-between mb-6">
            {/* Back Button - Left */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("plan")}
              className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all p-2 z-50 relative -mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-white whitespace-nowrap">
                  {translate("payment.paymentDetails")}
                </h1>
              </div>
              <p className="text-gray-300 text-xs whitespace-nowrap">
                {selectedPlan?.type === "premium_monthly" ? translate("payment.completeMonthlySubscription") : selectedPlan?.type === "premium_quarterly" ? translate("payment.completeQuarterlySubscription") : selectedPlan?.type === "premium_yearly" ? translate("payment.completeYearlySubscription") : "Complete your subscription"}
              </p>
            </div>

            {/* Right Side Spacer for Balance */}
            <div className="w-10 h-10"></div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
            {/* Payment Form */}
            <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <CardContent className="p-4">
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {/* Payment Method Selection */}
                  <div>
                    <Label className="text-white text-xs font-medium mb-2 block">
                      {translate("payment.paymentMethod")}
                    </Label>
                    <Accordion
                      type="single"
                      collapsible
                      value={expandedPaymentMethod}
                      onValueChange={(value) => {
                        setExpandedPaymentMethod(value || "");
                        if (value) {
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethod: value,
                          }));
                        }
                      }}
                      className="space-y-2"
                    >
                      {/* Mobile Money first for Ghana */}
                      {formData.region === "ghana" && (
                        <AccordionItem
                          value="mobile_money"
                          className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                        >
                          <AccordionTrigger className="px-3 py-3 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center justify-between w-full mr-2">
                              <div className="flex items-center space-x-2">
                                <Smartphone className="h-4 w-4 text-cyan-400" />
                                <span className="text-white text-sm font-medium">
                                  Mobile Money
                                </span>
                              </div>
                              {selectedPaymentMethod.type === 'mobile_money' && selectedPaymentMethod.id && (
                                <Check className="h-5 w-5 text-green-500 font-bold stroke-[3]" />
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <div className="space-y-3 pt-2">
                              {/* Saved Mobile Money Options */}
                              {savedMobileMoneyOptions.length > 0 && !showAddNewMobileMoney && (
                                <div className="space-y-2">
                                  <Label className="text-gray-300 text-[10px] font-light italic tracking-wide">
                                    {translate("payment.selectOption")}
                                  </Label>
                                  <Accordion 
                                    type="single" 
                                    collapsible 
                                    className={`space-y-2 transition-opacity ${showAddNewMobileMoney ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                                    value={openAccordionValue}
                                    onValueChange={(value) => {
                                      // Prevent expanding existing options when adding new mobile money
                                      if (!showAddNewMobileMoney) {
                                        setOpenAccordionValue(value);
                                        // Close credit card accordions when opening mobile money option
                                        if (value) {
                                          setOpenCardAccordionValue("");
                                          setShowAddNewCreditCard(false);
                                        }
                                      }
                                    }}
                                  >
                                    <AnimatePresence mode="popLayout">
                                      {savedMobileMoneyOptions.map((option) => (
                                        <motion.div
                                          key={option.id}
                                          layout
                                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                          transition={{ 
                                            layout: { 
                                              duration: 0.4, 
                                              ease: [0.4, 0, 0.2, 1],
                                              type: "spring",
                                              stiffness: 300,
                                              damping: 30
                                            },
                                            opacity: { duration: 0.2 },
                                            scale: { duration: 0.2 }
                                          }}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <AccordionItem
                                              value={option.id}
                                              className="bg-white/5 rounded-lg border border-white/10 overflow-hidden flex-1"
                                            >
                                              <AccordionTrigger 
                                                className="px-2 py-2 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180"
                                                onClick={() => {
                                                  // Set the current editing option and load its data
                                                  setCurrentEditingOptionId(option.id);
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    customerInfo: { ...option.customerInfo },
                                                    paymentDetails: {
                                                      ...prev.paymentDetails,
                                                      provider: option.provider,
                                                      mobileNumber: option.mobileNumber,
                                                      nickname: option.nickname,
                                                    }
                                                  }));
                                                }}
                                              >
                                                <div className="flex items-center space-x-3 w-full mr-2">
                                                  {/* Selection Checkbox */}
                                                  <div 
                                                    className="w-5 h-5 rounded border-2 border-cyan-400 bg-transparent flex items-center justify-center cursor-pointer hover:bg-cyan-400/10 transition-all"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (selectedMobileMoneyOptionId === option.id) {
                                                        clearAllSelections();
                                                      } else {
                                                        selectPaymentOption('mobile_money', option.id);
                                                        // Move selected option to first position
                                                        setSavedMobileMoneyOptions(prev => {
                                                          const selectedOption = prev.find(opt => opt.id === option.id);
                                                          const otherOptions = prev.filter(opt => opt.id !== option.id);
                                                          return selectedOption ? [selectedOption, ...otherOptions] : prev;
                                                        });
                                                      }
                                                    }}
                                                  >
                                                    {selectedMobileMoneyOptionId === option.id && (
                                                      <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                                                    )}
                                                  </div>
                                                  <div className="text-white text-xs font-medium">
                                                    {option.nickname}
                                                  </div>
                                                </div>
                                              </AccordionTrigger>
                                        <AccordionContent className="px-2 pb-2">
                                          <div className="space-y-2 pt-1">
                                            {/* {translate("payment.customerInformation")} */}
                                            <div className="space-y-1">
                                              <Label className="text-white text-[10px] font-medium">
                                                {translate("payment.customerInformation")}
                                              </Label>
                                              <Input
                                                placeholder={translate("payment.fullName")}
                                                value={formData.customerInfo.name}
                                                onChange={(e) =>
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    customerInfo: {
                                                      ...prev.customerInfo,
                                                      name: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                              />
                                              <Input
                                                placeholder={translate("payment.streetAddress")}
                                                value={formData.customerInfo.address}
                                                onChange={(e) =>
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    customerInfo: {
                                                      ...prev.customerInfo,
                                                      address: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                              />
                                              <div className="space-y-1">
                                                <div className="grid grid-cols-2 gap-1">
                                                  <Input
                                                    placeholder={translate("payment.city")}
                                                    value={formData.customerInfo.city}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        customerInfo: {
                                                          ...prev.customerInfo,
                                                          city: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                  <Input
                                                    placeholder={translate("payment.state")}
                                                    value={formData.customerInfo.state}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        customerInfo: {
                                                          ...prev.customerInfo,
                                                          state: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                </div>
                                                <Input
                                                  placeholder={translate("payment.postalCode")}
                                                  value={formData.customerInfo.postalCode}
                                                  onChange={(e) =>
                                                    setFormData((prev) => ({
                                                      ...prev,
                                                      customerInfo: {
                                                        ...prev.customerInfo,
                                                        postalCode: e.target.value,
                                                      },
                                                    }))
                                                  }
                                                  className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                />
                                              </div>
                                              <Input
                                                placeholder={translate("payment.country")}
                                                value={formData.customerInfo.country}
                                                onChange={(e) =>
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    customerInfo: {
                                                      ...prev.customerInfo,
                                                      country: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                              />
                                            </div>

                                            {/* Mobile Money Details */}
                                            <div className="space-y-1">
                                              <Label className="text-white text-[10px] font-medium">
                                                Mobile Money Details
                                              </Label>
                                              <Select
                                                value={formData.paymentDetails.provider}
                                                onValueChange={(value) =>
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    paymentDetails: {
                                                      ...prev.paymentDetails,
                                                      provider: value,
                                                    },
                                                  }))
                                                }
                                              >
                                                <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white rounded-lg focus:border-cyan-400 text-[10px]">
                                                  <SelectValue placeholder={translate("payment.selectProvider")} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gradient-to-br from-slate-800/95 via-purple-800/95 to-indigo-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl shadow-purple-500/25 min-w-[280px] animate-in fade-in-0 zoom-in-95 duration-200">
                                                  <SelectItem 
                                                    value="mtn" 
                                                    className="text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 focus:bg-gradient-to-r focus:from-cyan-500/30 focus:to-blue-500/30 rounded-lg m-1 transition-all duration-200 cursor-pointer border border-transparent hover:border-cyan-400/30"
                                                  >
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white">M</span>
                                                      </div>
                                                      <span className="font-medium">MTN Mobile Money</span>
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem 
                                                    value="vodafone" 
                                                    className="text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 focus:bg-gradient-to-r focus:from-cyan-500/30 focus:to-blue-500/30 rounded-lg m-1 transition-all duration-200 cursor-pointer border border-transparent hover:border-cyan-400/30"
                                                  >
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white">V</span>
                                                      </div>
                                                      <span className="font-medium">Vodafone Cash</span>
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem 
                                                    value="airteltigo" 
                                                    className="text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 focus:bg-gradient-to-r focus:from-cyan-500/30 focus:to-blue-500/30 rounded-lg m-1 transition-all duration-200 cursor-pointer border border-transparent hover:border-cyan-400/30"
                                                  >
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white">A</span>
                                                      </div>
                                                      <span className="font-medium">AirtelTigo Money</span>
                                                    </div>
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <Input
                                                placeholder="Mobile Number"
                                                value={formData.paymentDetails.mobileNumber}
                                                onChange={(e) =>
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    paymentDetails: {
                                                      ...prev.paymentDetails,
                                                      mobileNumber: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                              />
                                              <Input
                                                placeholder={translate("payment.nickname")}
                                                value={formData.paymentDetails.nickname}
                                                onChange={(e) =>
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    paymentDetails: {
                                                      ...prev.paymentDetails,
                                                      nickname: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                              />
                                            </div>
                                            
                                            <div className="flex space-x-1">
                                              <Button
                                                type="button"
                                                onClick={saveMobileMoneyOption}
                                                className="flex-1 h-7 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-[10px]"
                                              >
                                                Update
                                              </Button>
                                              <Button
                                                type="button"
                                                onClick={() => {
                                                  // Reset to original values
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    customerInfo: { ...option.customerInfo },
                                                    paymentDetails: {
                                                      ...prev.paymentDetails,
                                                      provider: option.provider,
                                                      mobileNumber: option.mobileNumber,
                                                      nickname: option.nickname,
                                                    }
                                                  }));
                                                  setCurrentEditingOptionId(null);
                                                  setOpenAccordionValue(""); // Collapse the accordion
                                                }}
                                                className="h-7 px-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px]"
                                              >
                                                {translate("payment.cancel")}
                                              </Button>
                                            </div>
                                          </div>
                                        </AccordionContent>
                                            </AccordionItem>
                                            <Button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                deleteMobileMoneyOption(option.id);
                                              }}
                                              className="h-5 w-5 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs flex-shrink-0 ml-2"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </AnimatePresence>
                                  </Accordion>
                                </div>
                              )}

                              {/* Add Mobile Money Button */}
                              {!showAddNewMobileMoney && (
                                <Button
                                  onClick={startAddNewMobileMoney}
                                  className="w-full h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-lg text-xs"
                                >
                                  + Add Mobile Money
                                </Button>
                              )}

                              {/* Add/Edit Mobile Money Form */}
                              {showAddNewMobileMoney && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                  transition={{ 
                                    duration: 0.4,
                                    ease: [0.4, 0, 0.2, 1],
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30
                                  }}
                                  className="space-y-3 bg-white/10 rounded-xl p-3 border border-cyan-400/30"
                                >
                                  <div className="text-cyan-400 text-xs font-medium flex items-center gap-2">
                                    <Smartphone className="h-3 w-3" />
                                    {currentEditingOptionId ? "Edit Mobile Money" : "Add New Mobile Money"}
                                  </div>

                                  {/* {translate("payment.customerInformation")} */}
                                  <div className="space-y-2">
                                    <Label className="text-white text-xs font-medium">
                                      {translate("payment.customerInformation")}
                                    </Label>
                                    <Input
                                      placeholder={translate("payment.fullName")}
                                      value={formData.customerInfo.name}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          customerInfo: {
                                            ...prev.customerInfo,
                                            name: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                    <Input
                                      placeholder={translate("payment.streetAddress")}
                                      value={formData.customerInfo.address}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          customerInfo: {
                                            ...prev.customerInfo,
                                            address: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          placeholder={translate("payment.city")}
                                          value={formData.customerInfo.city}
                                          onChange={(e) =>
                                            setFormData((prev) => ({
                                              ...prev,
                                              customerInfo: {
                                                ...prev.customerInfo,
                                                city: e.target.value,
                                              },
                                            }))
                                          }
                                          className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                        />
                                        <Input
                                          placeholder={translate("payment.state")}
                                          value={formData.customerInfo.state}
                                          onChange={(e) =>
                                            setFormData((prev) => ({
                                              ...prev,
                                              customerInfo: {
                                                ...prev.customerInfo,
                                                state: e.target.value,
                                              },
                                            }))
                                          }
                                          className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                        />
                                      </div>
                                      <Input
                                        placeholder={translate("payment.postalCode")}
                                        value={formData.customerInfo.postalCode}
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            customerInfo: {
                                              ...prev.customerInfo,
                                              postalCode: e.target.value,
                                            },
                                          }))
                                        }
                                        className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                      />
                                    </div>
                                    <Input
                                      placeholder={translate("payment.country")}
                                      value={formData.customerInfo.country}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          customerInfo: {
                                            ...prev.customerInfo,
                                            country: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                  </div>

                                  {/* Mobile Money Details */}
                                  <div className="space-y-2">
                                    <Label className="text-white text-xs font-medium">
                                      Mobile Money Details
                                    </Label>
                                    <Select
                                      value={formData.paymentDetails.provider}
                                      onValueChange={(value) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            provider: value,
                                          },
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white rounded-lg focus:border-cyan-400 text-xs">
                                        <SelectValue placeholder="Select Provider" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gradient-to-br from-slate-800/95 via-purple-800/95 to-indigo-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl shadow-purple-500/25 min-w-[280px] animate-in fade-in-0 zoom-in-95 duration-200">
                                        <SelectItem 
                                          value="mtn" 
                                          className="text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 focus:bg-gradient-to-r focus:from-cyan-500/30 focus:to-blue-500/30 rounded-lg m-1 transition-all duration-200 cursor-pointer border border-transparent hover:border-cyan-400/30"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">M</span>
                                            </div>
                                            <span className="font-medium">MTN Mobile Money</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem 
                                          value="vodafone" 
                                          className="text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 focus:bg-gradient-to-r focus:from-cyan-500/30 focus:to-blue-500/30 rounded-lg m-1 transition-all duration-200 cursor-pointer border border-transparent hover:border-cyan-400/30"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">V</span>
                                            </div>
                                            <span className="font-medium">Vodafone Cash</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem 
                                          value="airteltigo" 
                                          className="text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 focus:bg-gradient-to-r focus:from-cyan-500/30 focus:to-blue-500/30 rounded-lg m-1 transition-all duration-200 cursor-pointer border border-transparent hover:border-cyan-400/30"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-bold text-white">A</span>
                                            </div>
                                            <span className="font-medium">AirtelTigo Money</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      placeholder="Mobile Number"
                                      value={formData.paymentDetails.mobileNumber}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            mobileNumber: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                    <Input
                                      placeholder={translate("payment.nickname")}
                                      value={formData.paymentDetails.nickname}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            nickname: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                  </div>
                                  
                                  {/* Form Action Buttons */}
                                  <div className="flex gap-2 pt-2">
                                    <Button
                                      type="button"
                                      onClick={saveMobileMoneyOption}
                                      className="flex-1 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-xs"
                                    >
                                      {currentEditingOptionId ? "Update" : "Save"}
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        setShowAddNewMobileMoney(false);
                                        setCurrentEditingOptionId(null);
                                        setFormData(prev => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            provider: "",
                                            mobileNumber: "",
                                            nickname: "",
                                          }
                                        }));
                                      }}
                                      className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
                                    >
                                      {translate("payment.cancel")}
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      <AccordionItem
                        value="card"
                        className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-3 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180">
                          <div className="flex items-center justify-between w-full mr-2">
                            <div className="flex items-center space-x-2">
                              <CreditCard className="h-4 w-4 text-cyan-400" />
                              <span className="text-white text-sm font-medium">
                                {translate("payment.creditDebitCard")}
                              </span>
                            </div>
                            {selectedPaymentMethod.type === 'credit_card' && selectedPaymentMethod.id && (
                              <Check className="h-5 w-5 text-green-500 font-bold stroke-[3]" />
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">
                            {/* Saved Credit Cards */}
                            {savedCreditCards.length > 0 && !showAddNewCreditCard && (
                              <div className="space-y-2">
                                <Label className="text-gray-300 text-[10px] font-light italic tracking-wide">
                                  {translate("payment.selectOption")}
                                </Label>
                                <Accordion 
                                  type="single" 
                                  collapsible 
                                  className={`space-y-2 transition-opacity ${showAddNewCreditCard ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                                  value={openCardAccordionValue}
                                  onValueChange={(value) => {
                                    // Prevent expanding existing options when adding new credit card
                                    if (!showAddNewCreditCard) {
                                      setOpenCardAccordionValue(value || "");
                                      // Close mobile money accordions when opening credit card option
                                      if (value) {
                                        setOpenAccordionValue("");
                                        setShowAddNewMobileMoney(false);
                                      }
                                    }
                                  }}
                                >
                                  <AnimatePresence mode="popLayout">
                                    {savedCreditCards.map((card) => (
                                      <motion.div
                                        key={card.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                        transition={{ 
                                          layout: { 
                                            duration: 0.4, 
                                            ease: [0.4, 0, 0.2, 1],
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30
                                          },
                                          opacity: { duration: 0.2 },
                                          scale: { duration: 0.2 },
                                          y: { duration: 0.3 }
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        <div className="flex-1">
                                          <AccordionItem value={card.id} className="border border-white/10 rounded-lg bg-white/5">
                                            <AccordionTrigger 
                                              className="px-3 py-2 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180 cursor-pointer"
                                            >
                                            <div className="flex items-center space-x-3 w-full mr-2">
                                              {/* Selection Checkbox */}
                                              <div 
                                                className="w-5 h-5 rounded border-2 border-cyan-400 bg-transparent flex items-center justify-center cursor-pointer hover:bg-cyan-400/10 transition-all"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (selectedCreditCardId === card.id) {
                                                    clearAllSelections();
                                                  } else {
                                                    selectPaymentOption('credit_card', card.id);
                                                    // Move selected card to first position
                                                    setSavedCreditCards(prev => {
                                                      const selectedCard = prev.find(c => c.id === card.id);
                                                      const otherCards = prev.filter(c => c.id !== card.id);
                                                      return selectedCard ? [selectedCard, ...otherCards] : prev;
                                                    });
                                                  }
                                                }}
                                              >
                                                {selectedCreditCardId === card.id && (
                                                  <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                                                )}
                                              </div>
                                              <div className="text-white text-xs font-medium">
                                                {card.nickname}
                                              </div>
                                              <div className="text-gray-400 text-xs">
                                                • {card.cardType.toUpperCase()}
                                              </div>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="px-2 pb-2">
                                            <div className="space-y-3 pt-1">
                                              {/* {translate("payment.customerInformation")} */}
                                              <div className="space-y-2">
                                                <Label className="text-white text-xs font-medium">{translate("payment.customerInformation")}</Label>
                                                <Input
                                                  placeholder={translate("payment.fullName")}
                                                  value={card.customerInfo.name}
                                                  onChange={(e) => {
                                                    const updatedCards = savedCreditCards.map(c => 
                                                      c.id === card.id 
                                                        ? { ...c, customerInfo: { ...c.customerInfo, name: e.target.value } }
                                                        : c
                                                    );
                                                    setSavedCreditCards(updatedCards);
                                                  }}
                                                  className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                />
                                                <Input
                                                  placeholder={translate("payment.streetAddress")}
                                                  value={card.customerInfo.address}
                                                  onChange={(e) => {
                                                    const updatedCards = savedCreditCards.map(c => 
                                                      c.id === card.id 
                                                        ? { ...c, customerInfo: { ...c.customerInfo, address: e.target.value } }
                                                        : c
                                                    );
                                                    setSavedCreditCards(updatedCards);
                                                  }}
                                                  className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                  <Input
                                                    placeholder={translate("payment.city")}
                                                    value={card.customerInfo.city}
                                                    onChange={(e) => {
                                                      const updatedCards = savedCreditCards.map(c => 
                                                        c.id === card.id 
                                                          ? { ...c, customerInfo: { ...c.customerInfo, city: e.target.value } }
                                                          : c
                                                      );
                                                      setSavedCreditCards(updatedCards);
                                                    }}
                                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                  />
                                                  <Input
                                                    placeholder={translate("payment.postalCode")}
                                                    value={card.customerInfo.postalCode}
                                                    onChange={(e) => {
                                                      const updatedCards = savedCreditCards.map(c => 
                                                        c.id === card.id 
                                                          ? { ...c, customerInfo: { ...c.customerInfo, postalCode: e.target.value } }
                                                          : c
                                                      );
                                                      setSavedCreditCards(updatedCards);
                                                    }}
                                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                  />
                                                </div>
                                                <Input
                                                  placeholder={translate("payment.country")}
                                                  value={card.customerInfo.country}
                                                  onChange={(e) => {
                                                    const updatedCards = savedCreditCards.map(c => 
                                                      c.id === card.id 
                                                        ? { ...c, customerInfo: { ...c.customerInfo, country: e.target.value } }
                                                        : c
                                                    );
                                                    setSavedCreditCards(updatedCards);
                                                  }}
                                                  className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                />
                                              </div>

                                              {/* Card Details */}
                                              <div className="space-y-2">
                                                <Label className="text-white text-xs font-medium">{translate("payment.cardDetails")}</Label>
                                                <Input
                                                  placeholder={translate("payment.cardNumberPlaceholder")}
                                                  value={card.cardNumber}
                                                  onChange={(e) => {
                                                    const updatedCards = savedCreditCards.map(c => 
                                                      c.id === card.id 
                                                        ? { ...c, cardNumber: e.target.value }
                                                        : c
                                                    );
                                                    setSavedCreditCards(updatedCards);
                                                  }}
                                                  className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                  <Input
                                                    placeholder="MM/YY"
                                                    value={card.expiryDate}
                                                    onChange={(e) => {
                                                      const updatedCards = savedCreditCards.map(c => 
                                                        c.id === card.id 
                                                          ? { ...c, expiryDate: e.target.value }
                                                          : c
                                                      );
                                                      setSavedCreditCards(updatedCards);
                                                    }}
                                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                  />
                                                  <Input
                                                    placeholder="CVV"
                                                    value={card.cvv}
                                                    onChange={(e) => {
                                                      const updatedCards = savedCreditCards.map(c => 
                                                        c.id === card.id 
                                                          ? { ...c, cvv: e.target.value }
                                                          : c
                                                      );
                                                      setSavedCreditCards(updatedCards);
                                                    }}
                                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                  />
                                                </div>
                                                <Input
                                                  placeholder={translate("payment.nickname")}
                                                  value={card.nickname}
                                                  onChange={(e) => {
                                                    const updatedCards = savedCreditCards.map(c => 
                                                      c.id === card.id 
                                                        ? { ...c, nickname: e.target.value }
                                                        : c
                                                    );
                                                    setSavedCreditCards(updatedCards);
                                                  }}
                                                  className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                />
                                              </div>

                                              {/* Form Action Buttons */}
                                              <div className="flex gap-2 pt-2">
                                                <Button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateCreditCardInStorage(card);
                                                    setOpenCardAccordionValue("");
                                                  }}
                                                  className="flex-1 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-xs"
                                                >
                                                  Update
                                                </Button>
                                                <Button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Reset to original values
                                                    const originalCard = JSON.parse(localStorage.getItem('charley_saved_credit_cards') || '[]')
                                                      .find((c: any) => c.id === card.id);
                                                    if (originalCard) {
                                                      const updatedCards = savedCreditCards.map(c => 
                                                        c.id === card.id ? originalCard : c
                                                      );
                                                      setSavedCreditCards(updatedCards);
                                                    }
                                                    setOpenCardAccordionValue("");
                                                  }}
                                                  className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
                                                >
                                                  {translate("payment.cancel")}
                                                </Button>
                                              </div>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                        </div>
                                        
                                        {/* Delete Button Outside */}
                                        <Button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            deleteCreditCard(card.id);
                                          }}
                                          className="h-5 w-5 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs flex-shrink-0 ml-2"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </Accordion>
                              </div>
                            )}

                            {/* Add Credit Card Button */}
                            {!showAddNewCreditCard && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                              >
                                <Button
                                  type="button"
                                  onClick={startAddNewCreditCard}
                                  className="w-full h-8 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-lg text-xs shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
                                >
                                  <Plus className="h-3 w-3 mr-2" />
                                  Add Credit Card
                                </Button>
                              </motion.div>
                            )}

                            {/* Add New Credit Card Form */}
                            {showAddNewCreditCard && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                transition={{ 
                                  duration: 0.4,
                                  ease: [0.4, 0, 0.2, 1],
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 30
                                }}
                                className="space-y-3 bg-white/10 rounded-xl p-3 border border-cyan-400/30"
                              >
                                <div className="text-cyan-400 text-xs font-medium flex items-center gap-2">
                                  <CreditCard className="h-3 w-3" />
                                  {currentEditingCardId ? translate("payment.editCreditCard") : translate("payment.addNewCreditCard")}
                                </div>
                                
                                {/* {translate("payment.customerInformation")} */}
                                <div className="space-y-2">
                                  <Label className="text-white text-xs font-medium">{translate("payment.customerInformation")}</Label>
                                  <Input
                                    placeholder={translate("payment.fullName")}
                                    value={formData.customerInfo.name}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        customerInfo: {
                                          ...prev.customerInfo,
                                          name: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                  <Input
                                    placeholder={translate("payment.streetAddress")}
                                    value={formData.customerInfo.address}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        customerInfo: {
                                          ...prev.customerInfo,
                                          address: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder={translate("payment.city")}
                                        value={formData.customerInfo.city}
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            customerInfo: {
                                              ...prev.customerInfo,
                                              city: e.target.value,
                                            },
                                          }))
                                        }
                                        className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                      />
                                      <Input
                                        placeholder={translate("payment.state")}
                                        value={formData.customerInfo.state}
                                        onChange={(e) =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            customerInfo: {
                                              ...prev.customerInfo,
                                              state: e.target.value,
                                            },
                                          }))
                                        }
                                        className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                      />
                                    </div>
                                    <Input
                                      placeholder={translate("payment.postalCode")}
                                      value={formData.customerInfo.postalCode}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          customerInfo: {
                                            ...prev.customerInfo,
                                            postalCode: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                  </div>
                                  <Input
                                    placeholder={translate("payment.country")}
                                    value={formData.customerInfo.country}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        customerInfo: {
                                          ...prev.customerInfo,
                                          country: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                </div>

                                {/* Nickname field - CardElement removed to prevent conflicts */}
                                <Input
                                  placeholder={translate("payment.nickname")}
                                  value={formData.paymentDetails.nickname}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      paymentDetails: {
                                        ...prev.paymentDetails,
                                        nickname: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                />

                                {/* Form Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    type="button"
                                    onClick={saveCreditCardOption}
                                    className="flex-1 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-xs"
                                  >
                                    {currentEditingCardId ? "Update" : translate("payment.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setShowAddNewCreditCard(false);
                                      setCurrentEditingCardId(null);
                                      setFormData(prev => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          cardNumber: "",
                                          expiryDate: "",
                                          cvv: "",
                                          nickname: "",
                                        }
                                      }));
                                    }}
                                    className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
                                  >
                                    {translate("payment.cancel")}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem
                        value="bank_account"
                        className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-3 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180">
                          <div className="flex items-center justify-between w-full mr-2">
                            <div className="flex items-center space-x-2">
                              <Banknote className="h-4 w-4 text-cyan-400" />
                              <span className="text-white text-sm font-medium">
                                {translate("payment.bankAccount")}
                              </span>
                            </div>
                            {selectedPaymentMethod.type === 'bank_account' && selectedPaymentMethod.id && (
                              <Check className="h-5 w-5 text-green-500 font-bold stroke-[3]" />
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">
                            {/* Saved Bank Accounts */}
                            {savedBankAccounts.length > 0 && !showAddNewBankAccount && (
                              <div className="space-y-2">
                                <Label className="text-gray-300 text-[10px] font-light italic tracking-wide">
                                  {translate("payment.selectOption")}
                                </Label>
                                <Accordion
                                  type="single"
                                  collapsible
                                  className={`space-y-2 transition-opacity ${showAddNewBankAccount ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                                  value={openBankAccordionValue}
                                  onValueChange={(value) => {
                                    // Prevent expanding existing options when adding new bank account
                                    if (!showAddNewBankAccount) {
                                      setOpenBankAccordionValue(value);
                                      // Close other accordions when opening bank account option
                                      if (value) {
                                        setOpenCardAccordionValue("");
                                        setOpenAccordionValue("");
                                        setShowAddNewCreditCard(false);
                                        setShowAddNewMobileMoney(false);
                                      }
                                    }
                                  }}
                                >
                                  <AnimatePresence mode="popLayout">
                                    {savedBankAccounts.map((account) => (
                                      <motion.div
                                        key={account.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                        transition={{ 
                                          layout: { 
                                            duration: 0.4, 
                                            ease: [0.4, 0, 0.2, 1],
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30
                                          },
                                          opacity: { duration: 0.2 },
                                          scale: { duration: 0.2 }
                                        }}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <AccordionItem
                                            value={account.id}
                                            className="bg-white/5 rounded-lg border border-white/10 overflow-hidden flex-1"
                                          >
                                            <AccordionTrigger 
                                              className="px-2 py-2 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180"
                                              onClick={() => {
                                                // Set the current editing account and load its data
                                                setCurrentEditingAccountId(account.id);
                                                setFormData(prev => ({
                                                  ...prev,
                                                  customerInfo: { ...account.customerInfo },
                                                  paymentDetails: {
                                                    ...prev.paymentDetails,
                                                    accountType: account.accountType,
                                                    nameOnAccount: account.nameOnAccount,
                                                    routingNumber: account.routingNumber,
                                                    accountNumber: account.accountNumber,
                                                    reenterAccountNumber: account.accountNumber,
                                                    nickname: account.nickname,
                                                  }
                                                }));
                                              }}
                                            >
                                              <div className="flex items-center space-x-3 w-full mr-2">
                                                {/* Selection Checkbox */}
                                                <div 
                                                  className="w-5 h-5 rounded border-2 border-cyan-400 bg-transparent flex items-center justify-center cursor-pointer hover:bg-cyan-400/10 transition-all"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectedBankAccountId === account.id) {
                                                      clearAllSelections();
                                                    } else {
                                                      selectPaymentOption('bank_account', account.id);
                                                      // Move selected account to first position
                                                      setSavedBankAccounts(prev => {
                                                        const selectedAccount = prev.find(acc => acc.id === account.id);
                                                        const otherAccounts = prev.filter(acc => acc.id !== account.id);
                                                        return selectedAccount ? [selectedAccount, ...otherAccounts] : prev;
                                                      });
                                                    }
                                                  }}
                                                >
                                                  {selectedBankAccountId === account.id && (
                                                    <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                                                  )}
                                                </div>
                                                <div className="text-white text-xs font-medium">
                                                  {account.nickname}
                                                </div>
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-2 pb-2">
                                              <div className="space-y-2 pt-1">
                                                {/* {translate("payment.accountType")} */}
                                                <div className="space-y-1">
                                                  <Label className="text-white text-[10px] font-medium">
                                                    {translate("payment.accountType")}
                                                  </Label>
                                                  <RadioGroup
                                                    value={formData.paymentDetails.accountType}
                                                    onValueChange={(value) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          accountType: value,
                                                        },
                                                      }))
                                                    }
                                                    className="flex space-x-4"
                                                  >
                                                    <div className="flex items-center space-x-1">
                                                      <div className="relative">
                                                        <RadioGroupItem 
                                                          value="checking" 
                                                          id="checking" 
                                                          className="w-3 h-3 border-2 border-cyan-400 data-[state=checked]:bg-white data-[state=checked]:border-cyan-400" 
                                                        />
                                                        {formData.paymentDetails.accountType === "checking" && (
                                                          <Check className="absolute -inset-1 w-5 h-5 text-green-500 font-bold stroke-[3]" />
                                                        )}
                                                      </div>
                                                      <Label htmlFor="checking" className="text-white text-[10px]">
                                                        {translate("payment.checking")}
                                                      </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                      <div className="relative">
                                                        <RadioGroupItem 
                                                          value="savings" 
                                                          id="savings" 
                                                          className="w-3 h-3 border-2 border-cyan-400 data-[state=checked]:bg-white data-[state=checked]:border-cyan-400" 
                                                        />
                                                        {formData.paymentDetails.accountType === "savings" && (
                                                          <Check className="absolute -inset-1 w-5 h-5 text-green-500 font-bold stroke-[3]" />
                                                        )}
                                                      </div>
                                                      <Label htmlFor="savings" className="text-white text-[10px]">
                                                        {translate("payment.savings")}
                                                      </Label>
                                                    </div>
                                                  </RadioGroup>
                                                </div>

                                                {/* {translate("payment.bankAccountDetails")} */}
                                                <div className="space-y-1">
                                                  <Label className="text-white text-[10px] font-medium">
                                                    {translate("payment.bankAccountDetails")}
                                                  </Label>
                                                  <Input
                                                    placeholder={translate("payment.nameOnAccount")}
                                                    value={formData.paymentDetails.nameOnAccount}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          nameOnAccount: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                  <Input
                                                    placeholder={translate("payment.routingNumber")}
                                                    value={formData.paymentDetails.routingNumber}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          routingNumber: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                  <Input
                                                    placeholder={translate("payment.accountNumber")}
                                                    value={formData.paymentDetails.accountNumber}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          accountNumber: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                  <Input
                                                    placeholder={translate("payment.reenterAccountNumber")}
                                                    value={formData.paymentDetails.reenterAccountNumber}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          reenterAccountNumber: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                  <Input
                                                    placeholder={translate("payment.nickname")}
                                                    value={formData.paymentDetails.nickname}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          nickname: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-7 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-[10px]"
                                                  />
                                                </div>
                                                
                                                <div className="flex space-x-1">
                                                  <Button
                                                    type="button"
                                                    onClick={saveBankAccountOption}
                                                    className="flex-1 h-7 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-[10px]"
                                                  >
                                                    Update
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    onClick={() => {
                                                      // Reset to original values
                                                      setFormData(prev => ({
                                                        ...prev,
                                                        customerInfo: { ...account.customerInfo },
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          accountType: account.accountType,
                                                          nameOnAccount: account.nameOnAccount,
                                                          routingNumber: account.routingNumber,
                                                          accountNumber: account.accountNumber,
                                                          reenterAccountNumber: account.accountNumber,
                                                          nickname: account.nickname,
                                                        }
                                                      }));
                                                      setCurrentEditingAccountId(null);
                                                      setOpenBankAccordionValue(""); // Collapse the accordion
                                                    }}
                                                    className="h-7 px-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px]"
                                                  >
                                                    {translate("payment.cancel")}
                                                  </Button>
                                                </div>
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                          <Button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              deleteBankAccount(account.id);
                                            }}
                                            className="h-5 w-5 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs flex-shrink-0 ml-2"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </Accordion>
                              </div>
                            )}

                            {/* Add Bank Account Button */}
                            {!showAddNewBankAccount && (
                              <Button
                                onClick={startAddNewBankAccount}
                                className="w-full h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-lg text-xs"
                              >
                                + {translate("payment.addBankAccount")}
                              </Button>
                            )}

                            {/* Add/Edit Bank Account Form */}
                            {showAddNewBankAccount && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3 bg-white/10 rounded-xl p-3 border border-cyan-400/30"
                              >
                                <div className="text-cyan-400 text-xs font-medium flex items-center gap-2">
                                  <Banknote className="h-3 w-3" />
                                  {currentEditingAccountId ? translate("payment.editBankAccount") : translate("payment.addNewBankAccount")}
                                </div>

                                {/* {translate("payment.accountType")} */}
                                <div className="space-y-2">
                                  <Label className="text-white text-xs font-medium">
                                    {translate("payment.accountType")}
                                  </Label>
                                  <RadioGroup
                                    value={formData.paymentDetails.accountType}
                                    onValueChange={(value) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          accountType: value,
                                        },
                                      }))
                                    }
                                    className="flex space-x-6"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className="relative">
                                        <RadioGroupItem 
                                          value="checking" 
                                          id="checking-new" 
                                          className="w-4 h-4 border-2 border-cyan-400 data-[state=checked]:bg-white data-[state=checked]:border-cyan-400" 
                                        />
                                        {formData.paymentDetails.accountType === "checking" && (
                                          <Check className="absolute -inset-1 w-6 h-6 text-green-500 font-bold stroke-[3]" />
                                        )}
                                      </div>
                                      <Label htmlFor="checking-new" className="text-white text-xs">
                                        {translate("payment.checking")}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="relative">
                                        <RadioGroupItem 
                                          value="savings" 
                                          id="savings-new" 
                                          className="w-4 h-4 border-2 border-cyan-400 data-[state=checked]:bg-white data-[state=checked]:border-cyan-400" 
                                        />
                                        {formData.paymentDetails.accountType === "savings" && (
                                          <Check className="absolute -inset-1 w-6 h-6 text-green-500 font-bold stroke-[3]" />
                                        )}
                                      </div>
                                      <Label htmlFor="savings-new" className="text-white text-xs">
                                        {translate("payment.savings")}
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </div>

                                {/* {translate("payment.bankAccountDetails")} */}
                                <div className="space-y-2">
                                  <Label className="text-white text-xs font-medium">
                                    {translate("payment.bankAccountDetails")}
                                  </Label>
                                  <Input
                                    placeholder={translate("payment.nameOnAccount")}
                                    value={formData.paymentDetails.nameOnAccount}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          nameOnAccount: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                  <Input
                                    placeholder={translate("payment.routingNumber")}
                                    value={formData.paymentDetails.routingNumber}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          routingNumber: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                  <Input
                                    placeholder={translate("payment.accountNumber")}
                                    value={formData.paymentDetails.accountNumber}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          accountNumber: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                  <Input
                                    placeholder={translate("payment.reenterAccountNumber")}
                                    value={formData.paymentDetails.reenterAccountNumber}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          reenterAccountNumber: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                  <Input
                                    placeholder={translate("payment.nickname")}
                                    value={formData.paymentDetails.nickname}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          nickname: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                  />
                                </div>
                                
                                {/* Form Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    type="button"
                                    onClick={saveBankAccountOption}
                                    className="flex-1 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-xs"
                                  >
                                    {currentEditingAccountId ? "Update" : translate("payment.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setShowAddNewBankAccount(false);
                                      setCurrentEditingAccountId(null);
                                      // Reset form
                                      setFormData(prev => ({
                                        ...prev,
                                        paymentDetails: {
                                          ...prev.paymentDetails,
                                          accountType: "",
                                          nameOnAccount: "",
                                          routingNumber: "",
                                          accountNumber: "",
                                          reenterAccountNumber: "",
                                          nickname: "",
                                        }
                                      }));
                                    }}
                                    className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
                                  >
                                    {translate("payment.cancel")}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem
                        value="digital_wallet"
                        className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-3 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-cyan-400" />
                            <span className="text-white text-sm font-medium">
                              {translate("payment.digitalWallets")}
                            </span>
                            {selectedPaymentMethod.type === 'digital_wallet' && selectedPaymentMethod.id && (
                              <div className="w-5 h-5 rounded border-2 border-cyan-400 bg-transparent flex items-center justify-center ml-auto">
                                <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                              </div>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">
                            
                            {/* Saved Digital Wallets */}
                            <AnimatePresence mode="popLayout">
                              {savedDigitalWallets.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{
                                    duration: 0.3,
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30
                                  }}
                                  className="space-y-2"
                                >
                                  <Label className="text-gray-400 text-xs italic">
                                    {translate("payment.selectOption")}
                                  </Label>
                                  <Accordion 
                                    type="single" 
                                    collapsible 
                                    value={openWalletAccordionValue}
                                    onValueChange={setOpenWalletAccordionValue}
                                    className="space-y-2"
                                  >
                                    {savedDigitalWallets.map((wallet) => (
                                      <motion.div
                                        key={wallet.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                        transition={{ 
                                          layout: { 
                                            duration: 0.4, 
                                            ease: [0.4, 0, 0.2, 1],
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30
                                          },
                                          opacity: { duration: 0.2 },
                                          scale: { duration: 0.2 }
                                        }}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <AccordionItem
                                            value={wallet.id}
                                            className="bg-white/5 rounded-lg border border-white/10 overflow-hidden flex-1"
                                          >
                                            <AccordionTrigger 
                                              className="px-2 py-2 hover:bg-white/10 transition-all [&[data-state=open]>svg]:rotate-180"
                                              onClick={() => {
                                                // Set the current editing wallet and load its data
                                                setCurrentEditingWalletId(wallet.id);
                                                setFormData(prev => ({
                                                  ...prev,
                                                  customerInfo: { ...wallet.customerInfo },
                                                  paymentDetails: {
                                                    ...prev.paymentDetails,
                                                    provider: wallet.provider,
                                                    nickname: wallet.nickname,
                                                  }
                                                }));
                                              }}
                                            >
                                              <div className="flex items-center space-x-3 w-full mr-2">
                                                {/* Selection Checkbox */}
                                                <div 
                                                  className="w-5 h-5 rounded border-2 border-cyan-400 bg-transparent flex items-center justify-center cursor-pointer hover:bg-cyan-400/10 transition-all"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectedDigitalWalletId === wallet.id) {
                                                      clearAllSelections();
                                                    } else {
                                                      selectPaymentOption('digital_wallet', wallet.id);
                                                      // Move selected wallet to first position
                                                      setSavedDigitalWallets(prev => {
                                                        const selectedWallet = prev.find(w => w.id === wallet.id);
                                                        const otherWallets = prev.filter(w => w.id !== wallet.id);
                                                        return selectedWallet ? [selectedWallet, ...otherWallets] : prev;
                                                      });
                                                    }
                                                  }}
                                                >
                                                  {selectedDigitalWalletId === wallet.id && (
                                                    <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>
                                                  )}
                                                </div>
                                                <div className="text-white text-xs font-medium">
                                                  {wallet.nickname}
                                                </div>
                                                <div className="text-gray-400 text-xs">
                                                  • {wallet.provider.replace('_', ' ').toUpperCase()}
                                                </div>
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-2 pb-2">
                                              <div className="space-y-2 pt-1">
                                                {/* Digital Wallet Details */}
                                                <div className="space-y-2">
                                                  <Label className="text-white text-xs font-medium">
                                                    Digital Wallet Details
                                                  </Label>
                                                  <Select
                                                    value={formData.paymentDetails.provider}
                                                    onValueChange={(value) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          provider: value,
                                                        },
                                                      }))
                                                    }
                                                  >
                                                    <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white rounded-lg focus:border-cyan-400 text-xs">
                                                      <SelectValue placeholder={translate("payment.selectWallet")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="paypal">PayPal</SelectItem>
                                                      <SelectItem value="apple_pay">Apple Pay</SelectItem>
                                                      <SelectItem value="google_pay">Google Pay</SelectItem>
                                                      <SelectItem value="amazon_pay">Amazon Pay</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                  <Input
                                                    placeholder={translate("payment.nickname")}
                                                    value={formData.paymentDetails.nickname}
                                                    onChange={(e) =>
                                                      setFormData((prev) => ({
                                                        ...prev,
                                                        paymentDetails: {
                                                          ...prev.paymentDetails,
                                                          nickname: e.target.value,
                                                        },
                                                      }))
                                                    }
                                                    className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                                  />
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 pt-1">
                                                  <Button
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      saveDigitalWalletOption();
                                                    }}
                                                    type="button"
                                                    className="flex-1 h-7 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-xs"
                                                  >
                                                    Update
                                                  </Button>
                                                  <Button
                                                    onClick={() => {
                                                      setCurrentEditingWalletId(null);
                                                      setOpenWalletAccordionValue("");
                                                      // Reset form to original wallet data
                                                      const originalWallet = savedDigitalWallets.find(w => w.id === wallet.id);
                                                      if (originalWallet) {
                                                        setFormData(prev => ({
                                                          ...prev,
                                                          customerInfo: { ...originalWallet.customerInfo },
                                                          paymentDetails: {
                                                            ...prev.paymentDetails,
                                                            provider: originalWallet.provider,
                                                            nickname: originalWallet.nickname,
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    variant="outline"
                                                    className="flex-1 h-7 border-white/20 text-gray-300 hover:bg-white/10 rounded-lg text-xs"
                                                  >
                                                    {translate("payment.cancel")}
                                                  </Button>
                                                </div>
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                          
                                          {/* Delete Button */}
                                          <button
                                            onClick={() => deleteDigitalWallet(wallet.id)}
                                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-all"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </Accordion>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Add Digital Wallet Button - only show when not adding new */}
                            <AnimatePresence mode="popLayout">
                              {!showAddNewDigitalWallet && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{
                                    duration: 0.2,
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30
                                  }}
                                >
                                  <Button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startAddNewDigitalWallet();
                                    }}
                                    type="button"
                                    className="w-full h-8 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium rounded-lg text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-2" />
                                    Add Digital Wallet
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Add New Digital Wallet Form */}
                            <AnimatePresence mode="popLayout">
                              {showAddNewDigitalWallet && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                  transition={{
                                    duration: 0.3,
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30
                                  }}
                                  className="space-y-3 border-t border-white/10 pt-3"
                                >
                                  <div className="space-y-2">
                                    <Label className="text-white text-xs font-medium">
                                      Digital Wallet Details
                                    </Label>
                                    <Select
                                      value={formData.paymentDetails.provider}
                                      onValueChange={(value) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            provider: value,
                                          },
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white rounded-lg focus:border-cyan-400 text-xs">
                                        <SelectValue placeholder="Select Wallet" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="paypal">PayPal</SelectItem>
                                        <SelectItem value="apple_pay">Apple Pay</SelectItem>
                                        <SelectItem value="google_pay">Google Pay</SelectItem>
                                        <SelectItem value="amazon_pay">Amazon Pay</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      placeholder={translate("payment.nickname")}
                                      value={formData.paymentDetails.nickname}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            nickname: e.target.value,
                                          },
                                        }))
                                      }
                                      className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-lg focus:border-cyan-400 text-xs"
                                    />
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        saveDigitalWalletOption();
                                      }}
                                      type="button"
                                      className="flex-1 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg text-xs"
                                    >
                                      <Globe className="h-3 w-3 mr-2" />
                                      {translate("payment.save")}
                                    </Button>
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowAddNewDigitalWallet(false);
                                        setCurrentEditingWalletId(null);
                                        // Clear form
                                        setFormData(prev => ({
                                          ...prev,
                                          paymentDetails: {
                                            ...prev.paymentDetails,
                                            provider: "",
                                            nickname: "",
                                          }
                                        }));
                                      }}
                                      type="button"
                                      variant="outline"
                                      className="flex-1 h-8 border-white/20 text-gray-300 hover:bg-white/10 rounded-lg text-xs"
                                    >
                                      {translate("payment.cancel")}
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>



                  {/* Payment details are now handled within the accordion above */}


                </form>
              </CardContent>
            </Card>

            {/* Save to Continue Button */}
            <Button
              onClick={async () => {
                // Map selectedPaymentMethod.type to formData.paymentMethod
                let paymentMethod = "";
                if (selectedPaymentMethod.type === 'credit_card') {
                  paymentMethod = "card";
                } else if (selectedPaymentMethod.type === 'mobile_money') {
                  paymentMethod = "mobile_money";
                } else if (selectedPaymentMethod.type === 'bank_account') {
                  paymentMethod = "bank_account";
                } else if (selectedPaymentMethod.type === 'digital_wallet') {
                  paymentMethod = "digital_wallet";
                }
                
                if (!selectedPaymentMethod.type || !paymentMethod) {
                  toast({
                    title: "Payment Method Required",
                    description: "Please select a payment method to continue.",
                    variant: "destructive",
                  });
                  return;
                }

                // Set the mapped payment method in formData
                setFormData(prev => ({ ...prev, paymentMethod }));

                if (!selectedPlan) {
                  toast({
                    title: "Plan Required",
                    description: "Please select a subscription plan.",
                    variant: "destructive",
                  });
                  return;
                }

                // SMOOTH TRANSITION FIX: For card payments, transition immediately then create subscription in background
                if (paymentMethod === "card") {
                  // Transition immediately to prevent white screen
                  setStep("final_payment");
                  
                  // Create subscription in background to get clientSecret
                  try {
                    console.log("[SMOOTH-TRANSITION] Creating Stripe subscription in background...");
                    
                    const response = await fetch("/api/subscription/create", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        planType: selectedPlan.type,
                        region: formData.region,
                        paymentMethod: paymentMethod,
                        // Include billing address information
                        billingName: formData.customerInfo.name,
                        billingEmail: formData.customerInfo.email,
                        billingPhone: formData.customerInfo.phone,
                        billingAddress: formData.customerInfo.address,
                        billingCity: formData.customerInfo.city,
                        billingState: formData.customerInfo.state,
                        billingPostalCode: formData.customerInfo.postalCode,
                        billingCountry: formData.customerInfo.country,
                        nickname: formData.customerInfo.nickname,
                      }),
                    });

                    if (!response.ok) {
                      const contentType = response.headers.get("content-type");
                      if (contentType && contentType.includes("text/html")) {
                        throw new Error("Authentication required. Please log in again.");
                      }
                      const error = await response.json();
                      console.error("Subscription creation failed:", error);
                      throw new Error(error.error || "Card payment setup failed");
                    }

                    const result = await response.json();
                    console.log("[SMOOTH-TRANSITION] Subscription created, client secret ready");
                    setClientSecret(result.clientSecret);
                    
                  } catch (error) {
                    console.error("[SMOOTH-TRANSITION] Failed to create subscription:", error);
                    // Stay on final_payment but show error
                    toast({
                      title: "Setup Failed",
                      description: error instanceof Error ? error.message : "Failed to setup payment. Please try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  // For other payment methods, just proceed to final payment
                  setStep("final_payment");
                }
              }}
              disabled={step === "processing"}
              className="w-full h-9 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 text-sm"
            >
              {step === "processing" ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <ArrowRight className="h-3 w-3 mr-2" />
                  {translate("payment.saveToContinue")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "final_payment") {
    const { amount, currency } = getPlanPrice(
      formData.planType,
      formData.region,
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-32 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
          {/* Header with Centered Title */}
          <div className="relative flex items-center justify-between mb-6">
            {/* Back Button - Left */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("payment_method")}
              className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all p-2 z-50 relative -mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-white whitespace-nowrap">
                  {translate("payment.completePayment")}
                </h1>
              </div>
              <p className="text-gray-300 text-xs whitespace-nowrap">
                {translate("payment.reviewAndFinalize", { plan: selectedPlan?.name })}
              </p>
            </div>

            {/* Right Side Spacer for Balance */}
            <div className="w-10 h-10"></div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
            {/* Order Summary */}
            <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {translate("payment.orderSummary")}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-sm">
                        {selectedPlan?.name} Plan
                      </h4>
                      <p className="text-xs text-gray-400">
                        {selectedPlan?.description}
                      </p>
                      <Badge
                        variant="secondary"
                        className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs px-2 py-0.5 mt-1"
                      >
                        {translate("payment.premiumAccess")}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <div className="flex justify-between text-white text-sm">
                      <span>{translate("payment.subtotal")}</span>
                      <span className="font-medium">
                        {formatPrice(amount, currency)}
                      </span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-green-400 text-sm">
                        <span>Discount ({promoDiscount}%)</span>
                        <span>
                          -
                          {formatPrice(
                            (amount * promoDiscount) / 100,
                            currency,
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                      <span>{translate("payment.total")}</span>
                      <span>
                        {formatPrice(
                          amount - (amount * promoDiscount) / 100,
                          currency,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Summary */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>{translate("payment.paymentMethodLabel")}</span>
                      <span className="font-medium text-white capitalize">
                        {formData.paymentMethod === "card" && translate("payment.creditDebitCard")}
                        {formData.paymentMethod === "mobile_money" && "Mobile Money"}
                        {formData.paymentMethod === "bank_account" && translate("payment.bankAccount")}
                        {formData.paymentMethod === "digital_wallet" && translate("payment.digitalWallets")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Details for Credit Card Payment */}
            {formData.paymentMethod === "card" && (
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 rounded-xl">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white text-sm font-medium">{translate("payment.cardDetails")}</Label>
                      {!clientSecret && (
                        <div className="flex items-center gap-2 text-xs text-cyan-400">
                          <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                          Setting up payment...
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg focus-within:border-cyan-400 transition-colors">
                      <CardElement
                        id="final-payment-card-element"
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#ffffff',
                              '::placeholder': {
                                color: '#9ca3af',
                              },
                            },
                            invalid: {
                              color: '#ef4444',
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Badge */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-medium">
                    {translate("payment.sslEncryption")}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {translate("payment.paymentProtected")}
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Payment Button */}
            <Button
              onClick={handlePaymentSubmit}
              disabled={isProcessingPayment || (formData.paymentMethod === "card" && !clientSecret)}
              className="w-full h-9 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingPayment ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  {translate("common.processing")}
                </>
              ) : (formData.paymentMethod === "card" && !clientSecret) ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-2" />
                  {translate("payment.completePayment")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }



  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to Premium!
          </h1>
          <p className="text-gray-300 mb-8">
            Your payment was successful. Enjoy all premium features.
          </p>
          <Button
            onClick={async () => {
              // First, activate premium access by calling payment success endpoint
              try {
                console.log("🎯 AUTO-PREMIUM: Activating premium access after successful payment...");
                console.log("🎯 AUTO-PREMIUM: PaymentIntentId state value:", paymentIntentId);
                console.log("🎯 AUTO-PREMIUM: ClientSecret state value:", clientSecret);
                
                // If paymentIntentId is missing, try to extract from clientSecret
                let finalPaymentIntentId = paymentIntentId;
                if (!finalPaymentIntentId && clientSecret) {
                  finalPaymentIntentId = clientSecret.split('_secret_')[0];
                  console.log("🎯 AUTO-PREMIUM: Extracted payment intent ID from client secret:", finalPaymentIntentId);
                }
                
                if (!finalPaymentIntentId) {
                  console.error("❌ AUTO-PREMIUM: No payment intent ID available for activation");
                  throw new Error("Payment intent ID not available");
                }
                
                const response = await fetch("/api/subscription/payment-success", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                  body: JSON.stringify({
                    paymentIntentId: finalPaymentIntentId // Use the final payment intent ID
                  }),
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log("✅ AUTO-PREMIUM: Premium access activated successfully", result);
                  
                  // Invalidate queries to update premium status immediately
                  queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                  
                  // Show success toast
                  toast({
                    title: "Premium Activated!",
                    description: "Your premium access has been successfully activated. Welcome to CHARLEY Premium!",
                  });
                  
                  // Trigger fireworks celebration for successful premium activation
                  console.log("🎆 AUTO-PREMIUM: Triggering fireworks celebration for premium activation");
                  // Store celebration trigger in localStorage so Settings page can pick it up
                  localStorage.setItem('charley_trigger_celebration', 'true');
                } else {
                  const errorResult = await response.json();
                  console.warn("⚠️ AUTO-PREMIUM: Failed to activate premium access:", errorResult);
                  console.warn("⚠️ AUTO-PREMIUM: Response status:", response.status);
                  console.warn("⚠️ AUTO-PREMIUM: Payment intent ID used:", finalPaymentIntentId);
                  
                  // Show warning toast but continue
                  toast({
                    title: "Premium Activation Issue",
                    description: `Premium access couldn't be automatically activated: ${errorResult.error || 'Unknown error'}. You can enable it manually in Settings.`,
                    variant: "destructive",
                  });
                }
              } catch (error) {
                console.error("❌ AUTO-PREMIUM: Error activating premium access:", error);
                
                // Show error toast but continue
                toast({
                  title: "Premium Activation Error",
                  description: "There was an error activating premium access. You can enable it manually in Settings.",
                  variant: "destructive",
                });
              }

              // Navigate to settings regardless of premium activation result
              // Capture current page before navigating to Settings
              const validAppPages = ['/home', '/heat', '/suite/network', '/suite/jobs'];
              if (validAppPages.includes(location)) {
                const stack = {
                  originPage: location,
                  timestamp: Date.now(),
                  capturedFrom: 'payment-page'
                };
                localStorage.setItem('settings_navigation_stack', JSON.stringify(stack));
                console.log('[NAV-HELPER] Captured current page for Settings navigation from payment:', stack);
              }
              
              setLocation("/settings?tab=subscription");
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-2xl"
          >
            Continue to App
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// Stable Elements options to prevent re-creation
const elementsOptions = {
  appearance: {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#8b5cf6',
      colorBackground: '#1e293b',
      colorText: '#ffffff',
      colorDanger: '#ef4444',
      borderRadius: '8px',
    },
  },
};

// Main wrapper component that provides Stripe Elements context
export default function PaymentPage() {
  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentPageWithStripe />
    </Elements>
  );
}
