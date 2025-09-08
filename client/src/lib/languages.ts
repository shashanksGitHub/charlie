export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string; // Optional flag emoji
  rtl?: boolean; // Right-to-left direction
}

// Define available languages - Priority languages first
export const languages: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "ee", name: "Ewe", nativeName: "Eʋegbe", flag: "🇬🇭" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "ga", name: "Gã", nativeName: "Ga", flag: "🇬🇭" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇹🇿" },
  { code: "tw", name: "Twi", nativeName: "Twi", flag: "🇬🇭" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "jv", name: "Javanese", nativeName: "Basa Jawa", flag: "🇮🇩" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰", rtl: true },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "fa", name: "Persian", nativeName: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦" },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", flag: "🇧🇬" },
  { code: "ro", name: "Romanian", nativeName: "Română", flag: "🇷🇴" },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "🇮🇩",
  },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ", flag: "🇰🇭" },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", rtl: true },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹" },
  { code: "ha", name: "Hausa", nativeName: "هَوُسَ", flag: "🇳🇬" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", nativeName: "Asụsụ Igbo", flag: "🇳🇬" },
  { code: "ak", name: "Akan", nativeName: "Akan", flag: "🇬🇭" },
  { code: "dag", name: "Dagbani", nativeName: "Dagbani", flag: "🇬🇭" },
];

import { safeStorageGet, safeStorageSet } from "./storage-utils";

// Get current user's ID from storage with robust fallbacks
// Tries lightweight `userId` first (set in several flows), then legacy `userData`
// This helper doesn't depend on React hooks, so it can be used anywhere
function getCurrentUserId(): number | null {
  try {
    // 1) Preferred: simple userId key (may live in sessionStorage or localStorage)
    const storedUserId = safeStorageGet("userId");
    if (storedUserId) {
      const parsed = parseInt(storedUserId, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    // 2) Legacy: serialized userData object
    const userDataStr = safeStorageGet("userData");
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return userData.id || null;
    }
    return null;
  } catch (e) {
    console.error("Error getting current user ID:", e);
    return null;
  }
}

// Get user's preferred language from storage with fallback mechanisms
export function getUserLanguage(): string {
  const userId = getCurrentUserId();
  let savedLanguage = null;

  // Try to get user-specific language preference if logged in
  if (userId) {
    savedLanguage = safeStorageGet(`userLanguage-${userId}`);

    // If no user-specific setting found, try to migrate from global setting
    if (!savedLanguage) {
      const globalLanguage = safeStorageGet("userLanguage");
      if (globalLanguage) {
        // Store the global setting as a user-specific setting with fallback
        safeStorageSet(`userLanguage-${userId}`, globalLanguage);
        savedLanguage = globalLanguage;
      }
    }
  } else {
    // Fall back to global setting if no user is logged in
    savedLanguage = safeStorageGet("userLanguage");
  }

  if (savedLanguage) {
    return savedLanguage;
  }

  // Then try browser language
  const browserLang = navigator.language.split("-")[0]; // e.g. "en-US" -> "en"

  // Check if we support this language
  const isSupported = languages.some((lang) => lang.code === browserLang);

  // Return the browser language if supported, otherwise default to English
  return isSupported ? browserLang : "en";
}

// Save user's language preference to storage with fallback mechanisms
export function saveUserLanguage(languageCode: string): void {
  const userId = getCurrentUserId();

  // Save as user-specific preference if logged in using safe storage
  if (userId) {
    safeStorageSet(`userLanguage-${userId}`, languageCode);
  } else {
    // Otherwise save as global preference using safe storage
    safeStorageSet("userLanguage", languageCode);
  }
}

// Save user's language preference to database (for logged-in users) with optimistic updates
export async function saveUserLanguageToDatabase(
  languageCode: string,
): Promise<boolean> {
  const userId = getCurrentUserId();

  if (!userId) {
    // Guest user - save to localStorage only
    saveUserLanguage(languageCode);
    return true;
  }

  try {
    // Optimistic update - save to localStorage immediately for instant UI update
    saveUserLanguage(languageCode);

    // Then sync to database in background
    const response = await fetch(`/api/profile/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        preferredLanguage: languageCode,
      }),
    });

    if (!response.ok) {
      console.error(
        "Failed to save language preference to database:",
        response.statusText,
      );
      return false;
    }

    console.log(
      `✅ Language preference '${languageCode}' saved to database for user ${userId}`,
    );
    return true;
  } catch (error) {
    console.error("Error saving language preference to database:", error);
    return false;
  }
}

// Get user's preferred language from database (for logged-in users) with fallback
export function getUserLanguageFromProfile(userProfile: any): string {
  // Check if user has a preferred language in their profile
  if (userProfile?.preferredLanguage) {
    console.log(
      `Loading language '${userProfile.preferredLanguage}' from user profile`,
    );
    return userProfile.preferredLanguage;
  }

  // Fall back to existing localStorage logic
  return getUserLanguage();
}

// Get a formatted display for a language (e.g. "English (en)")
export function getLanguageDisplay(language: Language): string {
  return `${language.name} (${language.code})`;
}
