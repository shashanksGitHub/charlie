// Default built-in list of tribes in Ghana
export const DEFAULT_GHANA_TRIBES = [
  // Major ethnic groups with their sub-groups
  { value: "Akan-Ashanti", label: "Akan - Ashanti" },
  { value: "Akan-Fante", label: "Akan - Fante" },
  { value: "Akan-Akuapem", label: "Akan - Akuapem" },
  { value: "Akan-Akyem", label: "Akan - Akyem" },
  { value: "Akan-Kwahu", label: "Akan - Kwahu" },
  { value: "Akan-Bono", label: "Akan - Bono" },
  { value: "Akan-Assin", label: "Akan - Assin" },
  { value: "Akan-Denkyira", label: "Akan - Denkyira" },
  { value: "Akan-Adansi", label: "Akan - Adansi" },
  { value: "Ewe", label: "Ewe" },
  { value: "Ga", label: "Ga" },
  { value: "Adangbe", label: "Adangbe" },
  { value: "Dagomba", label: "Dagomba" },
  { value: "Dagaaba", label: "Dagaaba" },
  { value: "Frafra", label: "Frafra" },
  { value: "Gonja", label: "Gonja" },
  { value: "Mamprusi", label: "Mamprusi" },
  { value: "Wala", label: "Wala" },
  { value: "Sisaala", label: "Sisaala" },
  { value: "Kasena", label: "Kasena" },
  { value: "Kusasi", label: "Kusasi" },
  { value: "Konkomba", label: "Konkomba" },
  { value: "Bimoba", label: "Bimoba" },
  { value: "Gurma", label: "Gurma" },
  { value: "Nzema", label: "Nzema" },
  { value: "Ahanta", label: "Ahanta" },
  { value: "Guan", label: "Guan" },
  { value: "Efutu", label: "Efutu" },
  { value: "Aowin", label: "Aowin" },
  { value: "Sefwi", label: "Sefwi" },
  { value: "Birifor", label: "Birifor" },
  { value: "Mo", label: "Mo" },
  { value: "Vagala", label: "Vagala" },
  { value: "Lobi", label: "Lobi" },
  { value: "Basari", label: "Basari" },
  { value: "Chokosi", label: "Chokosi" },
  { value: "Kotokoli", label: "Kotokoli" },
  { value: "Hausa", label: "Hausa" },
  { value: "Other-Ghanaian", label: "Other Ghanaian Tribe" },
  { value: "Mixed-Heritage", label: "Mixed Heritage" }
];

// This will be populated from the API
export let GHANA_TRIBES = [...DEFAULT_GHANA_TRIBES];

import { GlobalTribe } from "@shared/schema";

// Function to convert global tribe to the dropdown format
export function convertGlobalTribesToDropdownFormat(globalTribes: GlobalTribe[]): { value: string, label: string }[] {
  return globalTribes.map(tribe => ({
    value: `global-${tribe.id}`,
    label: tribe.tribe
  }));
}

// Function to load tribes from the API
export async function loadGlobalTribes(): Promise<void> {
  try {
    const response = await fetch('/api/global-tribes');
    if (!response.ok) {
      throw new Error('Failed to fetch global tribes');
    }
    
    const globalTribes: GlobalTribe[] = await response.json();
    
    // Convert global tribes to dropdown format
    const globalTribeOptions = convertGlobalTribesToDropdownFormat(globalTribes);
    
    // Combine default tribes with global tribes
    GHANA_TRIBES = [...DEFAULT_GHANA_TRIBES, ...globalTribeOptions];
    
    console.log('Global tribes loaded successfully:', globalTribes.length);
  } catch (error) {
    console.error('Error loading global tribes:', error);
    // If there's an error, make sure we at least have the default tribes
    GHANA_TRIBES = [...DEFAULT_GHANA_TRIBES];
  }
}

// Function to add a new global tribe
export async function addGlobalTribe(tribeName: string): Promise<{ value: string, label: string } | undefined> {
  try {
    const response = await fetch('/api/global-tribes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tribe: tribeName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add global tribe');
    }
    
    const newGlobalTribe: GlobalTribe = await response.json();
    
    // Convert to dropdown format
    const newTribeOption = {
      value: `global-${newGlobalTribe.id}`,
      label: newGlobalTribe.tribe
    };
    
    // Add to the local array if it's not already there
    if (!GHANA_TRIBES.some(t => t.value === newTribeOption.value)) {
      GHANA_TRIBES = [...GHANA_TRIBES, newTribeOption];
    }
    
    return newTribeOption;
  } catch (error) {
    console.error('Error adding global tribe:', error);
    return undefined;
  }
}

// Function to get tribe label by value
export function getTribeLabel(value: string): string {
  const tribe = GHANA_TRIBES.find(tribe => tribe.value === value);
  return tribe ? tribe.label : value;
}

// Dynamically generated tribe groups
export function getTribeGroups() {
  return [
    {
      label: "Akan Groups",
      options: DEFAULT_GHANA_TRIBES.filter(tribe => tribe.value.startsWith("Akan-"))
    },
    {
      label: "Ga-Adangbe Groups",
      options: DEFAULT_GHANA_TRIBES.filter(tribe => tribe.value === "Ga" || tribe.value === "Adangbe")
    },
    {
      label: "Northern Groups",
      options: [
        "Dagomba", "Dagaaba", "Frafra", "Gonja", "Mamprusi", "Wala", "Sisaala", 
        "Kasena", "Kusasi", "Konkomba", "Bimoba", "Gurma", "Birifor", "Lobi"
      ].map(value => DEFAULT_GHANA_TRIBES.find(tribe => tribe.value === value)!).filter(Boolean)
    },
    {
      label: "Other Standard Groups",
      options: DEFAULT_GHANA_TRIBES.filter(tribe => 
        !tribe.value.startsWith("Akan-") && 
        tribe.value !== "Ga" && 
        tribe.value !== "Adangbe" &&
        ![
          "Dagomba", "Dagaaba", "Frafra", "Gonja", "Mamprusi", "Wala", "Sisaala", 
          "Kasena", "Kusasi", "Konkomba", "Bimoba", "Gurma", "Birifor", "Lobi"
        ].includes(tribe.value) &&
        !["Other-Ghanaian", "Mixed-Heritage"].includes(tribe.value)
      )
    },
    {
      label: "Other",
      options: DEFAULT_GHANA_TRIBES.filter(tribe => 
        tribe.value === "Other-Ghanaian" || tribe.value === "Mixed-Heritage"
      )
    },
    // Add global tribes as a separate group if any exist
    ...(GHANA_TRIBES.some(t => t.value.startsWith('global-')) 
      ? [{
          label: "Community Added",
          options: GHANA_TRIBES.filter(tribe => tribe.value.startsWith('global-'))
        }]
      : [])
  ];
}

// For backward compatibility
export const TRIBE_GROUPS = getTribeGroups();