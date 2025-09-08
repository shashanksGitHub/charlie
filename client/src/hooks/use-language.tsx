import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  languages,
  Language,
  getUserLanguage,
  saveUserLanguage,
  saveUserLanguageToDatabase,
  getUserLanguageFromProfile,
} from "@/lib/languages";
import { safeStorageGet, safeStorageSet } from "@/lib/storage-utils";
import { useNationality } from "./use-nationality";
import { useAuth } from "./use-auth";

// Import all translations statically
import enTranslations from "../translations/en.json";
import frTranslations from "../translations/fr.json";
import esTranslations from "../translations/es.json";
import deTranslations from "../translations/de.json";
import itTranslations from "../translations/it.json";
import ptTranslations from "../translations/pt.json";
import ruTranslations from "../translations/ru.json";
import nlTranslations from "../translations/nl.json";
import trTranslations from "../translations/tr.json";
import zhTranslations from "../translations/zh.json";
import jaTranslations from "../translations/ja.json";
import koTranslations from "../translations/ko.json";
import hiTranslations from "../translations/hi.json";
import arTranslations from "../translations/ar.json";
import twTranslations from "../translations/tw.json";
import akTranslations from "../translations/ak.json";
import eeTranslations from "../translations/ee.json"; // Changed from 'ew' to 'ee'
import gaTranslations from "../translations/ga.json";

// Create a map of language codes to their translation objects
const translationsMap: Record<string, any> = {
  en: enTranslations,
  fr: frTranslations,
  es: esTranslations,
  de: deTranslations,
  it: itTranslations,
  pt: ptTranslations,
  ru: ruTranslations,
  nl: nlTranslations,
  tr: trTranslations,
  zh: zhTranslations,
  ja: jaTranslations,
  ko: koTranslations,
  hi: hiTranslations,
  ar: arTranslations,
  tw: twTranslations,
  ak: akTranslations,
  ee: eeTranslations, // Changed from 'ew' to 'ee'
  ga: gaTranslations,
};

// Define nested translation dictionary type
type NestedTranslationDictionary = {
  [key: string]: NestedTranslationDictionary | string;
};

// Define language context
type LanguageContextType = {
  currentLanguage: Language;
  setLanguage: (languageCode: string) => void;
  allLanguages: Language[];
  translate: (key: string, replacements?: Record<string, string>) => string;
  isLoading: boolean;
};

// Create context with default values
const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

// Helper function to get nested value from a translation object using dot notation
function getNestedTranslation(
  obj: NestedTranslationDictionary,
  path: string,
): string {
  // Early return if we don't have a translation object or path
  if (!obj || !path) return path;

  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return path; // Return the original key if translation not found
    }
    current = current[key];
  }

  if (typeof current !== "string") {
    return path; // Return the original key if not a string
  }

  return current;
}

// Global reference to the latest translate function so non-React callers can translate safely
let latestTranslateFn:
  | ((key: string, replacements?: Record<string, string>) => string)
  | null = null;

// Create a provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  // Get nationality context for demonym substitution
  const { country, demonym } = useNationality();

  // Get user authentication state
  const { user } = useAuth();

  // State to store current language object
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    // Initial language loading - will be updated when user data loads
    const savedLanguageCode = getUserLanguage();
    console.log(
      `Initializing language system with saved code: ${savedLanguageCode}`,
    );
    return (
      languages.find((lang) => lang.code === savedLanguageCode) ||
      languages.find((lang) => lang.code === "en") ||
      languages[0]
    );
  });

  // State to store translations for current language
  const [translations, setTranslations] = useState<NestedTranslationDictionary>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);

  // Effect to load language from user profile when user data becomes available
  useEffect(() => {
    if (user) {
      const profileLanguageCode = getUserLanguageFromProfile(user);
      const profileLanguage = languages.find(
        (lang) => lang.code === profileLanguageCode,
      );

      if (profileLanguage && profileLanguage.code !== currentLanguage.code) {
        console.log(
          `🌍 Loading language '${profileLanguageCode}' from user profile`,
        );
        setCurrentLanguage(profileLanguage);

        // Load translations for profile language
        const translationData =
          translationsMap[profileLanguageCode] || translationsMap["en"];
        if (translationData) {
          setTranslations(translationData);
          setIsLoading(false);
        }
      }
    }
  }, [user]);

  // Used to trigger RTL mode for right-to-left languages
  useEffect(() => {
    if (currentLanguage.rtl) {
      document.documentElement.classList.add("rtl-active");
    } else {
      document.documentElement.classList.remove("rtl-active");
    }
  }, [currentLanguage]);

  // Load translations for the current language
  useEffect(() => {
    function loadTranslations() {
      setIsLoading(true);
      try {
        console.log(
          `Loading translations for language: ${currentLanguage.code}`,
        );

        // Get translation data from our map or fallback to English
        const translationData =
          translationsMap[currentLanguage.code] || translationsMap["en"];

        console.log(
          `Translation data loaded for ${currentLanguage.code}:`,
          translationData,
        );
        console.log(
          `Translation data has settings:`,
          !!translationData?.settings,
        );
        console.log(
          `Settings showChooseAppModePage:`,
          translationData?.settings?.showChooseAppModePage,
        );

        if (!translationData) {
          console.warn(
            `Translation for ${currentLanguage.code} not found, using English`,
          );
          setTranslations(translationsMap["en"]);
        } else {
          setTranslations(translationData);
        }
      } catch (error) {
        console.error("Failed to load translations:", error);
        // Fallback to English
        setTranslations(translationsMap["en"]);
      } finally {
        setIsLoading(false);
      }
    }

    loadTranslations();
  }, [currentLanguage.code]);

  // Function to change language
  const setLanguage = async (languageCode: string) => {
    console.log(`Attempting to change language to: ${languageCode}`);
    const language = languages.find((lang) => lang.code === languageCode);
    if (language) {
      console.log(`Language found:`, language);

      // Update the current language which will trigger useEffect for translations
      setCurrentLanguage(language);

      // Keep onboarding language keys in sync so the guard does not override user choice
      try {
        safeStorageSet("charley_language_selection_completed", "true");
        safeStorageSet("charley_selected_app_language", languageCode);
      } catch (e) {
        console.warn("Failed to update onboarding language keys:", e);
      }

      // Save to database with optimistic updates (or localStorage for guests)
      const saved = await saveUserLanguageToDatabase(languageCode);
      if (!saved) {
        console.warn(
          `Failed to save language preference '${languageCode}' to database, but UI updated locally`,
        );
      }

      // Immediately load translations without artificial delay for instant performance
      const translationData =
        translationsMap[languageCode] || translationsMap["en"];
      if (translationData) {
        setTranslations(translationData);
        setIsLoading(false);
        console.log(`Instant translation reload complete for: ${languageCode}`);
        console.log(
          `French settings translations loaded:`,
          translationData?.settings,
        );
      }

      console.log(
        `Language changed to: ${languageCode}, instant reload completed`,
      );
    } else {
      console.warn(`Language not found for code: ${languageCode}`);
    }
  };

  // Translate a string using the current language
  const translate = (
    key: string,
    replacements: Record<string, string> = {},
  ): string => {
    if (!translations || Object.keys(translations).length === 0) {
      console.log(`No translations available for key: ${key}`);
      return key;
    }

    // Debug logging for specific keys that should be translated
    if (key.includes("settings.")) {
      console.log(
        `Translating key: ${key}, Current language: ${currentLanguage.code}, Has translations:`,
        Object.keys(translations).length > 0,
      );
    }

    // Get the translated text from our nested translations object using dot notation
    let translatedText = getNestedTranslation(translations, key);

    // Debug the translation result
    if (key.includes("settings.") && translatedText !== key) {
      console.log(`Translation found for ${key}: ${translatedText}`);
    } else if (key.includes("settings.") && translatedText === key) {
      console.log(`Translation NOT found for ${key}, fallback will be used`);
    }

    // Special debugging for problematic keys
    if (
      [
        "settings.securityAndPrivacy",
        "settings.twoFactorAuth",
        "settings.accountPrivacy",
      ].includes(key)
    ) {
      console.log(`🔍 DEBUGGING KEY: ${key}`);
      console.log(`🔍 Current language: ${currentLanguage.code}`);
      console.log(`🔍 Translations object exists:`, !!translations);
      console.log(`🔍 Settings section exists:`, !!translations.settings);
      const keyPart = key.split(".")[1];
      console.log(
        `🔍 Raw translation lookup:`,
        (translations.settings as any)?.[keyPart],
      );
      console.log(`🔍 Final result: ${translatedText}`);
    }

    // If we didn't find a translation or it's the same as the key (translation failed)
    if (translatedText === key) {
      // Try English fallback
      const englishTranslations = translationsMap["en"];
      const englishText = getNestedTranslation(englishTranslations, key);

      if (englishText !== key) {
        translatedText = englishText;
      } else {
        // As a final fallback, try to derive a human-readable name from the key
        const keyParts = key.split(".");
        if (keyParts.length > 1) {
          const lastPart = keyParts[keyParts.length - 1];
          translatedText = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        }
      }
    }

    // Handle nationality substitution
    // This will be dynamically updated based on the selected nationality
    if (translatedText.includes("Ghanaians") && !replacements["nationality"]) {
      try {
        // Use the demonym directly from the nationality context
        if (demonym && demonym !== "Ghanaians") {
          translatedText = translatedText.replace(/Ghanaians/g, demonym);
        }
      } catch (e) {
        console.warn("Error substituting nationality:", e);
        // Continue with original text if there's an error
      }
    }

    // Replace any placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      translatedText = translatedText.replace(
        new RegExp(`{{${placeholder}}}`, "g"),
        value,
      );
    });

    return translatedText;
  };

  // Keep global translator reference in sync for non-hook callers
  useEffect(() => {
    latestTranslateFn = translate;
    return () => {
      // On unmount, clear to avoid stale reference
      latestTranslateFn = null;
    };
  }, [translate, currentLanguage, translations]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        allLanguages: languages,
        translate,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Create a hook for using the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Shorthand for translate function
export function t(
  key: string,
  replacements: Record<string, string> = {},
): string {
  // Avoid using hooks here to allow safe calls from event handlers and utilities
  if (latestTranslateFn) {
    return latestTranslateFn(key, replacements);
  }
  return key;
}
