import { storage } from "./storage";
import type {
  SuiteMentorshipProfile,
  SuiteNetworkingProfile,
  SuiteJobProfile,
  ConnectionsPreferences,
  User,
} from "../shared/schema";

export type SuiteSection = "mentorship" | "networking" | "jobs";

interface Ranked<T> {
  item: T;
  score: number;
}

function normalizeTextArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).toLowerCase());
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed)
      ? parsed.map((v) => String(v).toLowerCase())
      : [];
  } catch {
    return String(value)
      .split(/[,;|]/)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  }
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  setA.forEach((v) => {
    if (setB.has(v)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function stringEqualityScore(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
}

function clampScore(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

class SuiteMatchingEngine {
  // Base weights, can later be made user-personalized per section
  private mentorshipWeights = {
    roleAlignment: 0.25,
    industryMatch: 0.2,
    expertiseTopics: 0.2,
    formatLocation: 0.15,
    experienceLevel: 0.1,
    availability: 0.1,
  } as const;

  private networkingWeights = {
    purposeAlignment: 0.25,
    industryMatch: 0.2,
    seniorityCompany: 0.2,
    expertiseSkills: 0.2,
    locationFormat: 0.1,
    availability: 0.05,
  } as const;

  private jobsWeights = {
    typeMatch: 0.25,
    skillsMatch: 0.25,
    industryMatch: 0.2,
    experienceEducation: 0.15,
    locationArrangement: 0.1,
    salaryPreference: 0.05,
  } as const;

  async rankMentorship(
    currentUserId: number,
    profiles: Array<SuiteMentorshipProfile & { user: User }>,
  ): Promise<Array<SuiteMentorshipProfile & { user: User }>> {
    const preferences = await storage.getConnectionsPreferences(currentUserId);
    const ranked = profiles
      .map((p) => ({ item: p, score: this.scoreMentorship(p, preferences) }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
    return ranked;
  }

  async rankNetworking(
    currentUserId: number,
    profiles: Array<SuiteNetworkingProfile & { user: User }>,
  ): Promise<Array<SuiteNetworkingProfile & { user: User }>> {
    const preferences = await storage.getConnectionsPreferences(currentUserId);
    const ranked = profiles
      .map((p) => ({ item: p, score: this.scoreNetworking(p, preferences) }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
    return ranked;
  }

  async rankJobs(
    currentUserId: number,
    profiles: Array<SuiteJobProfile & { user: User }>,
  ): Promise<Array<SuiteJobProfile & { user: User }>> {
    const preferences = await storage.getConnectionsPreferences(currentUserId);
    const ranked = profiles
      .map((p) => ({ item: p, score: this.scoreJobs(p, preferences) }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
    return ranked;
  }

  private scoreMentorship(
    profile: SuiteMentorshipProfile,
    prefs: ConnectionsPreferences | null,
  ): number {
    const w = this.mentorshipWeights;
    let score = 0;

    // Role alignment: user preferences on mentorshipLookingFor vs profile.role
    const lookingFor = normalizeTextArray(prefs?.mentorshipLookingFor);
    const roleScore = lookingFor.length
      ? lookingFor.includes("both") || lookingFor.includes(`${profile.role}s`)
        ? 1
        : 0
      : 0.5; // neutral if no preference
    score += w.roleAlignment * roleScore;

    // Industry/domain match
    const prefIndustries = normalizeTextArray(prefs?.mentorshipIndustries);
    const pIndustries = normalizeTextArray(profile.industriesOrDomains);
    score += w.industryMatch * jaccardSimilarity(prefIndustries, pIndustries);

    // Expertise/Topics match (areasOfExpertise vs mentorshipTopics)
    const prefTopics = normalizeTextArray(prefs?.mentorshipTopics);
    const expertise = normalizeTextArray(profile.areasOfExpertise);
    const learningGoals = normalizeTextArray(profile.learningGoals);
    const expertiseTopicsScore = Math.max(
      jaccardSimilarity(prefTopics, expertise),
      jaccardSimilarity(prefTopics, learningGoals),
    );
    score += w.expertiseTopics * expertiseTopicsScore;

    // Format and location preferences
    const prefFormats = normalizeTextArray(prefs?.mentorshipFormat);
    const pFormats = normalizeTextArray(profile.preferredFormat);
    const formatScore = jaccardSimilarity(prefFormats, pFormats);
    const locationPref = String(prefs?.mentorshipLocationPreference || "").toLowerCase();
    const locScore = locationPref ? 0.5 : 0.5; // placeholder neutral; extend with geo later
    score += w.formatLocation * clampScore((formatScore + locScore) / 2);

    // Experience level alignment (preferredMentorExperience / preferredMenteeLevel)
    const prefExp = normalizeTextArray(prefs?.mentorshipExperienceLevel);
    const expScore = prefExp.length ? 0.6 : 0.5; // neutral baseline until richer data mapping
    score += w.experienceLevel * expScore;

    // Availability/time commitment
    const prefCommit = String(prefs?.mentorshipTimeCommitment || "").toLowerCase();
    const pCommit = String(profile.timeCommitment || "").toLowerCase();
    const availScore = prefCommit && pCommit ? stringEqualityScore(prefCommit, pCommit) : 0.5;
    score += w.availability * availScore;

    return clampScore(score);
  }

  private scoreNetworking(
    profile: SuiteNetworkingProfile,
    prefs: ConnectionsPreferences | null,
  ): number {
    const w = this.networkingWeights;
    let score = 0;

    // Purpose alignment
    const purposes = normalizeTextArray(prefs?.networkingPurpose);
    const profileGoals = normalizeTextArray(profile.networkingGoals);
    score += w.purposeAlignment * jaccardSimilarity(purposes, profileGoals);

    // Industry match
    const prefIndustries = normalizeTextArray(prefs?.networkingIndustries);
    const profileIndustry = normalizeTextArray(profile.industry);
    score += w.industryMatch * jaccardSimilarity(prefIndustries, profileIndustry);

    // Seniority and company size (approximate via strings if present)
    const prefSeniority = normalizeTextArray(prefs?.networkingSeniority);
    const seniorityScore = prefSeniority.length ? 0.6 : 0.5; // placeholder neutral
    const prefCompanySize = normalizeTextArray(prefs?.networkingCompanySize);
    const companySizeScore = prefCompanySize.length ? 0.6 : 0.5; // placeholder neutral
    score += w.seniorityCompany * ((seniorityScore + companySizeScore) / 2);

    // Expertise/skills match
    const prefExpertise = normalizeTextArray(prefs?.networkingAreasOfExpertise);
    const prefSkills = normalizeTextArray(prefs?.networkingSkills);
    const profileInterests = normalizeTextArray(profile.professionalInterests);
    const expertiseSkillsScore = Math.max(
      jaccardSimilarity(prefExpertise, profileInterests),
      jaccardSimilarity(prefSkills, profileInterests),
    );
    score += w.expertiseSkills * expertiseSkillsScore;

    // Location/meeting style
    const prefLoc = String(prefs?.networkingLocationPreference || "").toLowerCase();
    const meetingPref = normalizeTextArray(prefs?.networkingEventPreference);
    const profileMeeting = normalizeTextArray(profile.preferredMeetingStyle);
    const meetingScore = jaccardSimilarity(meetingPref, profileMeeting);
    const locScore = prefLoc ? 0.5 : 0.5; // placeholder neutral until geo
    score += w.locationFormat * clampScore((meetingScore + locScore) / 2);

    // Availability/time commitment
    const pCommit = String(profile.timeCommitment || "").toLowerCase();
    const commitScore = pCommit ? 0.55 : 0.5; // mild boost if declared
    score += w.availability * commitScore;

    return clampScore(score);
  }

  private scoreJobs(
    profile: SuiteJobProfile,
    prefs: ConnectionsPreferences | null,
  ): number {
    const w = this.jobsWeights;
    let score = 0;

    // Type (work arrangement/type)
    const prefTypes = normalizeTextArray(prefs?.jobsTypes);
    const typeScore = prefTypes.length ? 0.6 : 0.5; // without explicit job posting types in schema, keep neutral
    score += w.typeMatch * typeScore;

    // Skills match
    const prefSkills = normalizeTextArray(prefs?.jobsSkills);
    const profileSkills = normalizeTextArray((profile as any).requiredSkills || (profile as any).skills);
    score += w.skillsMatch * jaccardSimilarity(prefSkills, profileSkills);

    // Industry match
    const prefIndustries = normalizeTextArray(prefs?.jobsIndustries);
    const jobIndustry = normalizeTextArray((profile as any).industry);
    score += w.industryMatch * jaccardSimilarity(prefIndustries, jobIndustry);

    // Experience/Education
    const prefEdu = normalizeTextArray(prefs?.jobsEducationLevel);
    const eduScore = prefEdu.length ? 0.55 : 0.5;
    const prefExp = normalizeTextArray(prefs?.jobsExperienceLevel);
    const expScore = prefExp.length ? 0.55 : 0.5;
    score += w.experienceEducation * ((eduScore + expScore) / 2);

    // Location/arrangement
    const prefArrangement = normalizeTextArray(prefs?.jobsWorkArrangement);
    const arrangementScore = prefArrangement.length ? 0.55 : 0.5;
    score += w.locationArrangement * arrangementScore;

    // Salary preference
    const salaryPrefScore = prefs?.jobsSalaryMin || prefs?.jobsSalaryMax ? 0.55 : 0.5;
    score += w.salaryPreference * salaryPrefScore;

    return clampScore(score);
  }
}

export const suiteMatchingEngine = new SuiteMatchingEngine();


