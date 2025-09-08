import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AppSpecificNationalityContextType {
  meetPoolCountry: string;
  suitePoolCountry: string;
  setMeetPoolCountry: (country: string) => void;
  setSuitePoolCountry: (country: string) => void;
  getPoolCountryForApp: (appMode: 'MEET' | 'SUITE') => string;
  updatePoolCountryForApp: (appMode: 'MEET' | 'SUITE', country: string) => Promise<void>;
  isLoading: boolean;
}

const AppSpecificNationalityContext = createContext<AppSpecificNationalityContextType>({
  meetPoolCountry: 'ANYWHERE',
  suitePoolCountry: 'ANYWHERE',
  setMeetPoolCountry: () => {},
  setSuitePoolCountry: () => {},
  getPoolCountryForApp: () => 'ANYWHERE',
  updatePoolCountryForApp: async () => {},
  isLoading: true,
});

export function AppSpecificNationalityProvider({ children }: { children: ReactNode }) {
  const [meetPoolCountry, setMeetPoolCountry] = useState<string>('ANYWHERE');
  const [suitePoolCountry, setSuitePoolCountry] = useState<string>('ANYWHERE');

  // Fetch user's pool country preferences
  const { data: poolCountryData, isLoading } = useQuery({
    queryKey: ['/api/user/pool-country'],
    enabled: true,
  });

  // Update state when data is loaded
  useEffect(() => {
    if (poolCountryData) {
      setMeetPoolCountry(poolCountryData.meetPoolCountry || 'ANYWHERE');
      setSuitePoolCountry(poolCountryData.suitePoolCountry || 'ANYWHERE');
      console.log('[APP-SPECIFIC-NATIONALITY] Loaded preferences:', poolCountryData);
    }
  }, [poolCountryData]);

  const getPoolCountryForApp = (appMode: 'MEET' | 'SUITE'): string => {
    return appMode === 'MEET' ? meetPoolCountry : suitePoolCountry;
  };

  const updatePoolCountryForApp = async (appMode: 'MEET' | 'SUITE', country: string): Promise<void> => {
    try {
      const response = await fetch('/api/user/pool-country', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolCountry: country,
          appMode: appMode
        }),
      });

      if (response.ok) {
        // Update local state
        if (appMode === 'MEET') {
          setMeetPoolCountry(country);
        } else {
          setSuitePoolCountry(country);
        }
        console.log(`[APP-SPECIFIC-NATIONALITY] Updated ${appMode} pool country to: ${country}`);
      } else {
        throw new Error(`Failed to update ${appMode} pool country`);
      }
    } catch (error) {
      console.error(`[APP-SPECIFIC-NATIONALITY] Error updating ${appMode} pool country:`, error);
      throw error;
    }
  };

  return (
    <AppSpecificNationalityContext.Provider
      value={{
        meetPoolCountry,
        suitePoolCountry,
        setMeetPoolCountry,
        setSuitePoolCountry,
        getPoolCountryForApp,
        updatePoolCountryForApp,
        isLoading,
      }}
    >
      {children}
    </AppSpecificNationalityContext.Provider>
  );
}

export function useAppSpecificNationality() {
  const context = useContext(AppSpecificNationalityContext);
  if (!context) {
    throw new Error('useAppSpecificNationality must be used within an AppSpecificNationalityProvider');
  }
  return context;
}