import { useLanguage } from './use-language';
import { useNationality } from './use-nationality';

/**
 * Custom hook that enhances the translation system with nationality-aware replacements
 * This hook wraps the standard translate function and handles dynamic replacement
 * of nationality-specific terms (Ghanaian/Ghanaians) with the selected nationality
 */
export function useNationalityAwareTranslate() {
  const { translate } = useLanguage();
  const { demonym, country } = useNationality();

  // Create an enhanced translate function that replaces nationality references
  const translateWithNationality = (key: string, replacements: Record<string, string> = {}) => {
    // Get the translation using the standard translate function
    let text = translate(key, replacements);
    
    // Skip if demonym is not available or is already Ghanaians
    if (!demonym || demonym === 'Ghanaians') {
      return text;
    }

    // Replace all instances of "Ghanaians" with the appropriate demonym (e.g., "Germans")
    if (text.includes('Ghanaians')) {
      text = text.replace(/Ghanaians/g, demonym);
    }

    // Replace "Ghanaian" with country-specific adjective
    // We need to handle this separately from the demonym
    // For most countries, we can use the demonym without the trailing 's'
    const adjectiveForm = demonym.endsWith('s') 
      ? demonym.slice(0, -1) 
      : demonym;
      
    if (text.includes('Ghanaian')) {
      text = text.replace(/Ghanaian/g, adjectiveForm);
    }

    return text;
  };

  return { translate: translateWithNationality, country, demonym };
}

// Shorthand for translate function
export function nt(key: string, replacements: Record<string, string> = {}): string {
  // This is a fallback for when the hook cannot be used directly
  // It will use the standard translate function
  const { translate } = useLanguage();
  const text = translate(key, replacements);
  
  // Get nationality info from the global window object
  const countryName = window.localStorage.getItem('user_nationality') || 'Ghana';
  const demonym = window.__nationalities?.[countryName] || 'Ghanaians';
  
  if (demonym === 'Ghanaians') {
    return text;
  }
  
  // Apply nationality-specific replacements
  let result = text;
  
  // Replace "Ghanaians" with demonym
  if (result.includes('Ghanaians')) {
    result = result.replace(/Ghanaians/g, demonym);
  }
  
  // Replace "Ghanaian" with adjective form
  const adjectiveForm = demonym.endsWith('s') ? demonym.slice(0, -1) : demonym;
  if (result.includes('Ghanaian')) {
    result = result.replace(/Ghanaian/g, adjectiveForm);
  }
  
  return result;
}