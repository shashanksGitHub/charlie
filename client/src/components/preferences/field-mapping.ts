// Database Field Mapping - Converts camelCase frontend fields to snake_case database fields
export const FIELD_MAPPING: { [key: string]: string } = {
  // Mentorship fields
  mentorshipLookingFor: "mentorship_looking_for",
  mentorshipExperienceLevel: "mentorship_experience_level", 
  mentorshipIndustries: "mentorship_industries",
  mentorshipAreasOfExpertise: "mentorship_areas_of_expertise",
  mentorshipEducationLevel: "mentorship_education_level",
  mentorshipSkills: "mentorship_skills",
  mentorshipTopics: "mentorship_topics",
  mentorshipFormat: "mentorship_format",
  mentorshipTimeCommitment: "mentorship_time_commitment",
  mentorshipLocationPreference: "mentorship_location_preference",
  mentorshipWeights: "mentorship_weights",

  // Networking fields
  networkingPurpose: "networking_purpose",
  networkingCompanySize: "networking_company_size",
  networkingSeniority: "networking_seniority", 
  networkingIndustries: "networking_industries",
  networkingAreasOfExpertise: "networking_areas_of_expertise",
  networkingEducationLevel: "networking_education_level",
  networkingSkills: "networking_skills",
  networkingFunctionalAreas: "networking_functional_areas",
  networkingLocationPreference: "networking_location_preference",
  networkingEventPreference: "networking_event_preference",
  networkingWeights: "networking_weights",

  // Jobs fields
  jobsTypes: "jobs_types",
  jobsSalaryRange: "jobs_salary_range",
  jobsWorkArrangement: "jobs_work_arrangement",
  jobsCompanySize: "jobs_company_size", 
  jobsIndustries: "jobs_industries",
  jobsEducationLevel: "jobs_education_level",
  jobsSkills: "jobs_skills",
  jobsExperienceLevel: "jobs_experience_level",
  jobsFunctionalAreas: "jobs_functional_areas",
  jobsGeographic: "jobs_geographic",
  jobsWorkLocation: "jobs_work_location",
  jobsWeights: "jobs_weights",

  // Global fields
  dealBreakers: "deal_breakers",
  preferenceProfiles: "preference_profiles"
};

// Reverse mapping for database to frontend
export const REVERSE_FIELD_MAPPING: { [key: string]: string } = Object.fromEntries(
  Object.entries(FIELD_MAPPING).map(([key, value]) => [value, key])
);

export const mapToDatabase = (frontendData: any): any => {
  const mappedData: any = {};
  
  Object.entries(frontendData).forEach(([key, value]) => {
    const dbField = FIELD_MAPPING[key] || key;
    mappedData[dbField] = value;
  });
  
  return mappedData;
};

export const mapFromDatabase = (databaseData: any): any => {
  const mappedData: any = {};
  
  Object.entries(databaseData).forEach(([key, value]) => {
    const frontendField = REVERSE_FIELD_MAPPING[key] || key;
    mappedData[frontendField] = value;
  });
  
  return mappedData;
};