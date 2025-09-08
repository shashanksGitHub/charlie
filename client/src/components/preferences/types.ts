export interface Option {
  value: string;
  label: string;
}

export interface WeightPreferences {
  [key: string]: number;
}

export interface ConnectionsPreferences {
  // Jobs preferences
  jobTypes?: string[];
  workArrangement?: string[];
  jobExperienceLevel?: string[];
  jobIndustry?: string[];
  jobAreasOfExpertise?: string[];
  jobSkills?: string[];
  jobSalaryRange?: string[];
  jobEducationLevel?: string[];
  jobGeographicLocation?: string[];
  jobMatchingPriorities?: WeightPreferences;

  // Mentorship preferences
  mentorshipLookingFor?: string[];
  mentorshipExperienceLevel?: string[];
  mentorshipIndustry?: string[];
  mentorshipAreasOfExpertise?: string[];
  mentorshipSkills?: string[];
  mentorshipEducationLevel?: string[];
  mentorshipGeographicLocation?: string[];
  mentorshipMatchingPriorities?: WeightPreferences;

  // Networking preferences
  networkingPurpose?: string[];
  networkingCompanySize?: string[];
  networkingSeniorityLevel?: string[];
  networkingIndustry?: string[];
  networkingAreasOfExpertise?: string[];
  networkingSkills?: string[];
  networkingEducationLevel?: string[];
  networkingLocationPreference?: string[];
  networkingMatchingPriorities?: WeightPreferences;

  // Global preferences
  globalDealBreakers?: string[];
}

export interface TabConfig {
  id: string;
  label: string;
  icon: any;
  theme: {
    gradient: string;
    border: string;
    shadow: string;
    text: string;
    accent: string;
  };
}

export interface AccordionSection {
  id: string;
  title: string;
  icon: any;
  component: React.ComponentType<any>;
  description?: string;
}

export interface MultiSelectFieldProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustomInput?: boolean;
  customInputPlaceholder?: string;
  theme?: string;
  className?: string;
}

export interface WeightSlidersProps {
  title: string;
  weightCategories: { key: string; label: string }[];
  values: WeightPreferences;
  onChange: (values: WeightPreferences) => void;
  theme: string;
}

export interface CompletionHealth {
  jobs: number;
  mentorship: number;
  networking: number;
  global: number;
}

export interface BadgeClickHandler {
  (section: string, field: string): void;
}