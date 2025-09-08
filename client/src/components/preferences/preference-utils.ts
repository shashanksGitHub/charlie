import { ConnectionsPreferences, CompletionHealth } from "./types";

export const calculateCompletionPercentage = (
  preferences: ConnectionsPreferences,
  section: "jobs" | "mentorship" | "networking" | "global"
): number => {
  switch (section) {
    case "jobs":
      return calculateJobsCompletion(preferences);
    case "mentorship":
      return calculateMentorshipCompletion(preferences);
    case "networking":
      return calculateNetworkingCompletion(preferences);
    case "global":
      return calculateGlobalCompletion(preferences);
    default:
      return 0;
  }
};

const calculateJobsCompletion = (preferences: ConnectionsPreferences): number => {
  const fields = [
    preferences.jobTypes,
    preferences.workArrangement,
    preferences.jobExperienceLevel,
    preferences.jobIndustry,
    preferences.jobAreasOfExpertise,
    preferences.jobSkills,
    preferences.jobSalaryRange,
    preferences.jobEducationLevel,
    preferences.jobGeographicLocation,
    preferences.jobMatchingPriorities ? Object.keys(preferences.jobMatchingPriorities) : []
  ];

  const completedFields = fields.filter(field => 
    Array.isArray(field) ? field.length > 0 : field && Object.keys(field).length > 0
  ).length;

  return Math.round((completedFields / fields.length) * 100);
};

const calculateMentorshipCompletion = (preferences: ConnectionsPreferences): number => {
  const fields = [
    preferences.mentorshipLookingFor,
    preferences.mentorshipExperienceLevel,
    preferences.mentorshipIndustry,
    preferences.mentorshipAreasOfExpertise,
    preferences.mentorshipSkills,
    preferences.mentorshipEducationLevel,
    preferences.mentorshipGeographicLocation,
    preferences.mentorshipMatchingPriorities ? Object.keys(preferences.mentorshipMatchingPriorities) : []
  ];

  const completedFields = fields.filter(field => 
    Array.isArray(field) ? field.length > 0 : field && Object.keys(field).length > 0
  ).length;

  return Math.round((completedFields / fields.length) * 100);
};

const calculateNetworkingCompletion = (preferences: ConnectionsPreferences): number => {
  const fields = [
    preferences.networkingPurpose,
    preferences.networkingCompanySize,
    preferences.networkingSeniorityLevel,
    preferences.networkingIndustry,
    preferences.networkingAreasOfExpertise,
    preferences.networkingSkills,
    preferences.networkingEducationLevel,
    preferences.networkingLocationPreference,
    preferences.networkingMatchingPriorities ? Object.keys(preferences.networkingMatchingPriorities) : []
  ];

  const completedFields = fields.filter(field => 
    Array.isArray(field) ? field.length > 0 : field && Object.keys(field).length > 0
  ).length;

  return Math.round((completedFields / fields.length) * 100);
};

const calculateGlobalCompletion = (preferences: ConnectionsPreferences): number => {
  const fields = [
    preferences.globalDealBreakers
  ];

  const completedFields = fields.filter(field => 
    Array.isArray(field) ? field.length > 0 : field && Object.keys(field).length > 0
  ).length;

  return Math.round((completedFields / fields.length) * 100);
};

export const getCompletionHealth = (preferences: ConnectionsPreferences): CompletionHealth => {
  return {
    jobs: calculateJobsCompletion(preferences),
    mentorship: calculateMentorshipCompletion(preferences),
    networking: calculateNetworkingCompletion(preferences),
    global: calculateGlobalCompletion(preferences)
  };
};

export const getMissingFields = (
  preferences: ConnectionsPreferences,
  section: "jobs" | "mentorship" | "networking" | "global"
): string[] => {
  const missingFields: string[] = [];

  switch (section) {
    case "jobs":
      if (!preferences.jobTypes?.length) missingFields.push("Job Types");
      if (!preferences.workArrangement?.length) missingFields.push("Work Arrangement");
      if (!preferences.jobExperienceLevel?.length) missingFields.push("Experience Level");
      if (!preferences.jobIndustry?.length) missingFields.push("Industry");
      if (!preferences.jobAreasOfExpertise?.length) missingFields.push("Areas of Expertise");
      if (!preferences.jobSkills?.length) missingFields.push("Skills");
      if (!preferences.jobSalaryRange?.length) missingFields.push("Salary Range");
      if (!preferences.jobEducationLevel?.length) missingFields.push("Education Level");
      if (!preferences.jobGeographicLocation?.length) missingFields.push("Geographic Location");
      if (!preferences.jobMatchingPriorities || !Object.keys(preferences.jobMatchingPriorities).length) {
        missingFields.push("Matching Priorities");
      }
      break;

    case "mentorship":
      if (!preferences.mentorshipLookingFor?.length) missingFields.push("What You're Looking For");
      if (!preferences.mentorshipExperienceLevel?.length) missingFields.push("Experience Level");
      if (!preferences.mentorshipIndustry?.length) missingFields.push("Industry");
      if (!preferences.mentorshipAreasOfExpertise?.length) missingFields.push("Areas of Expertise");
      if (!preferences.mentorshipSkills?.length) missingFields.push("Skills");
      if (!preferences.mentorshipEducationLevel?.length) missingFields.push("Education Level");
      if (!preferences.mentorshipGeographicLocation?.length) missingFields.push("Geographic Location");
      if (!preferences.mentorshipMatchingPriorities || !Object.keys(preferences.mentorshipMatchingPriorities).length) {
        missingFields.push("Matching Priorities");
      }
      break;

    case "networking":
      if (!preferences.networkingPurpose?.length) missingFields.push("Networking Purpose");
      if (!preferences.networkingCompanySize?.length) missingFields.push("Company Size");
      if (!preferences.networkingSeniorityLevel?.length) missingFields.push("Seniority Level");
      if (!preferences.networkingIndustry?.length) missingFields.push("Industry");
      if (!preferences.networkingAreasOfExpertise?.length) missingFields.push("Areas of Expertise");
      if (!preferences.networkingSkills?.length) missingFields.push("Skills");
      if (!preferences.networkingEducationLevel?.length) missingFields.push("Education Level");
      if (!preferences.networkingLocationPreference?.length) missingFields.push("Location Preference");
      if (!preferences.networkingMatchingPriorities || !Object.keys(preferences.networkingMatchingPriorities).length) {
        missingFields.push("Matching Priorities");
      }
      break;

    case "global":
      if (!preferences.globalDealBreakers?.length) missingFields.push("Deal Breakers");
      break;
  }

  return missingFields;
};

export const getFieldMapping = (): { [key: string]: { section: string; accordion: string } } => {
  return {
    "Job Types": { section: "jobs", accordion: "Job Types" },
    "Work Arrangement": { section: "jobs", accordion: "Work Arrangement" },
    "Experience Level": { section: "jobs", accordion: "Experience Level" },
    "Industry": { section: "jobs", accordion: "Industry" },
    "Areas of Expertise": { section: "jobs", accordion: "Areas of Expertise" },
    "Skills": { section: "jobs", accordion: "Skills" },
    "Salary Range": { section: "jobs", accordion: "Salary Range" },
    "Education Level": { section: "jobs", accordion: "Education Level" },
    "Geographic Location": { section: "jobs", accordion: "Geographic Location" },
    "Matching Priorities": { section: "jobs", accordion: "Matching Priorities" },
    "What You're Looking For": { section: "mentorship", accordion: "What You're Looking For" },
    "Networking Purpose": { section: "networking", accordion: "Networking Purpose" },
    "Company Size": { section: "networking", accordion: "Company Size" },
    "Seniority Level": { section: "networking", accordion: "Seniority Level" },
    "Deal Breakers": { section: "global", accordion: "Deal Breakers" }
  };
};