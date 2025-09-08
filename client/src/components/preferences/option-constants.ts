import { Option } from "./types";

// Job Types Options
export const JOB_TYPES: Option[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" }
];

// Work Arrangement Options
export const WORK_ARRANGEMENTS: Option[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
  { value: "flexible", label: "Flexible" }
];

// Experience Level Options
export const EXPERIENCE_LEVELS: Option[] = [
  { value: "entry_level", label: "Entry Level" },
  { value: "mid_level", label: "Mid Level" },
  { value: "senior_level", label: "Senior Level" },
  { value: "executive", label: "Executive" },
  { value: "c_suite", label: "C-Suite" }
];

// Salary Range Options
export const SALARY_RANGES: Option[] = [
  { value: "under_50k", label: "Under $50K" },
  { value: "50k_75k", label: "$50K - $75K" },
  { value: "75k_100k", label: "$75K - $100K" },
  { value: "100k_150k", label: "$100K - $150K" },
  { value: "150k_200k", label: "$150K - $200K" },
  { value: "over_200k", label: "Over $200K" }
];

// Education Level Options
export const EDUCATION_LEVELS: Option[] = [
  { value: "high_school", label: "High School" },
  { value: "associates", label: "Associate's Degree" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate/PhD" }
];

// Geographic Location Options
export const GEOGRAPHIC_LOCATIONS: Option[] = [
  { value: "local", label: "Local" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
  { value: "remote_global", label: "Remote (Global)" }
];

// Industry Options (for dropdown selection)
export const INDUSTRIES: Option[] = [
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance & Banking" },
  { value: "healthcare", label: "Healthcare & Medicine" },
  { value: "education", label: "Education & Training" },
  { value: "marketing", label: "Marketing & Communications" },
  { value: "consulting", label: "Consulting & Strategy" },
  { value: "law", label: "Legal & Compliance" },
  { value: "manufacturing", label: "Manufacturing & Operations" }
];

// Mentorship Specific Options
export const MENTORSHIP_LOOKING_FOR: Option[] = [
  { value: "career_guidance", label: "Career Guidance" },
  { value: "skill_development", label: "Skill Development" },
  { value: "leadership_coaching", label: "Leadership Coaching" },
  { value: "industry_insights", label: "Industry Insights" },
  { value: "networking", label: "Networking" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "personal_development", label: "Personal Development" },
  { value: "technical_mentorship", label: "Technical Mentorship" }
];

// Networking Specific Options
export const NETWORKING_PURPOSES: Option[] = [
  { value: "business_development", label: "Business Development" },
  { value: "career_opportunities", label: "Career Opportunities" },
  { value: "knowledge_sharing", label: "Knowledge Sharing" },
  { value: "industry_connections", label: "Industry Connections" },
  { value: "partnerships", label: "Partnerships" },
  { value: "mentorship", label: "Mentorship" },
  { value: "investment", label: "Investment" },
  { value: "collaboration", label: "Collaboration" }
];

export const COMPANY_SIZES: Option[] = [
  { value: "startup", label: "Startup (1-50)" },
  { value: "small", label: "Small (51-200)" },
  { value: "medium", label: "Medium (201-1000)" },
  { value: "large", label: "Large (1000+)" }
];

export const SENIORITY_LEVELS: Option[] = [
  { value: "individual_contributor", label: "Individual Contributor" },
  { value: "team_lead", label: "Team Lead" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "vp", label: "VP" },
  { value: "c_level", label: "C-Level" },
  { value: "founder", label: "Founder" },
  { value: "board_member", label: "Board Member" }
];

// Global Deal Breakers
export const DEAL_BREAKERS: Option[] = [
  { value: "poor_communication", label: "Poor Communication" },
  { value: "unprofessional_behavior", label: "Unprofessional Behavior" },
  { value: "unreliable", label: "Unreliable" },
  { value: "negative_attitude", label: "Negative Attitude" },
  { value: "conflicting_values", label: "Conflicting Values" },
  { value: "lack_of_integrity", label: "Lack of Integrity" },
  { value: "disrespectful", label: "Disrespectful" },
  { value: "unethical_practices", label: "Unethical Practices" }
];

// Weight Categories for different sections
export const JOBS_WEIGHT_CATEGORIES = [
  { key: "salary_range", label: "Salary Range" },
  { key: "company_size", label: "Company Size" },
  { key: "work_arrangement", label: "Work Arrangement" },
  { key: "experience_level", label: "Experience Level" },
  { key: "industry_match", label: "Industry Match" },
  { key: "geographic_location", label: "Geographic Location" }
];

export const MENTORSHIP_WEIGHT_CATEGORIES = [
  { key: "experience_level", label: "Experience Level" },
  { key: "areas_of_expertise", label: "Areas of Expertise" },
  { key: "industry_match", label: "Industry Match" },
  { key: "time_commitment", label: "Time Commitment" },
  { key: "mentorship_format", label: "Mentorship Format" },
  { key: "geographic_preference", label: "Geographic Preference" }
];

export const NETWORKING_WEIGHT_CATEGORIES = [
  { key: "networking_purpose", label: "Networking Purpose" },
  { key: "company_size", label: "Company Size" },
  { key: "seniority_level", label: "Seniority Level" },
  { key: "industry_match", label: "Industry Match" },
  { key: "functional_areas", label: "Functional Areas" },
  { key: "geographic_preference", label: "Geographic Preference" }
];