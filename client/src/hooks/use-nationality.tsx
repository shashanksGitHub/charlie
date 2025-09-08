import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeStorageGet, safeStorageSet } from '../lib/storage-utils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useAppMode } from './use-app-mode';
import { queryClient } from '../lib/queryClient';

// Define the nationality mapping for demonyms (people from a specific country)
export const nationalityDemonymMap: Record<string, string> = {
  'ANYWHERE': 'Everyone',
  'Afghanistan': 'Afghans',
  'Albania': 'Albanians',
  'Algeria': 'Algerians',
  'Andorra': 'Andorrans',
  'Angola': 'Angolans',
  'Antigua and Barbuda': 'Antiguans',
  'Argentina': 'Argentinians',
  'Armenia': 'Armenians',
  'Australia': 'Australians',
  'Austria': 'Austrians',
  'Azerbaijan': 'Azerbaijanis',
  'Bahamas': 'Bahamians',
  'Bahrain': 'Bahrainis',
  'Bangladesh': 'Bangladeshis',
  'Barbados': 'Barbadians',
  'Belarus': 'Belarusians',
  'Belgium': 'Belgians',
  'Belize': 'Belizeans',
  'Benin': 'Beninese',
  'Bhutan': 'Bhutanese',
  'Bolivia': 'Bolivians',
  'Bosnia and Herzegovina': 'Bosnians',
  'Botswana': 'Botswanans',
  'Brazil': 'Brazilians',
  'Brunei': 'Bruneians',
  'Bulgaria': 'Bulgarians',
  'Burkina Faso': 'Burkinabé',
  'Burundi': 'Burundians',
  'Cambodia': 'Cambodians',
  'Cameroon': 'Cameroonians',
  'Canada': 'Canadians',
  'Cape Verde': 'Cape Verdeans',
  'Central African Republic': 'Central Africans',
  'Chad': 'Chadians',
  'Chile': 'Chileans',
  'China': 'Chinese',
  'Colombia': 'Colombians',
  'Comoros': 'Comorians',
  'Costa Rica': 'Costa Ricans',
  'Croatia': 'Croatians',
  'Cuba': 'Cubans',
  'Cyprus': 'Cypriots',
  'Czech Republic': 'Czechs',
  'Denmark': 'Danes',
  'Djibouti': 'Djiboutians',
  'Dominica': 'Dominicans',
  'Dominican Republic': 'Dominicans',
  'Ecuador': 'Ecuadorians',
  'Egypt': 'Egyptians',
  'El Salvador': 'Salvadorans',
  'Equatorial Guinea': 'Equatorial Guineans',
  'Eritrea': 'Eritreans',
  'Estonia': 'Estonians',
  'Eswatini': 'Swazis',
  'Ethiopia': 'Ethiopians',
  'Fiji': 'Fijians',
  'Finland': 'Finns',
  'France': 'French',
  'Gabon': 'Gabonese',
  'Gambia': 'Gambians',
  'Georgia': 'Georgians',
  'Germany': 'Germans',
  'Ghana': 'Ghanaians',
  'Greece': 'Greeks',
  'Grenada': 'Grenadians',
  'Guatemala': 'Guatemalans',
  'Guinea': 'Guineans',
  'Guinea-Bissau': 'Guinea-Bissauans',
  'Guyana': 'Guyanese',
  'Haiti': 'Haitians',
  'Honduras': 'Hondurans',
  'Hungary': 'Hungarians',
  'Iceland': 'Icelanders',
  'India': 'Indians',
  'Indonesia': 'Indonesians',
  'Iran': 'Iranians',
  'Iraq': 'Iraqis',
  'Ireland': 'Irish',
  'Israel': 'Israelis',
  'Italy': 'Italians',
  'Jamaica': 'Jamaicans',
  'Japan': 'Japanese',
  'Jordan': 'Jordanians',
  'Kazakhstan': 'Kazakhstanis',
  'Kenya': 'Kenyans',
  'Kiribati': 'I-Kiribati',
  'Kuwait': 'Kuwaitis',
  'Kyrgyzstan': 'Kyrgyzstanis',
  'Laos': 'Laotians',
  'Latvia': 'Latvians',
  'Lebanon': 'Lebanese',
  'Lesotho': 'Basotho',
  'Liberia': 'Liberians',
  'Libya': 'Libyans',
  'Liechtenstein': 'Liechtensteiners',
  'Lithuania': 'Lithuanians',
  'Luxembourg': 'Luxembourgers',
  'Madagascar': 'Malagasy',
  'Malawi': 'Malawians',
  'Malaysia': 'Malaysians',
  'Maldives': 'Maldivians',
  'Mali': 'Malians',
  'Malta': 'Maltese',
  'Marshall Islands': 'Marshallese',
  'Mauritania': 'Mauritanians',
  'Mauritius': 'Mauritians',
  'Mexico': 'Mexicans',
  'Micronesia': 'Micronesians',
  'Moldova': 'Moldovans',
  'Monaco': 'Monégasques',
  'Mongolia': 'Mongolians',
  'Montenegro': 'Montenegrins',
  'Morocco': 'Moroccans',
  'Mozambique': 'Mozambicans',
  'Myanmar': 'Burmese',
  'Namibia': 'Namibians',
  'Nauru': 'Nauruans',
  'Nepal': 'Nepalese',
  'Netherlands': 'Dutch',
  'New Zealand': 'New Zealanders',
  'Nicaragua': 'Nicaraguans',
  'Niger': 'Nigeriens',
  'Nigeria': 'Nigerians',
  'North Korea': 'North Koreans',
  'North Macedonia': 'Macedonians',
  'Norway': 'Norwegians',
  'Oman': 'Omanis',
  'Pakistan': 'Pakistanis',
  'Palau': 'Palauans',
  'Palestine': 'Palestinians',
  'Panama': 'Panamanians',
  'Papua New Guinea': 'Papua New Guineans',
  'Paraguay': 'Paraguayans',
  'Peru': 'Peruvians',
  'Philippines': 'Filipinos',
  'Poland': 'Poles',
  'Portugal': 'Portuguese',
  'Qatar': 'Qataris',
  'Romania': 'Romanians',
  'Russia': 'Russians',
  'Rwanda': 'Rwandans',
  'Saint Kitts and Nevis': 'Kittitians',
  'Saint Lucia': 'Saint Lucians',
  'Saint Vincent and the Grenadines': 'Vincentians',
  'Samoa': 'Samoans',
  'San Marino': 'Sammarinese',
  'Sao Tome and Principe': 'São Toméans',
  'Saudi Arabia': 'Saudis',
  'Senegal': 'Senegalese',
  'Serbia': 'Serbians',
  'Seychelles': 'Seychellois',
  'Sierra Leone': 'Sierra Leoneans',
  'Singapore': 'Singaporeans',
  'Slovakia': 'Slovaks',
  'Slovenia': 'Slovenians',
  'Solomon Islands': 'Solomon Islanders',
  'Somalia': 'Somalis',
  'South Africa': 'South Africans',
  'South Korea': 'South Koreans',
  'South Sudan': 'South Sudanese',
  'Spain': 'Spaniards',
  'Sri Lanka': 'Sri Lankans',
  'Sudan': 'Sudanese',
  'Suriname': 'Surinamese',
  'Sweden': 'Swedes',
  'Switzerland': 'Swiss',
  'Syria': 'Syrians',
  'Taiwan': 'Taiwanese',
  'Tajikistan': 'Tajiks',
  'Tanzania': 'Tanzanians',
  'Thailand': 'Thais',
  'Timor-Leste': 'Timorese',
  'Togo': 'Togolese',
  'Tonga': 'Tongans',
  'Trinidad and Tobago': 'Trinidadians',
  'Tunisia': 'Tunisians',
  'Turkey': 'Turks',
  'Turkmenistan': 'Turkmens',
  'Tuvalu': 'Tuvaluans',
  'Uganda': 'Ugandans',
  'Ukraine': 'Ukrainians',
  'United Arab Emirates': 'Emiratis',
  'United Kingdom': 'British',
  'United States': 'Americans',
  'Uruguay': 'Uruguayans',
  'Uzbekistan': 'Uzbeks',
  'Vanuatu': 'Ni-Vanuatu',
  'Vatican City': 'Vatican Citizens',
  'Venezuela': 'Venezuelans',
  'Vietnam': 'Vietnamese',
  'Yemen': 'Yemenis',
  'Zambia': 'Zambians',
  'Zimbabwe': 'Zimbabweans'
};

// Local storage key for nationality
const NATIONALITY_STORAGE_KEY = 'user_nationality';

// Define the context type
interface NationalityContextType {
  country: string;
  setCountry: (country: string) => void;
  demonym: string;
  resetCountry: () => void;
}

// Create the context with default values
const NationalityContext = createContext<NationalityContextType>({
  country: 'ANYWHERE',
  setCountry: () => {},
  demonym: 'Everyone',
  resetCountry: () => {}
});

// Provider component
export function NationalityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentMode } = useAppMode();
  
  // Get app-specific pool country data
  const { data: poolCountryData } = useQuery({
    queryKey: ["/api/user/pool-country"],
    enabled: !!user?.id,
    queryFn: async () => {
      console.log("[NATIONALITY-HOOK] Fetching app-specific pool country data");
      const response = await fetch('/api/user/pool-country', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        console.warn("[NATIONALITY-HOOK] Pool country fetch failed, using localStorage fallback");
        return null;
      }
      
      const data = await response.json();
      console.log("[NATIONALITY-HOOK] Pool country data loaded:", data);
      return data;
    },
  });
  
  // Use app mode for context instead of path detection
  const appContext = currentMode === 'SUITE' ? 'SUITE' : 'MEET';
  console.log("[NATIONALITY-HOOK] Using app context from useAppMode:", appContext, "currentMode:", currentMode);
  
  const [country, setCountryState] = useState<string>(() => {
    // Try to get the nationality from local storage on initial load as fallback
    const savedCountry = safeStorageGet(NATIONALITY_STORAGE_KEY);
    console.log("[NATIONALITY-HOOK] Loaded saved country from localStorage:", savedCountry);
    const result = savedCountry || 'ANYWHERE'; // Default to ANYWHERE for inclusive global experience
    console.log("[NATIONALITY-HOOK] Using initial country:", result);
    return result;
  });
  
  // Update country based on app-specific pool country data
  useEffect(() => {
    console.log('[NATIONALITY-HOOK] Effect triggered:', { poolCountryData, appContext, userId: user?.id, currentCountry: country, currentMode });
    
    if (poolCountryData && user?.id) {
      const targetCountry = appContext === 'SUITE' 
        ? poolCountryData.suitePoolCountry 
        : poolCountryData.meetPoolCountry;
      
      console.log(`[NATIONALITY-HOOK] App-specific country for ${appContext}:`, targetCountry);
      console.log(`[NATIONALITY-HOOK] Current country: ${country}, Target country: ${targetCountry}`);
      
      if (targetCountry && targetCountry !== country) {
        console.log(`[NATIONALITY-HOOK] Updating country from ${country} to ${targetCountry} for ${appContext} context`);
        setCountryState(targetCountry);
      } else if (targetCountry) {
        console.log(`[NATIONALITY-HOOK] Country already matches target: ${targetCountry}`);
      }
    } else {
      console.log('[NATIONALITY-HOOK] Missing data:', { hasPoolData: !!poolCountryData, hasUser: !!user?.id });
    }
  }, [poolCountryData, appContext, user?.id, country, currentMode]);

  // Calculate the demonym based on the country
  const demonym = nationalityDemonymMap[country] || 'Everyone';

  // Function to set the country and save it to local storage AND update database
  const setCountry = async (newCountry: string) => {
    console.log("[NATIONALITY-HOOK] Setting country to:", newCountry);
    
    // Optimistic update: immediately update UI state
    setCountryState(newCountry);
    safeStorageSet(NATIONALITY_STORAGE_KEY, newCountry);
    
    // Update app-specific pool country in database
    if (user?.id) {
      try {
        const fieldName = appContext === 'SUITE' ? 'suitePoolCountry' : 'meetPoolCountry';
        console.log(`[NATIONALITY-HOOK] Updating ${fieldName} to ${newCountry} in database`);
        
        // Optimistic cache update before API call
        queryClient.setQueryData(["/api/user/pool-country"], (oldData: any) => {
          if (oldData) {
            const fieldName = appContext === 'SUITE' ? 'suitePoolCountry' : 'meetPoolCountry';
            console.log(`[NATIONALITY-HOOK] Optimistic cache update: ${fieldName} = ${newCountry}`);
            return {
              ...oldData,
              [fieldName]: newCountry
            };
          }
          return oldData;
        });
        
        const response = await fetch('/api/user/pool-country', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            poolCountry: newCountry, 
            appMode: appContext 
          }),
        });
        
        if (response.ok) {
          console.log("[NATIONALITY-HOOK] Database updated successfully");
          
          // Refetch to ensure consistency with server
          await queryClient.invalidateQueries({ 
            queryKey: ["/api/user/pool-country"] 
          });
          
          console.log("[NATIONALITY-HOOK] Pool country cache refreshed from server");
        } else {
          console.warn("[NATIONALITY-HOOK] Database update failed, reverting optimistic update");
          
          // Revert optimistic update on failure
          await queryClient.invalidateQueries({ 
            queryKey: ["/api/user/pool-country"] 
          });
        }
      } catch (error) {
        console.error("[NATIONALITY-HOOK] Error updating database:", error);
        
        // Revert optimistic update on error
        await queryClient.invalidateQueries({ 
          queryKey: ["/api/user/pool-country"] 
        });
      }
    }
    
    console.log("[NATIONALITY-HOOK] Country update process completed");
  };

  // Function to reset country to default
  const resetCountry = () => {
    setCountryState('ANYWHERE');
    safeStorageSet(NATIONALITY_STORAGE_KEY, 'ANYWHERE');
  };

  // When country changes, save it to local storage
  useEffect(() => {
    safeStorageSet(NATIONALITY_STORAGE_KEY, country);
  }, [country]);

  return (
    <NationalityContext.Provider value={{ country, setCountry, demonym, resetCountry }}>
      {children}
    </NationalityContext.Provider>
  );
}

// Hook to use the nationality context
export function useNationality() {
  const context = useContext(NationalityContext);
  if (!context) {
    throw new Error('useNationality must be used within a NationalityProvider');
  }
  return context;
}