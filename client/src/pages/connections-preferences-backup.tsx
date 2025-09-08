import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, ArrowLeft, Network, Briefcase, Users, Building2, DollarSign, MapPin, Clock, Target, Star, Globe, Save, Settings, Check, X, Sparkles, Heart, AlertTriangle, ChevronDown, GraduationCap, Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { mapToDatabase, mapFromDatabase } from "@/components/preferences/field-mapping";

// Add floating animation styles
const floatingAnimation = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-10px) rotate(1deg); }
    66% { transform: translateY(5px) rotate(-1deg); }
  }
  .animate-float {
    animation: float linear infinite;
  }
`;

// Comprehensive Industry-Expertise-Skills Mapping System
const INDUSTRY_MAPPING = {
  technology: {
    label: "Technology",
    areasOfExpertise: [
      { value: "software_development", label: "Software Development" },
      { value: "data_science", label: "Data Science & Analytics" },
      { value: "cybersecurity", label: "Cybersecurity" },
      { value: "cloud_computing", label: "Cloud Computing" },
      { value: "ai_machine_learning", label: "AI & Machine Learning" },
      { value: "product_management", label: "Product Management" },
      { value: "devops", label: "DevOps & Infrastructure" },
      { value: "mobile_development", label: "Mobile Development" }
    ],
    skills: [
      { value: "python", label: "Python" },
      { value: "javascript", label: "JavaScript" },
      { value: "react", label: "React" },
      { value: "aws", label: "AWS" },
      { value: "docker", label: "Docker" },
      { value: "kubernetes", label: "Kubernetes" },
      { value: "machine_learning", label: "Machine Learning" },
      { value: "data_analysis", label: "Data Analysis" },
      { value: "api_design", label: "API Design" },
      { value: "agile", label: "Agile Methodology" }
    ]
  },
  finance: {
    label: "Finance",
    areasOfExpertise: [
      { value: "investment_banking", label: "Investment Banking" },
      { value: "financial_planning", label: "Financial Planning" },
      { value: "risk_management", label: "Risk Management" },
      { value: "corporate_finance", label: "Corporate Finance" },
      { value: "wealth_management", label: "Wealth Management" },
      { value: "fintech", label: "Financial Technology" },
      { value: "trading", label: "Trading & Markets" },
      { value: "accounting", label: "Accounting" }
    ],
    skills: [
      { value: "financial_modeling", label: "Financial Modeling" },
      { value: "excel", label: "Excel" },
      { value: "bloomberg", label: "Bloomberg Terminal" },
      { value: "valuation", label: "Valuation" },
      { value: "portfolio_management", label: "Portfolio Management" },
      { value: "derivatives", label: "Derivatives" },
      { value: "regulatory_compliance", label: "Regulatory Compliance" },
      { value: "quantitative_analysis", label: "Quantitative Analysis" }
    ]
  },
  healthcare: {
    label: "Healthcare",
    areasOfExpertise: [
      { value: "clinical_research", label: "Clinical Research" },
      { value: "medical_device", label: "Medical Device Development" },
      { value: "pharmaceuticals", label: "Pharmaceuticals" },
      { value: "healthcare_administration", label: "Healthcare Administration" },
      { value: "telemedicine", label: "Telemedicine" },
      { value: "health_informatics", label: "Health Informatics" },
      { value: "public_health", label: "Public Health" },
      { value: "biotechnology", label: "Biotechnology" }
    ],
    skills: [
      { value: "clinical_trials", label: "Clinical Trials" },
      { value: "regulatory_affairs", label: "Regulatory Affairs" },
      { value: "medical_writing", label: "Medical Writing" },
      { value: "biostatistics", label: "Biostatistics" },
      { value: "gcp", label: "Good Clinical Practice" },
      { value: "hipaa", label: "HIPAA Compliance" },
      { value: "electronic_health_records", label: "Electronic Health Records" },
      { value: "healthcare_analytics", label: "Healthcare Analytics" }
    ]
  },
  marketing: {
    label: "Marketing",
    areasOfExpertise: [
      { value: "digital_marketing", label: "Digital Marketing" },
      { value: "content_marketing", label: "Content Marketing" },
      { value: "brand_management", label: "Brand Management" },
      { value: "performance_marketing", label: "Performance Marketing" },
      { value: "social_media", label: "Social Media Marketing" },
      { value: "email_marketing", label: "Email Marketing" },
      { value: "seo_sem", label: "SEO/SEM" },
      { value: "marketing_analytics", label: "Marketing Analytics" }
    ],
    skills: [
      { value: "google_ads", label: "Google Ads" },
      { value: "facebook_ads", label: "Facebook Ads" },
      { value: "analytics", label: "Google Analytics" },
      { value: "hubspot", label: "HubSpot" },
      { value: "salesforce", label: "Salesforce" },
      { value: "copywriting", label: "Copywriting" },
      { value: "a_b_testing", label: "A/B Testing" },
      { value: "conversion_optimization", label: "Conversion Optimization" }
    ]
  },
  consulting: {
    label: "Consulting",
    areasOfExpertise: [
      { value: "strategy_consulting", label: "Strategy Consulting" },
      { value: "management_consulting", label: "Management Consulting" },
      { value: "operations_consulting", label: "Operations Consulting" },
      { value: "technology_consulting", label: "Technology Consulting" },
      { value: "hr_consulting", label: "HR Consulting" },
      { value: "financial_consulting", label: "Financial Consulting" },
      { value: "change_management", label: "Change Management" },
      { value: "business_transformation", label: "Business Transformation" }
    ],
    skills: [
      { value: "problem_solving", label: "Problem Solving" },
      { value: "presentation_skills", label: "Presentation Skills" },
      { value: "stakeholder_management", label: "Stakeholder Management" },
      { value: "project_management", label: "Project Management" },
      { value: "business_analysis", label: "Business Analysis" },
      { value: "process_improvement", label: "Process Improvement" },
      { value: "client_relationship", label: "Client Relationship Management" },
      { value: "strategic_planning", label: "Strategic Planning" }
    ]
  },
  education: {
    label: "Education",
    areasOfExpertise: [
      { value: "curriculum_development", label: "Curriculum Development" },
      { value: "educational_technology", label: "Educational Technology" },
      { value: "learning_design", label: "Learning Design" },
      { value: "student_affairs", label: "Student Affairs" },
      { value: "academic_administration", label: "Academic Administration" },
      { value: "research", label: "Academic Research" },
      { value: "online_learning", label: "Online Learning" },
      { value: "assessment", label: "Assessment & Evaluation" }
    ],
    skills: [
      { value: "instructional_design", label: "Instructional Design" },
      { value: "learning_management_systems", label: "Learning Management Systems" },
      { value: "educational_assessment", label: "Educational Assessment" },
      { value: "classroom_management", label: "Classroom Management" },
      { value: "curriculum_mapping", label: "Curriculum Mapping" },
      { value: "educational_research", label: "Educational Research" },
      { value: "student_support", label: "Student Support" },
      { value: "pedagogical_methods", label: "Pedagogical Methods" }
    ]
  },
  retail: {
    label: "Retail",
    areasOfExpertise: [
      { value: "merchandising", label: "Merchandising" },
      { value: "supply_chain", label: "Supply Chain Management" },
      { value: "e_commerce", label: "E-commerce" },
      { value: "retail_operations", label: "Retail Operations" },
      { value: "customer_experience", label: "Customer Experience" },
      { value: "inventory_management", label: "Inventory Management" },
      { value: "retail_analytics", label: "Retail Analytics" },
      { value: "visual_merchandising", label: "Visual Merchandising" }
    ],
    skills: [
      { value: "pos_systems", label: "POS Systems" },
      { value: "inventory_software", label: "Inventory Software" },
      { value: "customer_service", label: "Customer Service" },
      { value: "sales_techniques", label: "Sales Techniques" },
      { value: "retail_metrics", label: "Retail Metrics" },
      { value: "vendor_management", label: "Vendor Management" },
      { value: "loss_prevention", label: "Loss Prevention" },
      { value: "omnichannel", label: "Omnichannel Strategy" }
    ]
  },
  manufacturing: {
    label: "Manufacturing",
    areasOfExpertise: [
      { value: "production_management", label: "Production Management" },
      { value: "quality_control", label: "Quality Control" },
      { value: "lean_manufacturing", label: "Lean Manufacturing" },
      { value: "supply_chain_ops", label: "Supply Chain Operations" },
      { value: "process_engineering", label: "Process Engineering" },
      { value: "automation", label: "Industrial Automation" },
      { value: "safety_management", label: "Safety Management" },
      { value: "continuous_improvement", label: "Continuous Improvement" }
    ],
    skills: [
      { value: "six_sigma", label: "Six Sigma" },
      { value: "kaizen", label: "Kaizen" },
      { value: "iso_standards", label: "ISO Standards" },
      { value: "plc_programming", label: "PLC Programming" },
      { value: "cad_software", label: "CAD Software" },
      { value: "erp_systems", label: "ERP Systems" },
      { value: "statistical_process_control", label: "Statistical Process Control" },
      { value: "maintenance_planning", label: "Maintenance Planning" }
    ]
  }
};

interface ConnectionsPreferencesData {
  // Mentorship
  mentorshipLookingFor: string[];
  mentorshipExperienceLevel: string[];
  mentorshipIndustries: string[];
  mentorshipAreasOfExpertise: string[];
  mentorshipEducationLevel: string[];
  mentorshipSkills: string[];
  mentorshipTopics: string[];
  mentorshipFormat: string[];
  mentorshipTimeCommitment: string;
  mentorshipGeographic: string;
  mentorshipWeights: Record<string, number>;
  
  // Networking
  networkingPurpose: string[];
  networkingCompanySize: string[];
  networkingSeniority: string[];
  networkingIndustries: string[];
  networkingAreasOfExpertise: string[];
  networkingEducationLevel: string[];
  networkingSkills: string[];
  networkingFunctionalAreas: string[];
  networkingGeographic: string;
  networkingEventPreference: string[];
  networkingWeights: Record<string, number>;
  
  // Jobs
  jobsTypes: string[];
  jobsSalaryRange: { min: number; max: number; currency: string };
  jobsWorkArrangement: string[];
  jobsCompanySize: string[];
  jobsIndustries: string[];
  jobsEducationLevel: string[];
  jobsSkills: string[];
  jobsExperienceLevel: string[];
  jobsFunctionalAreas: string[];
  jobsGeographic: string;
  jobsWeights: Record<string, number>;
  
  // Global
  dealBreakers: string[];
  preferenceProfiles: Record<string, any>[];
}

// Animation variants for all components
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Helper function to check if an accordion section has selections
const hasSelections = (preferences: any, field: string) => {
  const value = preferences[field];
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return value !== null && value !== undefined && value !== '';
};

// Individual tab completion calculation functions
const calculateJobsCompletion = (preferences: any) => {
  const jobsFields = [
    'jobsTypes', 'jobsSalaryRange', 'jobsWorkArrangement', 'jobsIndustries', 
    'jobsEducationLevel', 'jobsSkills', 'jobsExperienceLevel', 'jobsGeographic', 
    'jobsWeights'
  ];
  
  const completedFields = jobsFields.filter(field => hasSelections(preferences, field)).length;
  return Math.round((completedFields / jobsFields.length) * 100);
};

const calculateMentorshipCompletion = (preferences: any) => {
  const mentorshipFields = [
    'mentorshipLookingFor', 'mentorshipExperienceLevel', 'mentorshipIndustries',
    'mentorshipAreasOfExpertise', 'mentorshipEducationLevel', 'mentorshipSkills',
    'mentorshipGeographic', 'mentorshipWeights'
  ];
  
  const completedFields = mentorshipFields.filter(field => hasSelections(preferences, field)).length;
  return Math.round((completedFields / mentorshipFields.length) * 100);
};

const calculateNetworkingCompletion = (preferences: any) => {
  const networkingFields = [
    'networkingPurpose', 'networkingCompanySize', 'networkingSeniority',
    'networkingIndustries', 'networkingAreasOfExpertise', 'networkingEducationLevel',
    'networkingSkills', 'networkingGeographic', 'networkingWeights'
  ];
  
  const completedFields = networkingFields.filter(field => hasSelections(preferences, field)).length;
  return Math.round((completedFields / networkingFields.length) * 100);
};

const calculateGlobalCompletion = (preferences: any) => {
  const globalFields = ['dealBreakers'];
  
  const completedFields = globalFields.filter(field => hasSelections(preferences, field)).length;
  return Math.round((completedFields / globalFields.length) * 100);
};

// Get health bar color based on completion percentage
const getHealthBarColor = (percent: number): string => {
  if (percent < 20) return "#cc0000"; // deep red
  if (percent < 40) return "#ff4500"; // red-orange
  if (percent < 60) return "#ffc107"; // yellow
  if (percent < 80) return "#90ee90"; // light green
  if (percent < 100) return "#32cd32"; // lime green
  return "#006400"; // deep green
};

export default function ConnectionsPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  // Initialize activeTab with saved SUITE discover tab preference for seamless navigation
  const [activeTab, setActiveTab] = useState<"mentorship" | "networking" | "jobs" | "global">(() => {
    // First check URL parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['jobs', 'mentorship', 'networking', 'global'].includes(tabParam)) {
        return tabParam as "mentorship" | "networking" | "jobs" | "global";
      }
    } catch (error) {
      console.warn("Failed to parse URL parameters:", error);
    }

    // Check for saved SUITE discover tab preference and map to connections preferences
    try {
      const savedSuiteTab = localStorage.getItem(`suite_network_last_tab_${user?.id}`);
      if (savedSuiteTab) {
        // Map SUITE discover tab names to connections preferences tab names
        const tabMapping: Record<string, "mentorship" | "networking" | "jobs" | "global"> = {
          'job': 'jobs',
          'mentorship': 'mentorship', 
          'networking': 'networking'
        };
        const mappedTab = tabMapping[savedSuiteTab];
        if (mappedTab) {
          console.log(`[Connections Preferences] Synced tab from SUITE discover: ${savedSuiteTab} -> ${mappedTab}`);
          return mappedTab;
        }
      }
    } catch (error) {
      console.warn("Failed to sync tab from SUITE discover:", error);
    }

    // Default to jobs
    return "jobs";
  });

  // Theme configurations for each tab
  const themeConfig = {
    jobs: {
      bgGradient: 'from-slate-900 via-blue-900 to-slate-900',
      orb1: 'from-blue-500 to-cyan-500',
      orb2: 'from-blue-600 to-indigo-500',
      orb3: 'from-cyan-500 to-blue-500',
      spinner: 'border-t-cyan-400',
      text: 'from-cyan-400 to-blue-400'
    },
    mentorship: {
      bgGradient: 'from-slate-900 via-purple-900 to-slate-900',
      orb1: 'from-purple-500 to-pink-500',
      orb2: 'from-violet-500 to-purple-500',
      orb3: 'from-pink-500 to-purple-500',
      spinner: 'border-t-purple-400',
      text: 'from-purple-400 to-pink-400'
    },
    networking: {
      bgGradient: 'from-slate-900 via-emerald-900 to-slate-900',
      orb1: 'from-emerald-500 to-teal-500',
      orb2: 'from-green-500 to-emerald-500',
      orb3: 'from-teal-500 to-green-500',
      spinner: 'border-t-emerald-400',
      text: 'from-emerald-400 to-teal-400'
    },
    global: {
      bgGradient: 'from-slate-900 via-pink-900 to-slate-900',
      orb1: 'from-pink-500 to-rose-500',
      orb2: 'from-rose-500 to-pink-500',
      orb3: 'from-fuchsia-500 to-pink-500',
      spinner: 'border-t-pink-400',
      text: 'from-pink-400 to-rose-400'
    }
  };
  
  const currentTheme = themeConfig[activeTab];

  // PROFILE DETECTION SYSTEM - Modal state for missing profiles
  const [showProfileNeededModal, setShowProfileNeededModal] = useState(false);
  const [profileNeededType, setProfileNeededType] = useState<"jobs" | "mentorship" | "networking" | null>(null);

  // Profile detection queries to check for active profiles in each section
  const { data: jobProfile } = useQuery({
    queryKey: ["/api/suite/job-profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/job-profile");
        return await response.json();
      } catch (error) {
        return null; // Return null if no profile exists
      }
    },
    enabled: !!user,
  });

  const { data: mentorshipProfiles } = useQuery({
    queryKey: ["/api/suite/mentorship-profiles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/mentorship-profiles");
        return await response.json();
      } catch (error) {
        return []; // Return empty array if no profiles exist
      }
    },
    enabled: !!user,
  });

  const { data: networkingProfile } = useQuery({
    queryKey: ["/api/suite/networking-profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/networking-profile");
        return await response.json();
      } catch (error) {
        return null; // Return null if no profile exists
      }
    },
    enabled: !!user,
  });

  const { data: profileSettings } = useQuery({
    queryKey: ["/api/suite/profile-settings"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/profile-settings");
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!user,
  });

  // Profile detection function - returns true if user has an active profile for the section
  const hasActiveProfile = (sectionType: "jobs" | "mentorship" | "networking"): boolean => {
    switch (sectionType) {
      case "jobs":
        return !!(jobProfile && Object.keys(jobProfile).length > 0);
      case "mentorship":
        return !!(mentorshipProfiles && mentorshipProfiles.length > 0);
      case "networking":
        return !!(networkingProfile && profileSettings?.networkingProfileActive);
      default:
        return false;
    }
  };

  // Handle profile creation redirect
  const handleCreateProfile = () => {
    if (!profileNeededType) return;
    
    setShowProfileNeededModal(false);
    
    // Navigate to SUITE Profile page with the appropriate URL parameter to auto-open the dialog
    const sectionParam = profileNeededType === "jobs" ? "openJob" : 
                        profileNeededType === "mentorship" ? "openMentorship" : 
                        "openNetworking";
    
    setLocation(`/profile?${sectionParam}=true`);
    console.log(`[Connections Preferences] Redirecting to profile creation for ${profileNeededType}`);
  };

  // Enhanced tab click handler with profile detection
  const handleTabClick = (newTab: "mentorship" | "networking" | "jobs" | "global") => {
    // Global tab doesn't require profile detection
    if (newTab === "global") {
      setActiveTab(newTab);
      syncTabToSuiteDiscover(newTab);
      return;
    }

    // Check if user has active profile for the section
    const hasProfile = hasActiveProfile(newTab);
    
    if (!hasProfile) {
      // Show modal dialog for missing profile
      setProfileNeededType(newTab);
      setShowProfileNeededModal(true);
      console.log(`[Connections Preferences] Profile needed for ${newTab} section - showing modal dialog`);
      return;
    }

    // User has active profile, proceed with tab change
    setActiveTab(newTab);
    syncTabToSuiteDiscover(newTab);
  };

  // Helper function to sync tab changes back to SUITE discover
  const syncTabToSuiteDiscover = (newTab: "mentorship" | "networking" | "jobs" | "global") => {
    try {
      const reverseTabMapping: Record<string, string> = {
        'jobs': 'job',
        'mentorship': 'mentorship',
        'networking': 'networking'
      };
      const suiteTab = reverseTabMapping[newTab];
      if (suiteTab && user?.id) {
        localStorage.setItem(`suite_network_last_tab_${user.id}`, suiteTab);
        console.log(`[Connections Preferences] Synced tab to SUITE discover: ${newTab} -> ${suiteTab}`);
      }
    } catch (error) {
      console.warn("Failed to sync tab to SUITE discover:", error);
    }
  };



  const handleBack = () => {
    window.history.back();
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const contentVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } }
  };

  const slideInRight = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  const defaultPreferences: ConnectionsPreferencesData = {
    // Mentorship defaults
    mentorshipLookingFor: [],
    mentorshipExperienceLevel: [],
    mentorshipIndustries: [],
    mentorshipAreasOfExpertise: [],
    mentorshipEducationLevel: [],
    mentorshipSkills: [],
    mentorshipTopics: [],
    mentorshipFormat: [],
    mentorshipTimeCommitment: "",
    mentorshipGeographic: "",
    mentorshipWeights: {
      experience: 3,
      industry: 3,
      location: 2,
      availability: 4,
      compatibility: 5
    },
    
    // Networking defaults
    networkingPurpose: [],
    networkingCompanySize: [],
    networkingSeniority: [],
    networkingIndustries: [],
    networkingAreasOfExpertise: [],
    networkingEducationLevel: [],
    networkingSkills: [],
    networkingFunctionalAreas: [],
    networkingGeographic: "",
    networkingEventPreference: [],
    networkingWeights: {
      industry: 4,
      seniority: 3,
      company: 2,
      location: 3,
      purpose: 5
    },
    
    // Jobs defaults
    jobsTypes: [],
    jobsSalaryRange: { min: 50000, max: 150000, currency: "USD" },
    jobsWorkArrangement: [],
    jobsCompanySize: [],
    jobsIndustries: [],
    jobsEducationLevel: [],
    jobsSkills: [],
    jobsExperienceLevel: [],
    jobsFunctionalAreas: [],
    jobsGeographic: "",
    jobsWeights: {
      salary: 4,
      location: 3,
      company: 3,
      role: 5,
      benefits: 3
    },
    
    // Global defaults
    dealBreakers: [],
    preferenceProfiles: []
  };

  const [preferences, setPreferences] = useState<ConnectionsPreferencesData>(defaultPreferences);

  // Fetch existing preferences
  const { data: fetchedPreferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['/api/connections/preferences'],
    enabled: !!user?.id
  });

  // Update preferences when data is fetched
  useEffect(() => {
    if (fetchedPreferences && typeof fetchedPreferences === 'object') {
      const prefs = fetchedPreferences as any;
      console.log('Raw fetched preferences:', prefs);
      console.log('jobsSalaryRange from DB:', prefs.jobsSalaryRange, typeof prefs.jobsSalaryRange);
      console.log('CRITICAL DEBUG: jobsEducationLevel from DB:', prefs.jobsEducationLevel, typeof prefs.jobsEducationLevel);
      console.log('CRITICAL DEBUG: jobs_education_level from DB:', prefs.jobs_education_level, typeof prefs.jobs_education_level);
      // Parse weight objects safely from database
      const parseMentorshipWeights = () => {
        if (!prefs.mentorshipWeights) return defaultPreferences.mentorshipWeights;
        try {
          if (typeof prefs.mentorshipWeights === 'string') {
            return { ...defaultPreferences.mentorshipWeights, ...JSON.parse(prefs.mentorshipWeights) };
          }
          if (typeof prefs.mentorshipWeights === 'object') {
            // Only copy known weight properties to avoid enumeration issues
            const knownWeights: any = {};
            const allowedWeights = Object.keys(defaultPreferences.mentorshipWeights);
            allowedWeights.forEach(key => {
              if ((prefs.mentorshipWeights as any)[key] !== undefined) {
                knownWeights[key] = (prefs.mentorshipWeights as any)[key];
              }
            });
            return { ...defaultPreferences.mentorshipWeights, ...knownWeights };
          }
          return defaultPreferences.mentorshipWeights;
        } catch {
          return defaultPreferences.mentorshipWeights;
        }
      };

      const parseNetworkingWeights = () => {
        if (!prefs.networkingWeights) return defaultPreferences.networkingWeights;
        try {
          if (typeof prefs.networkingWeights === 'string') {
            return { ...defaultPreferences.networkingWeights, ...JSON.parse(prefs.networkingWeights) };
          }
          if (typeof prefs.networkingWeights === 'object') {
            const knownWeights: any = {};
            const allowedWeights = Object.keys(defaultPreferences.networkingWeights);
            allowedWeights.forEach(key => {
              if ((prefs.networkingWeights as any)[key] !== undefined) {
                knownWeights[key] = (prefs.networkingWeights as any)[key];
              }
            });
            return { ...defaultPreferences.networkingWeights, ...knownWeights };
          }
          return defaultPreferences.networkingWeights;
        } catch {
          return defaultPreferences.networkingWeights;
        }
      };

      const parseJobsWeights = () => {
        if (!prefs.jobsWeights) return defaultPreferences.jobsWeights;
        try {
          if (typeof prefs.jobsWeights === 'string') {
            return { ...defaultPreferences.jobsWeights, ...JSON.parse(prefs.jobsWeights) };
          }
          if (typeof prefs.jobsWeights === 'object') {
            const knownWeights: any = {};
            const allowedWeights = Object.keys(defaultPreferences.jobsWeights);
            allowedWeights.forEach(key => {
              if ((prefs.jobsWeights as any)[key] !== undefined) {
                knownWeights[key] = (prefs.jobsWeights as any)[key];
              }
            });
            return { ...defaultPreferences.jobsWeights, ...knownWeights };
          }
          return defaultPreferences.jobsWeights;
        } catch {
          return defaultPreferences.jobsWeights;
        }
      };

      // Parse array fields safely
      const parseArrayField = (fieldValue: any) => {
        if (!fieldValue) return [];
        if (Array.isArray(fieldValue)) return fieldValue;
        if (typeof fieldValue === 'string') {
          try {
            return JSON.parse(fieldValue);
          } catch {
            return [];
          }
        }
        return [];
      };

      const parsedJobsSalaryRange = parseArrayField(prefs.jobsSalaryRange);
      console.log('Parsed jobsSalaryRange:', parsedJobsSalaryRange);

      setPreferences(prevPreferences => ({
        ...defaultPreferences,
        ...prefs,
        // Parse array fields
        jobsSalaryRange: parsedJobsSalaryRange,
        jobsWorkArrangement: parseArrayField(prefs.jobsWorkArrangement),
        jobsExperienceLevel: parseArrayField(prefs.jobsExperienceLevel),
        jobsTypes: parseArrayField(prefs.jobsTypes),
        // Use safe weight parsing
        mentorshipWeights: parseMentorshipWeights(),
        networkingWeights: parseNetworkingWeights(),
        jobsWeights: parseJobsWeights()
      }));
    }
  }, [fetchedPreferences]);

  // Save preferences mutation with field mapping fix
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: ConnectionsPreferencesData) => {
      // CRITICAL FIX: Map camelCase frontend fields to snake_case database fields
      const mappedData = mapToDatabase(data);
      console.log('Field mapping applied:', { original: data, mapped: mappedData });
      
      return apiRequest('/api/connections/preferences', {
        method: 'POST',
        data: mappedData
      });
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Your connection preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/preferences'] });
    },
    onError: (error: any) => {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        description: "There was an error saving your preferences. Please try again.",
        variant: "destructive",
      });
    }
  });



  const updateArrayField = (category: string, field: string, value: string) => {
    console.log('updateArrayField called:', {category, field, value});
    setPreferences(prev => {
      // Capitalize first letter of field to match camelCase convention
      const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
      const fieldKey = `${category}${capitalizedField}` as keyof ConnectionsPreferencesData;
      console.log('Previous preferences for category:', category, 'field:', fieldKey, prev[fieldKey]);
      const currentArray = Array.isArray(prev[fieldKey]) ? prev[fieldKey] as string[] : [];
      
      let newArray;
      if (currentArray.includes(value)) {
        newArray = currentArray.filter((item: string) => item !== value);
        console.log('Removing value:', value, 'New array:', newArray);
      } else {
        newArray = [...currentArray, value];
        console.log('Adding value:', value, 'New array:', newArray);
      }
      
      const updatedPreferences = {
        ...prev,
        [fieldKey]: newArray
      } as ConnectionsPreferencesData;
      
      console.log('Updated preferences:', updatedPreferences);
      
      // Auto-save immediately for testing
      console.log('Auto-saving preferences after selection change');
      savePreferencesMutation.mutate(updatedPreferences);
      
      return updatedPreferences;
    });
  };

  const updateSingleField = (category: string, field: string, value: any) => {
    setPreferences(prev => {
      // Capitalize first letter of field to match camelCase convention
      const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
      const fieldKey = `${category}${capitalizedField}`;
      const updatedPreferences = {
        ...prev,
        [fieldKey]: value
      } as ConnectionsPreferencesData;
      
      console.log('🔧 GEOGRAPHIC DEBUG - updateSingleField called:', {
        category,
        field,
        value,
        capitalizedField,
        fieldKey,
        newFieldValue: updatedPreferences[fieldKey]
      });
      console.log('🔧 GEOGRAPHIC DEBUG - Full updated preferences:', updatedPreferences);
      savePreferencesMutation.mutate(updatedPreferences);
      
      return updatedPreferences;
    });
  };

  const updateWeight = (category: string, field: string, value: number) => {
    setPreferences(prev => {
      const newPreferences = { ...prev } as any;
      const weightsKey = `${category}Weights`;
      const currentWeights = newPreferences[weightsKey] || {};
      
      newPreferences[weightsKey] = {
        ...currentWeights,
        [field]: value
      };
      
      console.log('updateWeight - Auto-saving preferences:', newPreferences);
      savePreferencesMutation.mutate(newPreferences);
      
      return newPreferences as ConnectionsPreferencesData;
    });
  };

  // Show loading state when fetching preferences
  if (isLoadingPreferences) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: floatingAnimation }} />
        <motion.div 
          className={`min-h-screen flex flex-col bg-gradient-to-br ${currentTheme.bgGradient} relative overflow-hidden`}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className={`absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r ${currentTheme.orb1} rounded-full mix-blend-multiply filter blur-xl animate-pulse`}></div>
            <div className={`absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r ${currentTheme.orb2} rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000`}></div>
            <div className={`absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-r ${currentTheme.orb3} rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000`}></div>
          </div>
          
          <div className="flex items-center justify-center min-h-[600px] relative z-10">
            <motion.div 
              className="flex flex-col items-center space-y-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative">
                <div className={`animate-spin w-12 h-12 rounded-full border-4 border-white/20 ${currentTheme.spinner}`}></div>
                <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentTheme.orb1}/20 blur-md animate-pulse`}></div>
              </div>
              <motion.p 
                className={`text-lg text-white font-medium bg-gradient-to-r ${currentTheme.text} bg-clip-text text-transparent`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Initializing neural preferences...
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {/* Inject floating animation CSS */}
      <style dangerouslySetInnerHTML={{ __html: floatingAnimation }} />
      
      <motion.div 
        className={`min-h-screen flex flex-col bg-gradient-to-br ${currentTheme.bgGradient} relative overflow-hidden`}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
      {/* Advanced Cyberpunk Background Layer */}
      <div className="absolute inset-0 opacity-30">
        {/* Multi-layered orbs with enhanced effects */}
        <div className={`absolute top-1/6 left-1/5 w-96 h-96 bg-gradient-to-r ${currentTheme.orb1} rounded-full mix-blend-screen filter blur-2xl animate-pulse`}
             style={{ filter: 'blur(40px) drop-shadow(0 0 40px currentColor)' }}></div>
        <div className={`absolute top-1/3 right-1/6 w-80 h-80 bg-gradient-to-r ${currentTheme.orb2} rounded-full mix-blend-screen filter blur-2xl animate-pulse delay-1000`}
             style={{ filter: 'blur(35px) drop-shadow(0 0 50px currentColor)' }}></div>
        <div className={`absolute bottom-1/4 left-1/2 w-72 h-72 bg-gradient-to-r ${currentTheme.orb3} rounded-full mix-blend-screen filter blur-2xl animate-pulse delay-2000`}
             style={{ filter: 'blur(30px) drop-shadow(0 0 60px currentColor)' }}></div>
        <div className={`absolute bottom-1/6 right-1/3 w-64 h-64 bg-gradient-to-r ${currentTheme.orb1} rounded-full mix-blend-screen filter blur-xl animate-pulse delay-3000`}
             style={{ filter: 'blur(25px) drop-shadow(0 0 35px currentColor)' }}></div>
      </div>
      
      {/* Neural Network Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1000 1000">
          <defs>
            <pattern id="neural-net" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1.5" fill="currentColor" className="text-white" opacity="0.6"/>
              <line x1="25" y1="25" x2="50" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
              <line x1="25" y1="25" x2="50" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
              <line x1="25" y1="25" x2="0" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-net)" className="text-white"/>
        </svg>
      </div>
      
      {/* Enhanced Floating Particles with Motion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full opacity-40"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(255,255,255,0.8)`,
            }}
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              opacity: [0.1, Math.random() * 0.6 + 0.2, 0.1],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
      
      {/* Cyberpunk Scanning Lines */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none"
        style={{ height: '3px' }}
        animate={{
          y: ['0vh', '100vh'],
          opacity: [0, 1, 0.8, 1, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Holographic Corner Brackets */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-400/40 rounded-tl-md opacity-60"></div>
        <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-purple-400/40 rounded-tr-md opacity-60"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-emerald-400/40 rounded-bl-md opacity-60"></div>
        <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-pink-400/40 rounded-br-md opacity-60"></div>
      </div>

      {/* Advanced Cyberpunk Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-cyan-400/20 text-white flex-shrink-0 relative overflow-hidden"
           style={{
             background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,20,40,0.9) 50%, rgba(0,0,0,0.8) 100%)',
             boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
           }}>
        {/* Header glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/10 to-pink-500/5"></div>
        
        <div className="px-4 py-3 flex items-center relative z-10">
          <motion.button 
            className="mr-3 p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-400/30 hover:to-purple-400/30 backdrop-blur-md border border-cyan-400/30 text-white transition-all duration-300 shadow-lg hover:shadow-cyan-400/20"
            onClick={() => window.history.back()}
            aria-label="Go back"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 20px rgba(34, 211, 238, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(147, 51, 234, 0.2))',
              borderImage: 'linear-gradient(45deg, #22d3ee, #9333ea) 1'
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </motion.button>
          <motion.h2 
            className="font-bold text-xl tracking-tight relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            style={{
              background: 'linear-gradient(90deg, #22d3ee 0%, #a855f7 30%, #ec4899 60%, #f59e0b 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 3s ease-in-out infinite'
            }}
          >
            Connection Preferences
          </motion.h2>
        </div>
      </div>
      
      {/* Content area */}
      <div className="p-3 flex-grow flex flex-col">
        <motion.div 
          variants={contentVariants}
          className="relative"
        >
          <div className="space-y-3">

            {/* Advanced Cyberpunk Tab Navigation */}
            <motion.div 
              className="grid grid-cols-4 gap-2 p-3 relative backdrop-blur-xl rounded-2xl border shadow-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(20,20,40,0.8) 50%, rgba(0,0,0,0.6) 100%)',
                borderImage: 'linear-gradient(45deg, rgba(34, 211, 238, 0.3), rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3)) 1',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(34, 211, 238, 0.1)'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
              </div>
              {[
                { id: "jobs", label: "Jobs", icon: Briefcase, color: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/50" },
                { id: "mentorship", label: "Mentorship", icon: Users, color: "from-violet-500 to-purple-500", shadow: "shadow-purple-500/50" },
                { id: "networking", label: "Networking", icon: Network, color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/50" },
                { id: "global", label: "Global", icon: Globe, color: "from-pink-500 to-rose-500", shadow: "shadow-pink-500/50" }
              ].map((tab, index) => (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    const newTab = tab.id as "mentorship" | "networking" | "jobs" | "global";
                    handleTabClick(newTab);
                  }}
                  className={`
                    relative flex flex-col items-center py-4 px-3 rounded-2xl text-xs font-medium transition-all duration-500 group overflow-hidden
                    ${activeTab === tab.id 
                      ? `text-white transform scale-105 z-20` 
                      : 'text-gray-400 hover:text-white hover:scale-102 z-10'
                    }
                  `}
                  style={activeTab === tab.id ? {
                    background: `linear-gradient(135deg, ${tab.color.includes('blue') ? 'rgba(59, 130, 246, 0.8)' : 
                                                tab.color.includes('violet') ? 'rgba(139, 92, 246, 0.8)' :
                                                tab.color.includes('emerald') ? 'rgba(16, 185, 129, 0.8)' :
                                                'rgba(236, 72, 153, 0.8)'} 0%, ${tab.color.includes('blue') ? 'rgba(34, 211, 238, 0.6)' :
                                                tab.color.includes('violet') ? 'rgba(168, 85, 247, 0.6)' :
                                                tab.color.includes('emerald') ? 'rgba(20, 184, 166, 0.6)' :
                                                'rgba(244, 63, 94, 0.6)'} 100%)`,
                    boxShadow: `0 8px 32px ${tab.color.includes('blue') ? 'rgba(59, 130, 246, 0.3)' :
                                           tab.color.includes('violet') ? 'rgba(139, 92, 246, 0.3)' :
                                           tab.color.includes('emerald') ? 'rgba(16, 185, 129, 0.3)' :
                                           'rgba(236, 72, 153, 0.3)'}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    border: '1px solid rgba(255,255,255,0.3)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(30,30,60,0.6) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                  whileHover={{ 
                    scale: 1.08,
                    boxShadow: `0 12px 40px ${tab.color.includes('blue') ? 'rgba(59, 130, 246, 0.4)' :
                                              tab.color.includes('violet') ? 'rgba(139, 92, 246, 0.4)' :
                                              tab.color.includes('emerald') ? 'rgba(16, 185, 129, 0.4)' :
                                              'rgba(236, 72, 153, 0.4)'}`
                  }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                >
                  {/* Enhanced glow effect */}
                  {activeTab === tab.id && (
                    <>
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tab.color} opacity-30 blur-xl`} />
                      <motion.div 
                        className="absolute inset-0 rounded-2xl bg-white opacity-10"
                        animate={{ opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </>
                  )}
                  
                  {/* Holographic border effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <tab.icon className="h-6 w-6 mb-2 relative z-10 drop-shadow-lg" />
                  <span className="text-[11px] relative z-10 font-bold tracking-wide">{tab.label}</span>
                  
                  {/* Active indicator with animation */}
                  {activeTab === tab.id && (
                    <motion.div 
                      className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-white rounded-full"
                      layoutId="activeTabIndicator"
                      style={{
                        boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                      }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* Individual Completion Health Bar System - Positioned between menu tabs and micro sections */}
            {(() => {
              const currentCompletion = 
                activeTab === 'jobs' ? calculateJobsCompletion(preferences) :
                activeTab === 'mentorship' ? calculateMentorshipCompletion(preferences) :
                activeTab === 'networking' ? calculateNetworkingCompletion(preferences) :
                calculateGlobalCompletion(preferences);

              const tabConfig = {
                jobs: { 
                  label: 'Jobs Preferences', 
                  color: 'from-blue-500 to-cyan-500',
                  shadow: 'rgba(59, 130, 246, 0.3)',
                  missingFields: [
                    ...(hasSelections(preferences, 'jobsTypes') ? [] : ['Job Types']),
                    ...(hasSelections(preferences, 'jobsSalaryRange') ? [] : ['Salary Range']),
                    ...(hasSelections(preferences, 'jobsWorkArrangement') ? [] : ['Work Arrangement']),
                    ...(hasSelections(preferences, 'jobsIndustries') ? [] : ['Industry']),
                    ...(hasSelections(preferences, 'jobsEducationLevel') ? [] : ['Education Level']),
                    ...(hasSelections(preferences, 'jobsSkills') ? [] : ['Skills']),
                    ...(hasSelections(preferences, 'jobsExperienceLevel') ? [] : ['Experience Level']),
                    ...(hasSelections(preferences, 'jobsGeographic') ? [] : ['Geographic Location']),
                    ...(hasSelections(preferences, 'jobsWeights') ? [] : ['Matching Priorities'])
                  ]
                },
                mentorship: { 
                  label: 'Mentorship Preferences', 
                  color: 'from-violet-500 to-purple-500',
                  shadow: 'rgba(139, 92, 246, 0.3)',
                  missingFields: [
                    ...(hasSelections(preferences, 'mentorshipLookingFor') ? [] : ['What You\'re Looking For']),
                    ...(hasSelections(preferences, 'mentorshipExperienceLevel') ? [] : ['Experience Level']),
                    ...(hasSelections(preferences, 'mentorshipIndustries') ? [] : ['Industry']),
                    ...(hasSelections(preferences, 'mentorshipAreasOfExpertise') ? [] : ['Areas of Expertise']),
                    ...(hasSelections(preferences, 'mentorshipEducationLevel') ? [] : ['Education Level']),
                    ...(hasSelections(preferences, 'mentorshipSkills') ? [] : ['Skills']),
                    ...(hasSelections(preferences, 'mentorshipGeographic') ? [] : ['Geographic Preference']),
                    ...(hasSelections(preferences, 'mentorshipWeights') ? [] : ['Matching Priorities'])
                  ]
                },
                networking: { 
                  label: 'Networking Preferences', 
                  color: 'from-emerald-500 to-teal-500',
                  shadow: 'rgba(16, 185, 129, 0.3)',
                  missingFields: [
                    ...(hasSelections(preferences, 'networkingPurpose') ? [] : ['Networking Purpose']),
                    ...(hasSelections(preferences, 'networkingCompanySize') ? [] : ['Company Size']),
                    ...(hasSelections(preferences, 'networkingSeniority') ? [] : ['Seniority Level']),
                    ...(hasSelections(preferences, 'networkingIndustries') ? [] : ['Industry']),
                    ...(hasSelections(preferences, 'networkingAreasOfExpertise') ? [] : ['Areas of Expertise']),
                    ...(hasSelections(preferences, 'networkingEducationLevel') ? [] : ['Education Level']),
                    ...(hasSelections(preferences, 'networkingSkills') ? [] : ['Skills']),
                    ...(hasSelections(preferences, 'networkingGeographic') ? [] : ['Geographic Preference']),
                    ...(hasSelections(preferences, 'networkingWeights') ? [] : ['Matching Priorities'])
                  ]
                },
                global: { 
                  label: 'Global Preferences', 
                  color: 'from-pink-500 to-rose-500',
                  shadow: 'rgba(236, 72, 153, 0.3)',
                  missingFields: [
                    ...(hasSelections(preferences, 'dealBreakers') ? [] : ['Deal Breakers'])
                  ]
                }
              };

              const config = tabConfig[activeTab as keyof typeof tabConfig];

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="mb-4 p-4 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(20,20,40,0.5) 50%, rgba(0,0,0,0.3) 100%)',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px ${config.shadow}`
                  }}
                >
                  {/* Health Bar Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white tracking-wide font-['Space_Grotesk']">
                      Complete these fields for better matches
                    </h3>
                    <span className="text-sm font-bold text-white">
                      {currentCompletion}%
                    </span>
                  </div>

                  {/* Animated Health Bar */}
                  <div className="relative h-4 w-full bg-gray-700/50 rounded-full border border-gray-600/50 overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${currentCompletion}%` }}
                      transition={{
                        duration: 1.2,
                        ease: "easeOut",
                        delay: 0.3,
                      }}
                      className="h-full rounded-full transition-all duration-500 ease-out relative"
                      style={{
                        background: `linear-gradient(90deg, ${getHealthBarColor(currentCompletion)}, ${getHealthBarColor(Math.min(currentCompletion + 20, 100))})`,
                        boxShadow: currentCompletion > 0 ? `0 0 15px ${getHealthBarColor(currentCompletion)}` : "none",
                      }}
                    >
                      {/* Light reflection effect */}
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full"></div>
                      
                      {/* Glowing animation */}
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-white/20"
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                  </div>

                  {/* Missing Fields Badges - Only show when below 100% completion */}
                  {currentCompletion < 100 && config.missingFields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {config.missingFields.slice(0, 8).map((field, index) => (
                        <motion.span
                          key={field}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.0 + index * 0.1, duration: 0.3 }}
                          onClick={() => {
                            // Find and click accordion by field name
                            setTimeout(() => {
                              // Look for button with matching text
                              const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
                              const targetButton = buttons.find(button => {
                                const text = button.textContent?.trim() || '';
                                return text === field;
                              });
                              
                              if (targetButton) {
                                // Check if expanded
                                const isExpanded = targetButton.getAttribute('aria-expanded') === 'true';
                                
                                if (!isExpanded) {
                                  targetButton.click();
                                }
                                
                                // Scroll to accordion section
                                setTimeout(() => {
                                  const accordionContainer = targetButton.closest('div[class*="bg-white"]') ||
                                                           targetButton.closest('div[class*="backdrop-blur"]') ||
                                                           targetButton.parentElement?.parentElement;
                                  
                                  if (accordionContainer) {
                                    accordionContainer.scrollIntoView({ 
                                      behavior: "smooth", 
                                      block: "center"
                                    });
                                    
                                    // Highlight effect
                                    const element = accordionContainer as HTMLElement;
                                    element.style.transform = 'scale(1.02)';
                                    element.style.boxShadow = `0 0 30px ${
                                      activeTab === 'jobs' ? 'rgba(59, 130, 246, 0.6)' :
                                      activeTab === 'mentorship' ? 'rgba(139, 92, 246, 0.6)' :
                                      activeTab === 'networking' ? 'rgba(16, 185, 129, 0.6)' :
                                      'rgba(236, 72, 153, 0.6)'
                                    }`;
                                    
                                    setTimeout(() => {
                                      element.style.transform = '';
                                      element.style.boxShadow = '';
                                    }, 2000);
                                  }
                                }, isExpanded ? 0 : 300);
                              }
                            }, 100);
                          }}
                          className="px-3 py-1.5 cursor-pointer font-bold text-[10px] rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95"
                          style={{ 
                            fontSize: '9px',
                            background: 'linear-gradient(145deg, #ff6b35, #f7931e)',
                            color: 'white',
                            boxShadow: `
                              0 4px 15px rgba(255, 107, 53, 0.4),
                              inset 0 1px 0 rgba(255, 255, 255, 0.3),
                              inset 0 -1px 0 rgba(0, 0, 0, 0.2),
                              0 0 20px rgba(255, 107, 53, 0.2)
                            `,
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          {field}
                        </motion.span>
                      ))}
                      {config.missingFields.length > 8 && (
                        <span 
                          className="px-3 py-1.5 font-bold text-[10px] rounded-full"
                          style={{ 
                            fontSize: '9px',
                            background: 'linear-gradient(145deg, #6b7280, #4b5563)',
                            color: 'white',
                            boxShadow: `
                              0 4px 15px rgba(107, 114, 128, 0.4),
                              inset 0 1px 0 rgba(255, 255, 255, 0.3),
                              inset 0 -1px 0 rgba(0, 0, 0, 0.2),
                              0 0 20px rgba(107, 114, 128, 0.2)
                            `,
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          +{config.missingFields.length - 8} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Completion Success Message */}
                  {currentCompletion === 100 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2, duration: 0.5 }}
                      className="flex items-center justify-center space-x-2 py-2"
                    >
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">
                        All preferences completed!
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              );
            })()}

            {/* Advanced Tab Content Container */}
            <motion.div
              key={activeTab}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideInRight}
              className="relative overflow-hidden rounded-2xl backdrop-blur-xl border shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(20,20,40,0.6) 30%, rgba(0,0,0,0.4) 100%)',
                borderImage: `linear-gradient(45deg, ${
                  activeTab === 'jobs' ? 'rgba(59, 130, 246, 0.3), rgba(34, 211, 238, 0.3)' :
                  activeTab === 'mentorship' ? 'rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.3)' :
                  activeTab === 'networking' ? 'rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.3)' :
                  'rgba(236, 72, 153, 0.3), rgba(244, 63, 94, 0.3)'
                }) 1`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px ${
                  activeTab === 'jobs' ? 'rgba(59, 130, 246, 0.1)' :
                  activeTab === 'mentorship' ? 'rgba(139, 92, 246, 0.1)' :
                  activeTab === 'networking' ? 'rgba(16, 185, 129, 0.1)' :
                  'rgba(236, 72, 153, 0.1)'
                }`
              }}
            >
              {/* Holographic content overlay */}
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  activeTab === 'jobs' ? 'from-blue-500/10 via-cyan-500/5 to-transparent' :
                  activeTab === 'mentorship' ? 'from-violet-500/10 via-purple-500/5 to-transparent' :
                  activeTab === 'networking' ? 'from-emerald-500/10 via-teal-500/5 to-transparent' :
                  'from-pink-500/10 via-rose-500/5 to-transparent'
                }`}></div>
              </div>
              
              {/* Content wrapper with padding */}
              <div className="relative z-10 p-6">
              {activeTab === "jobs" && (
                <JobsPreferences 
                  preferences={preferences} 
                  updateArrayField={updateArrayField}
                  updateSingleField={updateSingleField}
                  updateWeight={updateWeight}
                />
              )}
              {activeTab === "mentorship" && (
                <MentorshipPreferences 
                  preferences={preferences} 
                  updateArrayField={updateArrayField}
                  updateSingleField={updateSingleField}
                  updateWeight={updateWeight}
                />
              )}
              {activeTab === "networking" && (
                <NetworkingPreferences 
                  preferences={preferences} 
                  updateArrayField={updateArrayField}
                  updateSingleField={updateSingleField}
                  updateWeight={updateWeight}
                />
              )}
              {activeTab === "global" && (
                <GlobalPreferences 
                  preferences={preferences} 
                  updateArrayField={updateArrayField}
                  updateSingleField={updateSingleField}
                  setPreferences={setPreferences}
                  savePreferencesMutation={savePreferencesMutation}
                />
              )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
      
      {/* PROFILE NEEDED MODAL - Triggered when user clicks tabs for sections without active profiles */}
      <Dialog open={showProfileNeededModal} onOpenChange={setShowProfileNeededModal}>
        <DialogContent className="max-w-[85vw] sm:max-w-md mx-auto bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border border-blue-500/30 shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <DialogTitle className="text-lg font-semibold text-white">
                Profile Required
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              To access {profileNeededType === "jobs" ? "Jobs" : profileNeededType === "mentorship" ? "Mentorship" : "Networking"} preferences, 
              you need to create an active {profileNeededType === "jobs" ? "Job" : profileNeededType === "mentorship" ? "Mentorship" : "Networking"} profile first.
            </p>
          </div>

          <DialogFooter className="flex flex-row justify-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowProfileNeededModal(false)}
              className="flex-1 bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreateProfile}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
    </>
  );
}

// Component for rendering multi-select badges
function MultiSelectField({ 
  title, 
  description, 
  icon: Icon, 
  options = [], 
  values, 
  onChange, 
  colorClass = "bg-blue-500 hover:bg-blue-600",
  searchPlaceholder = "Search options...",
  allowCustomInput = false,
  customOptions = []
}: {
  title: string;
  description: string;
  icon: any;
  options?: { value: string; label: string }[];
  values: string[];
  onChange: (value: string) => void;
  colorClass?: string;
  searchPlaceholder?: string;
  allowCustomInput?: boolean;
  customOptions?: { value: string; label: string }[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Ensure values is always an array
  const safeValues = Array.isArray(values) ? values : [];

  // Combine base options with custom options
  const allOptions = [...options, ...customOptions];

  // Filter options based on search term
  const filteredOptions = allOptions.filter((option: any) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomAdd = () => {
    if (customInput.trim()) {
      const customValue = `custom_${customInput.toLowerCase().replace(/\s+/g, '_')}`;
      onChange(customValue);
      setCustomInput("");
      setShowCustomInput(false);
    }
  };

  return (
    <motion.div 
      variants={fadeIn}
      transition={{ duration: 0.2 }}
    >
      {/* Header with title and description */}
      {(title || description) && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-300 leading-relaxed">{title || description}</div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>

        {/* Add Custom Option Button */}
        {allowCustomInput && (
          <div className="space-y-2">
            {!showCustomInput ? (
              <Button
                onClick={() => setShowCustomInput(true)}
                variant="outline"
                size="sm"
                className="w-full bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Option
              </Button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom option..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomAdd()}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  autoFocus
                />
                <Button
                  onClick={handleCustomAdd}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                  disabled={!customInput.trim()}
                >
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomInput("");
                  }}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Option badges grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filteredOptions.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button
              onClick={() => {
                console.log('🔥 CRITICAL DEBUG: CLICKED OPTION:', option.value, 'Current values:', safeValues);
                console.log('🔥 CRITICAL DEBUG: onChange function:', typeof onChange);
                console.log('🔥 CRITICAL DEBUG: About to call onChange...');
                // For single-value fields (like Geographic Location), handle toggle logic here
                if (safeValues.length <= 1) {
                  // Single-value field: toggle the selection
                  const isSelected = safeValues.includes(option.value);
                  console.log('🔥 CRITICAL DEBUG: Single-value field, isSelected:', isSelected, 'will call onChange with:', isSelected ? '' : option.value);
                  onChange(isSelected ? '' : option.value);
                } else {
                  // Multi-value field: use standard toggle logic
                  console.log('🔥 CRITICAL DEBUG: Multi-value field, calling onChange with:', option.value);
                  onChange(option.value);
                }
                console.log('🔥 CRITICAL DEBUG: onChange call completed');
              }}
              className={`
                relative w-full px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-300 flex items-center justify-between group overflow-hidden
                ${safeValues.includes(option.value)
                  ? `bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg border border-white/30`
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
                }
              `}
            >
              {/* Glow effect for selected items */}
              {safeValues.includes(option.value) && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-md" />
              )}
              
              <span className="relative z-10 text-xs truncate">{option.label}</span>
              {safeValues.includes(option.value) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative z-10 ml-1"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* No results message */}
      {searchTerm && filteredOptions.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">
          No options found matching "{searchTerm}"
        </div>
      )}
      
      {/* Display selected items */}
      {safeValues.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Selected ({safeValues.length})</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                console.log('Clear All clicked, current values:', safeValues);
                // Send special clear signal for single-value fields like Geographic Location
                onChange('__CLEAR_ALL__');
              }}
              className="h-5 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 px-2"
            >
              <X className="h-2 w-2 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {safeValues.map((value) => {
              const option = allOptions.find(o => o.value === value);
              const displayLabel = option?.label || (value.startsWith('custom_') ? value.replace('custom_', '').replace(/_/g, ' ') : value);
              return (
                <Badge
                  key={value}
                  className={`text-[10px] px-1.5 py-0.5 h-5 ${colorClass} cursor-pointer flex items-center gap-1`}
                  onClick={() => onChange(value)}
                >
                  <span className="truncate max-w-20">{displayLabel}</span>
                  <X className="h-2 w-2 flex-shrink-0" />
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Single Select Field Component for Geographic Location
function SingleSelectField({ 
  title, 
  description, 
  icon: Icon, 
  options = [], 
  value, 
  onChange, 
  colorClass = "bg-blue-500 hover:bg-blue-600",
  allowCustomInput = false 
}: {
  title: string;
  description: string;
  icon: any;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  colorClass?: string;
  allowCustomInput?: boolean;
}) {
  console.log('🔧 GEOGRAPHIC DEBUG - SingleSelectField rendering:', {
    title,
    description,
    options: options.length,
    value,
    colorClass
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customInputValue, setCustomInputValue] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionSelect = (optionValue: string) => {
    console.log('🔧 GEOGRAPHIC DEBUG - handleOptionSelect called:', {
      optionValue,
      currentValue: value,
      isToggleOff: value === optionValue
    });
    
    if (value === optionValue) {
      // If already selected, deselect it
      console.log('🔧 GEOGRAPHIC DEBUG - Deselecting option');
      onChange('');
    } else {
      // Select the new option
      console.log('🔧 GEOGRAPHIC DEBUG - Selecting new option:', optionValue);
      onChange(optionValue);
    }
    setSearchTerm('');
  };

  const handleCustomInput = () => {
    if (customInputValue.trim()) {
      onChange(customInputValue.trim());
      setCustomInputValue('');
      setSearchTerm('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/20 text-white placeholder-gray-400 h-10"
        />
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              console.log('🔧 GEOGRAPHIC DEBUG - Button clicked for option:', option.value);
              handleOptionSelect(option.value);
            }}
            className={`
              relative w-full p-3 rounded-xl text-left transition-all duration-200 border
              ${value === option.value
                ? `${colorClass} border-white/30 text-white shadow-lg`
                : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30'
              }
            `}
          >
              {/* Glow effect for selected item */}
              {value === option.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-md" />
              )}
              
              <span className="relative z-10 text-xs truncate">{option.label}</span>
              {value === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative z-10 ml-1 absolute top-2 right-2"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* No results message */}
      {searchTerm && filteredOptions.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">
          No options found matching "{searchTerm}"
        </div>
      )}

      {/* Custom input section */}
      {allowCustomInput && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter custom option..."
              value={customInputValue}
              onChange={(e) => setCustomInputValue(e.target.value)}
              className="flex-1 bg-white/5 border-white/20 text-white placeholder-gray-400 h-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomInput();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleCustomInput}
              disabled={!customInputValue.trim()}
              className={`${colorClass} text-white h-9 px-3 text-xs`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
      
      {/* Display selected item */}
      {value && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Selected</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange('')}
              className="h-5 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 px-2"
            >
              <X className="h-2 w-2 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge 
              variant="secondary" 
              className={`${colorClass} text-white text-[10px] px-2 py-1 flex items-center gap-1`}
            >
              {options.find(opt => opt.value === value)?.label || value}
            </Badge>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Advanced Futuristic Weight Sliders Component
function WeightSliders({ 
  title, 
  description, 
  weights, 
  onWeightChange, 
  colorClass = "text-blue-400",
  borderClass = "border-blue-200/50 dark:border-blue-900/50",
  bgClass = "bg-blue-100/80 dark:bg-blue-900/30",
  iconClass = "text-blue-600 dark:text-blue-400",
  weightCategories = [],
  themeGradient = "from-blue-500 to-cyan-500"
}: {
  title: string;
  description: string;
  weights: Record<string, number>;
  onWeightChange: (field: string, value: number) => void;
  colorClass?: string;
  borderClass?: string;
  bgClass?: string;
  iconClass?: string;
  weightCategories?: { key: string; label: string }[];
  themeGradient?: string;
}) {
  const getIntensityLabel = (value: number) => {
    switch(value) {
      case 1: return "Low Priority";
      case 2: return "Minor Interest";
      case 3: return "Important";
      case 4: return "High Priority";
      case 5: return "Critical";
      default: return "Important";
    }
  };

  const getIntensityColor = (value: number, gradient: string) => {
    const baseColors = {
      "from-blue-500 to-cyan-500": ["bg-blue-300/40", "bg-blue-400/60", "bg-blue-500/80", "bg-blue-600/90", "bg-blue-700"],
      "from-violet-500 to-purple-500": ["bg-violet-300/40", "bg-violet-400/60", "bg-violet-500/80", "bg-violet-600/90", "bg-violet-700"],
      "from-emerald-500 to-teal-500": ["bg-emerald-300/40", "bg-emerald-400/60", "bg-emerald-500/80", "bg-emerald-600/90", "bg-emerald-700"]
    };
    
    const colors = baseColors[gradient as keyof typeof baseColors] || baseColors["from-blue-500 to-cyan-500"];
    return colors[value - 1] || colors[2];
  };

  return (
    <motion.div 
      variants={fadeIn}
      className="relative"
    >
      {/* Compact Futuristic Container */}
      <div className="relative bg-white/5 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
        {/* Simplified Header */}
        <div className="px-4 py-2 border-b border-white/10">
          <p className="text-xs text-gray-300">
            Adjust priority levels from 1 (lowest) to 5 (highest importance)
          </p>
        </div>

        {/* Compact Sliders Grid */}
        <div className="p-4 space-y-3">
          {weightCategories.map(({ key, label }, index) => {
            const currentValue = weights[key] || 3;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                {/* Compact Label Section */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${themeGradient} opacity-60`}></div>
                    <label className="text-xs font-medium text-white">{label}</label>
                  </div>
                  
                  {/* Compact Value Display */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{getIntensityLabel(currentValue)}</span>
                    <div className={`px-2 py-0.5 rounded-md bg-gradient-to-r ${themeGradient} text-white text-xs font-semibold`}>
                      {currentValue}
                    </div>
                  </div>
                </div>

                {/* Compact Slider Track */}
                <div className="relative">
                  {/* Background Track */}
                  <div className="h-2 bg-white/10 rounded-full"></div>
                  
                  {/* Progress Fill */}
                  <div 
                    className={`absolute top-0 left-0 h-2 bg-gradient-to-r ${themeGradient} rounded-full transition-all duration-200`}
                    style={{ width: `${((currentValue - 1) / 4) * 100}%` }}
                  ></div>
                  
                  {/* Compact Handle */}
                  <div 
                    className={`absolute w-4 h-4 bg-gradient-to-br ${themeGradient} rounded-full shadow-md border border-white/30 transition-all duration-200 hover:scale-110 cursor-pointer`}
                    style={{ 
                      left: `calc(${((currentValue - 1) / 4) * 100}% - 8px)`,
                      top: '35%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="absolute inset-0.5 bg-white/30 rounded-full"></div>
                  </div>
                  
                  {/* Compact Value Markers */}
                  <div className="flex justify-between mt-1 px-0.5">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div
                        key={value}
                        className={`w-0.5 h-0.5 rounded-full transition-all duration-200 ${
                          value <= currentValue 
                            ? `bg-gradient-to-r ${themeGradient}` 
                            : 'bg-white/20'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Hidden Actual Slider for Functionality */}
                <Slider
                  value={[currentValue]}
                  onValueChange={([newValue]) => onWeightChange(key, newValue)}
                  max={5}
                  min={1}
                  step={1}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function MentorshipPreferences({ preferences, updateArrayField, updateSingleField, updateWeight }: any) {
  const [customOptions, setCustomOptions] = useState<{[key: string]: {value: string; label: string}[]}>({
    areasOfExpertise: [],
    skills: []
  });

  // Get dynamic options based on selected industries
  const getAreasOfExpertise = () => {
    const selectedIndustries = preferences.mentorshipIndustries || [];
    let dynamicExpertise: {value: string; label: string}[] = [];
    
    selectedIndustries.forEach((industry: string) => {
      if (INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING]) {
        dynamicExpertise = [...dynamicExpertise, ...INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING].areasOfExpertise];
      }
    });

    // Remove duplicates and combine with custom options
    const uniqueExpertise = dynamicExpertise.filter((item, index, self) => 
      index === self.findIndex(t => t.value === item.value)
    );

    return [...uniqueExpertise, ...(customOptions.areasOfExpertise || [])];
  };

  // Get dynamic skills based on selected industries and areas of expertise
  const getSkills = () => {
    const selectedIndustries = preferences.mentorshipIndustries || [];
    const selectedExpertise = preferences.mentorshipAreasOfExpertise || [];
    let dynamicSkills: {value: string; label: string}[] = [];
    
    // Add skills from selected industries
    selectedIndustries.forEach((industry: string) => {
      if (INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING]) {
        dynamicSkills = [...dynamicSkills, ...INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING].skills];
      }
    });

    // Add additional skills based on areas of expertise
    // This is a simplified mapping - in real app, you'd have expertise -> skills mapping
    selectedExpertise.forEach((expertise: string) => {
      // Add specific skills for each expertise area
      if (expertise.includes('software')) {
        dynamicSkills.push(
          { value: "programming", label: "Programming" },
          { value: "debugging", label: "Debugging" },
          { value: "code_review", label: "Code Review" }
        );
      }
      if (expertise.includes('data')) {
        dynamicSkills.push(
          { value: "sql", label: "SQL" },
          { value: "statistics", label: "Statistics" },
          { value: "visualization", label: "Data Visualization" }
        );
      }
      if (expertise.includes('marketing')) {
        dynamicSkills.push(
          { value: "campaign_management", label: "Campaign Management" },
          { value: "content_creation", label: "Content Creation" },
          { value: "analytics_reporting", label: "Analytics & Reporting" }
        );
      }
    });

    // Remove duplicates and combine with custom options
    const uniqueSkills = dynamicSkills.filter((item, index, self) => 
      index === self.findIndex(t => t.value === item.value)
    );

    return [...uniqueSkills, ...(customOptions.skills || [])];
  };

  const mentorshipOptions = {
    lookingFor: [
      { value: "career_guidance", label: "Career Guidance" },
      { value: "skill_development", label: "Skill Development" },
      { value: "industry_insights", label: "Industry Insights" },
      { value: "networking", label: "Networking" },
      { value: "leadership", label: "Leadership" },
      { value: "entrepreneurship", label: "Entrepreneurship" }
    ],
    experienceLevel: [
      { value: "entry_level", label: "Entry Level" },
      { value: "mid_level", label: "Mid Level" },
      { value: "senior_level", label: "Senior Level" },
      { value: "executive", label: "Executive" },
      { value: "founder", label: "Founder/CEO" }
    ],
    skills: [
      { value: "leadership", label: "Leadership" },
      { value: "communication", label: "Communication" },
      { value: "project_management", label: "Project Management" },
      { value: "technical_skills", label: "Technical Skills" },
      { value: "data_analysis", label: "Data Analysis" },
      { value: "marketing", label: "Marketing" },
      { value: "sales", label: "Sales" },
      { value: "financial_planning", label: "Financial Planning" }
    ],
    areasOfExpertise: [
      { value: "business_strategy", label: "Business Strategy" },
      { value: "product_management", label: "Product Management" },
      { value: "software_development", label: "Software Development" },
      { value: "digital_marketing", label: "Digital Marketing" },
      { value: "finance", label: "Finance & Accounting" },
      { value: "operations", label: "Operations" },
      { value: "human_resources", label: "Human Resources" },
      { value: "consulting", label: "Consulting" }
    ],
    industries: Object.keys(INDUSTRY_MAPPING).map(key => ({
      value: key,
      label: INDUSTRY_MAPPING[key as keyof typeof INDUSTRY_MAPPING].label
    })),
    educationLevel: [
      { value: "high_school", label: "High School" },
      { value: "bachelor", label: "Bachelor's Degree" },
      { value: "master", label: "Master's Degree" },
      { value: "phd", label: "PhD" },
      { value: "certification", label: "Professional Certification" }
    ],
    geographicLocation: [
      { value: "local", label: "Local Area" },
      { value: "regional", label: "Regional" },
      { value: "national", label: "National" },
      { value: "international", label: "International" }
    ],
    topics: [
      { value: "career_transition", label: "Career Transition" },
      { value: "technical_skills", label: "Technical Skills" },
      { value: "soft_skills", label: "Soft Skills" },
      { value: "work_life_balance", label: "Work-Life Balance" },
      { value: "personal_branding", label: "Personal Branding" },
      { value: "interview_prep", label: "Interview Prep" }
    ],
    format: [
      { value: "one_on_one", label: "One-on-One" },
      { value: "group", label: "Group Sessions" },
      { value: "virtual", label: "Virtual Meetings" },
      { value: "in_person", label: "In-Person" },
      { value: "workshops", label: "Workshops" },
      { value: "coffee_chats", label: "Coffee Chats" }
    ]
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        <AccordionItem value="industry" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Industry</span>
              </div>
              {hasSelections(preferences, 'mentorshipIndustries') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Industries you're interested in"
              icon={Building2}
              options={mentorshipOptions.industries}
              values={preferences.mentorshipIndustries || []}
              onChange={(value) => updateArrayField('mentorship', 'Industries', value)}
              colorClass="bg-violet-500 hover:bg-violet-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience-level" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Experience Level</span>
              </div>
              {hasSelections(preferences, 'mentorshipExperienceLevel') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Preferred mentor experience levels"
              icon={Star}
              options={mentorshipOptions.experienceLevel}
              values={preferences.mentorshipExperienceLevel || []}
              onChange={(value) => updateArrayField('mentorship', 'ExperienceLevel', value)}
              colorClass="bg-violet-500 hover:bg-violet-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="areas-of-expertise" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Areas of Expertise</span>
              </div>
              {hasSelections(preferences, 'mentorshipAreasOfExpertise') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Specific areas of expertise for mentorship"
              icon={Target}
              options={getAreasOfExpertise()}
              values={preferences.mentorshipAreasOfExpertise || []}
              onChange={(value) => updateArrayField('mentorship', 'AreasOfExpertise', value)}
              colorClass="bg-violet-500 hover:bg-violet-600"
              searchPlaceholder="Search areas of expertise..."
              allowCustomInput={true}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education-level" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <GraduationCap className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Education Level</span>
              </div>
              {hasSelections(preferences, 'mentorshipEducationLevel') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Education levels for mentorship preferences"
              icon={GraduationCap}
              options={mentorshipOptions.educationLevel}
              values={preferences.mentorshipEducationLevel || []}
              onChange={(value) => updateArrayField('mentorship', 'EducationLevel', value)}
              colorClass="bg-violet-500 hover:bg-violet-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Skills</span>
              </div>
              {hasSelections(preferences, 'mentorshipSkills') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Skills you want to develop or share in mentorship"
              icon={Settings}
              options={getSkills()}
              values={preferences.mentorshipSkills || []}
              onChange={(value) => updateArrayField('mentorship', 'Skills', value)}
              colorClass="bg-violet-500 hover:bg-violet-600"
              searchPlaceholder="Search skills..."
              allowCustomInput={true}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="geographic-location" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Geographic Location</span>
              </div>
              {hasSelections(preferences, 'mentorshipGeographic') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SingleSelectField
              title=""
              description="Geographic scope for mentorship connections"
              icon={MapPin}
              options={mentorshipOptions.geographicLocation}
              value={preferences.mentorshipGeographic || ''}
              onChange={(value) => {
                console.log('🔧 GEOGRAPHIC DEBUG - Mentorship onChange:', value, typeof value);
                console.log('🔧 GEOGRAPHIC DEBUG - Current preferences.mentorshipGeographic:', preferences.mentorshipGeographic);
                updateSingleField('mentorship', 'geographic', value);
              }}
              colorClass="bg-violet-500 hover:bg-violet-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="looking-for" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Heart className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">What You're Looking For</span>
              </div>
              {hasSelections(preferences, 'mentorshipLookingFor') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Select areas where you want mentorship"
              icon={Heart}
              options={mentorshipOptions.lookingFor}
              values={preferences.mentorshipLookingFor || []}
              onChange={(value) => updateArrayField('mentorship', 'LookingFor', value)}
              colorClass="bg-violet-500 hover:bg-violet-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="matching-priorities" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-violet-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-violet-300 via-white to-pink-200 bg-clip-text text-transparent drop-shadow-sm">Matching Priorities</span>
              </div>
              {Object.keys(preferences.mentorshipWeights || {}).length > 0 && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <WeightSliders
              title=""
              description=""
              weights={preferences.mentorshipWeights || {}}
              onWeightChange={(field, value) => updateWeight("mentorship", field, value)}
              colorClass="text-violet-400"
              borderClass="border-violet-200/50 dark:border-violet-900/50"
              bgClass="bg-violet-100/80 dark:bg-violet-900/30"
              iconClass="text-violet-600 dark:text-violet-400"
              themeGradient="from-violet-500 to-purple-500"
              weightCategories={[
                { key: "experienceLevel", label: "Experience Level" },
                { key: "areasOfExpertise", label: "Areas of Expertise" },
                { key: "industries", label: "Industry Match" },
                { key: "timeCommitment", label: "Time Commitment" },
                { key: "mentorshipFormat", label: "Mentorship Format" },
                { key: "geographic", label: "Geographic Preference" }
              ]}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function NetworkingPreferences({ preferences, updateArrayField, updateSingleField, updateWeight }: any) {
  const [customOptions, setCustomOptions] = useState<{[key: string]: {value: string; label: string}[]}>({
    areasOfExpertise: [],
    skills: []
  });

  // Get dynamic areas of expertise based on selected industries
  const getAreasOfExpertise = () => {
    const selectedIndustries = preferences.networkingIndustries || [];
    let dynamicExpertise: {value: string; label: string}[] = [];
    
    selectedIndustries.forEach((industry: string) => {
      if (INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING]) {
        dynamicExpertise = [...dynamicExpertise, ...INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING].areasOfExpertise];
      }
    });

    // Remove duplicates and combine with custom options
    const uniqueExpertise = dynamicExpertise.filter((item, index, self) => 
      index === self.findIndex(t => t.value === item.value)
    );

    return [...uniqueExpertise, ...(customOptions.areasOfExpertise || [])];
  };

  // Get dynamic skills based on selected industries and areas of expertise  
  const getSkills = () => {
    const selectedIndustries = preferences.networkingIndustries || [];
    const selectedExpertise = preferences.networkingAreasOfExpertise || [];
    let dynamicSkills: {value: string; label: string}[] = [];
    
    // Add skills from selected industries
    selectedIndustries.forEach((industry: string) => {
      if (INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING]) {
        dynamicSkills = [...dynamicSkills, ...INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING].skills];
      }
    });

    // Add additional skills based on areas of expertise
    selectedExpertise.forEach((expertise: string) => {
      if (expertise.includes('software')) {
        dynamicSkills.push(
          { value: "programming", label: "Programming" },
          { value: "debugging", label: "Debugging" },
          { value: "code_review", label: "Code Review" }
        );
      }
      if (expertise.includes('data')) {
        dynamicSkills.push(
          { value: "sql", label: "SQL" },
          { value: "statistics", label: "Statistics" },
          { value: "visualization", label: "Data Visualization" }
        );
      }
      if (expertise.includes('marketing')) {
        dynamicSkills.push(
          { value: "campaign_management", label: "Campaign Management" },
          { value: "content_creation", label: "Content Creation" },
          { value: "analytics_reporting", label: "Analytics & Reporting" }
        );
      }
    });

    // Remove duplicates and combine with custom options
    const uniqueSkills = dynamicSkills.filter((item, index, self) => 
      index === self.findIndex(t => t.value === item.value)
    );

    return [...uniqueSkills, ...(customOptions.skills || [])];
  };

  const networkingOptions = {
    purpose: [
      { value: "business_development", label: "Business Development" },
      { value: "job_opportunities", label: "Job Opportunities" },
      { value: "partnerships", label: "Partnerships" },
      { value: "knowledge_sharing", label: "Knowledge Sharing" },
      { value: "industry_insights", label: "Industry Insights" },
      { value: "referrals", label: "Referrals" }
    ],
    companySize: [
      { value: "startup", label: "Startup (1-50)" },
      { value: "small", label: "Small (51-200)" },
      { value: "medium", label: "Medium (201-1000)" },
      { value: "large", label: "Large (1000+)" },
      { value: "enterprise", label: "Enterprise (5000+)" }
    ],
    seniority: [
      { value: "individual_contributor", label: "Individual Contributor" },
      { value: "team_lead", label: "Team Lead" },
      { value: "manager", label: "Manager" },
      { value: "director", label: "Director" },
      { value: "vp", label: "VP/SVP" },
      { value: "c_level", label: "C-Level" }
    ],
    industries: Object.keys(INDUSTRY_MAPPING).map(key => ({
      value: key,
      label: INDUSTRY_MAPPING[key as keyof typeof INDUSTRY_MAPPING].label
    })),
    educationLevel: [
      { value: "high_school", label: "High School" },
      { value: "bachelor", label: "Bachelor's Degree" },
      { value: "master", label: "Master's Degree" },
      { value: "phd", label: "PhD" },
      { value: "certification", label: "Professional Certification" }
    ],
    areasOfExpertise: [
      { value: "software_development", label: "Software Development" },
      { value: "data_science", label: "Data Science" },
      { value: "marketing", label: "Marketing" },
      { value: "sales", label: "Sales" },
      { value: "product_management", label: "Product Management" },
      { value: "finance", label: "Finance" },
      { value: "operations", label: "Operations" },
      { value: "human_resources", label: "Human Resources" }
    ],
    geographicLocation: [
      { value: "local", label: "Local Area" },
      { value: "regional", label: "Regional" },
      { value: "national", label: "National" },
      { value: "international", label: "International" }
    ]
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        <AccordionItem value="industry" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Industry</span>
              </div>
              {hasSelections(preferences, 'networkingIndustries') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Industry focus for networking opportunities"
              icon={Building2}
              options={networkingOptions.industries}
              values={preferences.networkingIndustries || []}
              onChange={(value) => updateArrayField('networking', 'Industries', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="areas-of-expertise" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Areas of Expertise</span>
              </div>
              {hasSelections(preferences, 'networkingAreasOfExpertise') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Areas of expertise for networking connections"
              icon={Target}
              options={getAreasOfExpertise()}
              values={preferences.networkingAreasOfExpertise || []}
              onChange={(value) => updateArrayField('networking', 'AreasOfExpertise', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
              searchPlaceholder="Search expertise areas..."
              allowCustomInput={true}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education-level" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Education Level</span>
              </div>
              {hasSelections(preferences, 'networkingEducationLevel') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Education levels for networking preferences"
              icon={GraduationCap}
              options={networkingOptions.educationLevel}
              values={preferences.networkingEducationLevel || []}
              onChange={(value) => updateArrayField('networking', 'EducationLevel', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Skills</span>
              </div>
              {hasSelections(preferences, 'networkingSkills') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Professional skills for networking connections"
              icon={Settings}
              options={getSkills()}
              values={preferences.networkingSkills || []}
              onChange={(value) => updateArrayField('networking', 'Skills', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
              searchPlaceholder="Search skills..."
              allowCustomInput={true}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="geographic-location" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Geographic Location</span>
              </div>
              {preferences.networkingGeographic && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SingleSelectField
              title=""
              description="Geographic scope for networking connections"
              icon={MapPin}
              options={networkingOptions.geographicLocation}
              value={preferences.networkingGeographic || ''}
              onChange={(value) => {
                console.log('🔧 GEOGRAPHIC DEBUG - Networking onChange:', value, typeof value);
                console.log('🔧 GEOGRAPHIC DEBUG - Current preferences.networkingGeographic:', preferences.networkingGeographic);
                updateSingleField('networking', 'geographic', value);
              }}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="networking-purpose" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Networking Purpose</span>
              </div>
              {hasSelections(preferences, 'networkingPurpose') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="What you hope to achieve through networking"
              icon={Target}
              options={networkingOptions.purpose}
              values={preferences.networkingPurpose || []}
              onChange={(value) => updateArrayField('networking', 'Purpose', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="company-size" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Company Size</span>
              </div>
              {hasSelections(preferences, 'networkingCompanySize') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Preferred company sizes to network with"
              icon={Building2}
              options={networkingOptions.companySize}
              values={preferences.networkingCompanySize || []}
              onChange={(value) => updateArrayField('networking', 'CompanySize', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seniority-level" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Seniority Level</span>
              </div>
              {hasSelections(preferences, 'networkingSeniority') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Professional levels you want to connect with"
              icon={Users}
              options={networkingOptions.seniority}
              values={preferences.networkingSeniority || []}
              onChange={(value) => updateArrayField('networking', 'Seniority', value)}
              colorClass="bg-emerald-500 hover:bg-emerald-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="matching-priorities" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-emerald-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-emerald-300 via-white to-teal-200 bg-clip-text text-transparent drop-shadow-sm">Matching Priorities</span>
              </div>
              {Object.keys(preferences.networkingWeights || {}).length > 0 && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <WeightSliders
              title=""
              description=""
              weights={preferences.networkingWeights || {}}
              onWeightChange={(field, value) => updateWeight("networking", field, value)}
              colorClass="text-emerald-400"
              borderClass="border-emerald-200/50 dark:border-emerald-900/50"
              bgClass="bg-emerald-100/80 dark:bg-emerald-900/30"
              iconClass="text-emerald-600 dark:text-emerald-400"
              themeGradient="from-emerald-500 to-teal-500"
              weightCategories={[
                { key: "purpose", label: "Networking Purpose" },
                { key: "companySize", label: "Company Size" },
                { key: "seniority", label: "Seniority Level" },
                { key: "industries", label: "Industry Match" },
                { key: "functionalAreas", label: "Functional Areas" },
                { key: "geographic", label: "Geographic Preference" }
              ]}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function JobsPreferences({ preferences, updateArrayField, updateSingleField, updateWeight }: any) {
  const jobsOptions = {
    types: [
      { value: "full_time", label: "Full-Time" },
      { value: "part_time", label: "Part-Time" },
      { value: "contract", label: "Contract" },
      { value: "freelance", label: "Freelance" },
      { value: "internship", label: "Internship" },
      { value: "temporary", label: "Temporary" }
    ],
    workArrangement: [
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid" },
      { value: "on_site", label: "On-Site" },
      { value: "flexible", label: "Flexible" }
    ],
    experienceLevel: [
      { value: "entry_level", label: "Entry Level" },
      { value: "mid_level", label: "Mid Level" },
      { value: "senior_level", label: "Senior Level" },
      { value: "lead", label: "Lead/Principal" },
      { value: "management", label: "Management" },
      { value: "executive", label: "Executive" }
    ],
    skills: [
      { value: "javascript", label: "JavaScript" },
      { value: "python", label: "Python" },
      { value: "react", label: "React" },
      { value: "nodejs", label: "Node.js" },
      { value: "aws", label: "AWS" },
      { value: "data_analysis", label: "Data Analysis" },
      { value: "project_management", label: "Project Management" },
      { value: "marketing", label: "Marketing" }
    ],
    salaryRange: [
      { value: "0-30k", label: "$0 - $30K" },
      { value: "30k-50k", label: "$30K - $50K" },
      { value: "50k-75k", label: "$50K - $75K" },
      { value: "75k-100k", label: "$75K - $100K" },
      { value: "100k-150k", label: "$100K - $150K" },
      { value: "150k+", label: "$150K+" }
    ],
    industries: [
      { value: "technology", label: "Technology" },
      { value: "finance", label: "Finance" },
      { value: "healthcare", label: "Healthcare" },
      { value: "education", label: "Education" },
      { value: "retail", label: "Retail" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "consulting", label: "Consulting" },
      { value: "marketing", label: "Marketing" }
    ],
    educationLevel: [
      { value: "high_school", label: "High School" },
      { value: "bachelor", label: "Bachelor's Degree" },
      { value: "master", label: "Master's Degree" },
      { value: "phd", label: "PhD" },
      { value: "certification", label: "Professional Certification" }
    ],
    geographicLocation: [
      { value: "local", label: "Local Area" },
      { value: "regional", label: "Regional" },
      { value: "national", label: "National" },
      { value: "international", label: "International" }
    ]
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        <AccordionItem value="industry" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Industry</span>
              </div>
              {hasSelections(preferences, 'jobsIndustries') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Industries you're interested in working in"
              icon={Building2}
              options={jobsOptions.industries}
              values={preferences.jobsIndustries || []}
              onChange={(value) => updateArrayField('jobs', 'Industries', value)}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Skills</span>
              </div>
              {hasSelections(preferences, 'jobsSkills') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Skills you want to find in job opportunities"
              icon={Settings}
              options={jobsOptions.skills}
              values={preferences.jobsSkills || []}
              onChange={(value) => updateArrayField('jobs', 'Skills', value)}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="salary-range" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Salary Range</span>
              </div>
              {hasSelections(preferences, 'jobsSalaryRange') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Preferred salary ranges for job opportunities"
              icon={DollarSign}
              options={jobsOptions.salaryRange}
              values={preferences.jobsSalaryRange || []}
              onChange={(value) => updateArrayField('jobs', 'salaryRange', value)}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education-level" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Education Level</span>
              </div>
              {hasSelections(preferences, 'jobsEducationLevel') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {/* DEBUG: Manual test button */}
            <button 
              onClick={() => {
                console.log('🔥 MANUAL TEST: Calling updateArrayField directly');
                updateArrayField('jobs', 'EducationLevel', 'high_school');
              }}
              className="mb-4 px-4 py-2 bg-red-500 text-white rounded"
            >
              🔥 DEBUG: Test High School Save
            </button>
            <MultiSelectField
              title=""
              description="Education levels required for job opportunities"
              icon={GraduationCap}
              options={jobsOptions.educationLevel}
              values={(() => {
                console.log('🔥 EDUCATION LEVEL DEBUG: preferences.jobsEducationLevel:', preferences.jobsEducationLevel, typeof preferences.jobsEducationLevel);
                console.log('🔥 EDUCATION LEVEL DEBUG: jobsOptions.educationLevel:', jobsOptions.educationLevel);
                const values = preferences.jobsEducationLevel || [];
                console.log('🔥 EDUCATION LEVEL DEBUG: Final values being passed:', values, Array.isArray(values));
                return values;
              })()}
              onChange={(value) => {
                console.log('🔥 EDUCATION LEVEL DEBUG: onChange called with value:', value);
                updateArrayField('jobs', 'EducationLevel', value);
              }}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="geographic-location" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Geographic Location</span>
              </div>
              {hasSelections(preferences, 'jobsGeographic') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SingleSelectField
              title=""
              description="Geographic scope for job opportunities"
              icon={MapPin}
              options={jobsOptions.geographicLocation}
              value={preferences.jobsGeographic || ''}
              onChange={(value) => {
                console.log('🔧 GEOGRAPHIC DEBUG - Jobs onChange:', value, typeof value);
                console.log('🔧 GEOGRAPHIC DEBUG - Current preferences.jobsGeographic:', preferences.jobsGeographic);
                updateSingleField('jobs', 'geographic', value);
              }}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="job-types" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Job Types</span>
              </div>
              {hasSelections(preferences, 'jobsTypes') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Types of employment you're interested in"
              icon={Briefcase}
              options={jobsOptions.types}
              values={preferences.jobsTypes || []}
              onChange={(value) => updateArrayField('jobs', 'types', value)}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="work-arrangement" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Work Arrangement</span>
              </div>
              {hasSelections(preferences, 'jobsWorkArrangement') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Preferred work arrangements"
              icon={MapPin}
              options={jobsOptions.workArrangement}
              values={preferences.jobsWorkArrangement || []}
              onChange={(value) => updateArrayField('jobs', 'workArrangement', value)}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience-level" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Experience Level</span>
              </div>
              {hasSelections(preferences, 'jobsExperienceLevel') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Job seniority levels you're targeting"
              icon={Star}
              options={jobsOptions.experienceLevel}
              values={preferences.jobsExperienceLevel || []}
              onChange={(value) => updateArrayField('jobs', 'experienceLevel', value)}
              colorClass="bg-blue-500 hover:bg-blue-600"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="matching-priorities" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-blue-300 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">Matching Priorities</span>
              </div>
              {Object.keys(preferences.jobsWeights || {}).length > 0 && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <WeightSliders
              title=""
              description=""
              weights={preferences.jobsWeights || {}}
              onWeightChange={(field, value) => updateWeight("jobs", field, value)}
              colorClass="text-blue-400"
              themeGradient="from-blue-500 to-cyan-500"
              weightCategories={[
                { key: "salary", label: "Salary Range" },
                { key: "companySize", label: "Company Size" },
                { key: "workArrangement", label: "Work Arrangement" },
                { key: "experienceLevel", label: "Experience Level" },
                { key: "industries", label: "Industry Match" },
                { key: "location", label: "Geographic Location" }
              ]}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function GlobalPreferences({ preferences, updateArrayField, setPreferences, savePreferencesMutation }: any) {
  const dealBreakerOptions = [
    { value: "poor_communication", label: "Poor Communication" },
    { value: "unreliable", label: "Unreliable" },
    { value: "negative_attitude", label: "Negative Attitude" },
    { value: "unprofessional", label: "Unprofessional" },
    { value: "different_values", label: "Different Values" },
    { value: "geographic_mismatch", label: "Geographic Mismatch" }
  ];

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        <AccordionItem value="deal-breakers" className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:bg-pink-500/10 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-pink-400" />
                <span className="text-lg font-bold text-white tracking-wide font-['Space_Grotesk'] bg-gradient-to-r from-pink-300 via-white to-rose-200 bg-clip-text text-transparent drop-shadow-sm">Deal Breakers</span>
              </div>
              {hasSelections(preferences, 'dealBreakers') && (
                <div className="bg-green-500 rounded-full p-1.5 mr-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MultiSelectField
              title=""
              description="Factors that would prevent you from connecting"
              icon={X}
              options={dealBreakerOptions}
              values={preferences.dealBreakers || []}
              onChange={(value) => {
                console.log('Deal Breakers onChange called with value:', value);
                setPreferences((prev: any) => {
                  const currentArray = Array.isArray(prev.dealBreakers) ? prev.dealBreakers : [];
                  
                  let newArray;
                  if (currentArray.includes(value)) {
                    newArray = currentArray.filter((item: string) => item !== value);
                    console.log('Removing deal breaker:', value, 'New array:', newArray);
                  } else {
                    newArray = [...currentArray, value];
                    console.log('Adding deal breaker:', value, 'New array:', newArray);
                  }
                  
                  const updatedPreferences = {
                    ...prev,
                    dealBreakers: newArray
                  } as ConnectionsPreferencesData;
                  
                  console.log('Updated preferences with deal breakers:', updatedPreferences);
                  
                  // Auto-save immediately
                  console.log('Auto-saving preferences after deal breaker change');
                  savePreferencesMutation.mutate(updatedPreferences);
                  
                  return updatedPreferences;
                });
              }}
              colorClass="bg-pink-500 hover:bg-pink-600"
            />
          </AccordionContent>
        </AccordionItem>


      </Accordion>
    </div>
  );
}