// Comprehensive Industry-Expertise-Skills Mapping System
export const INDUSTRY_MAPPING = {
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
      { value: "tensorflow", label: "TensorFlow" },
      { value: "nodejs", label: "Node.js" }
    ]
  },
  finance: {
    label: "Finance & Banking",
    areasOfExpertise: [
      { value: "investment_banking", label: "Investment Banking" },
      { value: "financial_analysis", label: "Financial Analysis" },
      { value: "risk_management", label: "Risk Management" },
      { value: "corporate_finance", label: "Corporate Finance" },
      { value: "wealth_management", label: "Wealth Management" },
      { value: "fintech", label: "FinTech" },
      { value: "accounting", label: "Accounting & Auditing" },
      { value: "financial_planning", label: "Financial Planning" }
    ],
    skills: [
      { value: "financial_modeling", label: "Financial Modeling" },
      { value: "valuation", label: "Valuation" },
      { value: "excel", label: "Advanced Excel" },
      { value: "bloomberg", label: "Bloomberg Terminal" },
      { value: "sap", label: "SAP" },
      { value: "quickbooks", label: "QuickBooks" },
      { value: "python_finance", label: "Python for Finance" },
      { value: "sql", label: "SQL" }
    ]
  },
  healthcare: {
    label: "Healthcare & Medicine",
    areasOfExpertise: [
      { value: "clinical_medicine", label: "Clinical Medicine" },
      { value: "healthcare_administration", label: "Healthcare Administration" },
      { value: "medical_research", label: "Medical Research" },
      { value: "public_health", label: "Public Health" },
      { value: "nursing", label: "Nursing" },
      { value: "pharmacy", label: "Pharmacy" },
      { value: "medical_devices", label: "Medical Devices" },
      { value: "telemedicine", label: "Telemedicine" }
    ],
    skills: [
      { value: "patient_care", label: "Patient Care" },
      { value: "medical_writing", label: "Medical Writing" },
      { value: "clinical_trials", label: "Clinical Trials" },
      { value: "ehr_systems", label: "EHR Systems" },
      { value: "medical_coding", label: "Medical Coding" },
      { value: "healthcare_analytics", label: "Healthcare Analytics" },
      { value: "regulatory_compliance", label: "Regulatory Compliance" },
      { value: "quality_assurance", label: "Quality Assurance" }
    ]
  },
  education: {
    label: "Education & Training",
    areasOfExpertise: [
      { value: "k12_education", label: "K-12 Education" },
      { value: "higher_education", label: "Higher Education" },
      { value: "educational_technology", label: "Educational Technology" },
      { value: "curriculum_development", label: "Curriculum Development" },
      { value: "corporate_training", label: "Corporate Training" },
      { value: "special_education", label: "Special Education" },
      { value: "educational_administration", label: "Educational Administration" },
      { value: "online_learning", label: "Online Learning" }
    ],
    skills: [
      { value: "instructional_design", label: "Instructional Design" },
      { value: "classroom_management", label: "Classroom Management" },
      { value: "educational_assessment", label: "Educational Assessment" },
      { value: "learning_management_systems", label: "Learning Management Systems" },
      { value: "curriculum_mapping", label: "Curriculum Mapping" },
      { value: "student_counseling", label: "Student Counseling" },
      { value: "educational_research", label: "Educational Research" },
      { value: "grant_writing", label: "Grant Writing" }
    ]
  },
  marketing: {
    label: "Marketing & Communications",
    areasOfExpertise: [
      { value: "digital_marketing", label: "Digital Marketing" },
      { value: "brand_management", label: "Brand Management" },
      { value: "content_marketing", label: "Content Marketing" },
      { value: "social_media", label: "Social Media Marketing" },
      { value: "public_relations", label: "Public Relations" },
      { value: "market_research", label: "Market Research" },
      { value: "advertising", label: "Advertising" },
      { value: "communications", label: "Corporate Communications" }
    ],
    skills: [
      { value: "seo_sem", label: "SEO/SEM" },
      { value: "google_analytics", label: "Google Analytics" },
      { value: "facebook_ads", label: "Facebook Ads" },
      { value: "content_creation", label: "Content Creation" },
      { value: "email_marketing", label: "Email Marketing" },
      { value: "copywriting", label: "Copywriting" },
      { value: "graphic_design", label: "Graphic Design" },
      { value: "video_production", label: "Video Production" }
    ]
  },
  consulting: {
    label: "Consulting & Strategy",
    areasOfExpertise: [
      { value: "management_consulting", label: "Management Consulting" },
      { value: "strategy_consulting", label: "Strategy Consulting" },
      { value: "it_consulting", label: "IT Consulting" },
      { value: "financial_consulting", label: "Financial Consulting" },
      { value: "hr_consulting", label: "HR Consulting" },
      { value: "operations_consulting", label: "Operations Consulting" },
      { value: "change_management", label: "Change Management" },
      { value: "business_transformation", label: "Business Transformation" }
    ],
    skills: [
      { value: "strategic_planning", label: "Strategic Planning" },
      { value: "business_analysis", label: "Business Analysis" },
      { value: "project_management", label: "Project Management" },
      { value: "process_improvement", label: "Process Improvement" },
      { value: "stakeholder_management", label: "Stakeholder Management" },
      { value: "presentation_skills", label: "Presentation Skills" },
      { value: "problem_solving", label: "Problem Solving" },
      { value: "data_analysis", label: "Data Analysis" }
    ]
  },
  law: {
    label: "Legal & Compliance",
    areasOfExpertise: [
      { value: "corporate_law", label: "Corporate Law" },
      { value: "litigation", label: "Litigation" },
      { value: "intellectual_property", label: "Intellectual Property" },
      { value: "employment_law", label: "Employment Law" },
      { value: "regulatory_compliance", label: "Regulatory Compliance" },
      { value: "contract_law", label: "Contract Law" },
      { value: "real_estate_law", label: "Real Estate Law" },
      { value: "criminal_law", label: "Criminal Law" }
    ],
    skills: [
      { value: "legal_research", label: "Legal Research" },
      { value: "contract_drafting", label: "Contract Drafting" },
      { value: "legal_writing", label: "Legal Writing" },
      { value: "case_management", label: "Case Management" },
      { value: "negotiation", label: "Negotiation" },
      { value: "trial_advocacy", label: "Trial Advocacy" },
      { value: "legal_analysis", label: "Legal Analysis" },
      { value: "compliance_monitoring", label: "Compliance Monitoring" }
    ]
  },
  manufacturing: {
    label: "Manufacturing & Operations",
    areasOfExpertise: [
      { value: "production_management", label: "Production Management" },
      { value: "quality_control", label: "Quality Control" },
      { value: "supply_chain", label: "Supply Chain Management" },
      { value: "operations_management", label: "Operations Management" },
      { value: "process_engineering", label: "Process Engineering" },
      { value: "logistics", label: "Logistics" },
      { value: "lean_manufacturing", label: "Lean Manufacturing" },
      { value: "industrial_engineering", label: "Industrial Engineering" }
    ],
    skills: [
      { value: "six_sigma", label: "Six Sigma" },
      { value: "lean_principles", label: "Lean Principles" },
      { value: "inventory_management", label: "Inventory Management" },
      { value: "erp_systems", label: "ERP Systems" },
      { value: "quality_assurance", label: "Quality Assurance" },
      { value: "production_planning", label: "Production Planning" },
      { value: "cost_analysis", label: "Cost Analysis" },
      { value: "vendor_management", label: "Vendor Management" }
    ]
  }
};

export const getAreasOfExpertiseForIndustries = (selectedIndustries: string[]) => {
  const allAreas: { value: string; label: string }[] = [];
  selectedIndustries.forEach(industry => {
    if (INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING]) {
      allAreas.push(...INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING].areasOfExpertise);
    }
  });
  return allAreas;
};

export const getSkillsForAreasOfExpertise = (selectedIndustries: string[], selectedAreas: string[]) => {
  const allSkills: { value: string; label: string }[] = [];
  selectedIndustries.forEach(industry => {
    if (INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING]) {
      allSkills.push(...INDUSTRY_MAPPING[industry as keyof typeof INDUSTRY_MAPPING].skills);
    }
  });
  return allSkills;
};