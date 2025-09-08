export interface Religion {
  name: string;
  value: string;
}

export interface ReligionGroup {
  name: string;
  value: string;
  denominations: Religion[];
}

import { GlobalReligion } from "@shared/schema";

// Default built-in religions
export const DEFAULT_RELIGIONS: ReligionGroup[] = [
  {
    name: "Christianity",
    value: "christianity",
    denominations: [
      { name: "Roman Catholic", value: "christianity-roman-catholic" },
      { name: "Methodist", value: "christianity-methodist" },
      { name: "Presbyterian", value: "christianity-presbyterian" },
      { name: "Anglican", value: "christianity-anglican" },
      { name: "Pentecostal", value: "christianity-pentecostal" },
      { name: "Charismatic", value: "christianity-charismatic" },
      { name: "Baptist", value: "christianity-baptist" },
      { name: "Seventh Day Adventist", value: "christianity-seventh-day-adventist" },
      { name: "Evangelical", value: "christianity-evangelical" },
      { name: "Church of Christ", value: "christianity-church-of-christ" },
      { name: "Apostolic", value: "christianity-apostolic" },
      { name: "Lutheran", value: "christianity-lutheran" },
      { name: "Jehovah's Witness", value: "christianity-jehovahs-witness" },
      { name: "Salvation Army", value: "christianity-salvation-army" },
      { name: "Other Christian", value: "christianity-other" }
    ]
  },
  {
    name: "Islam",
    value: "islam",
    denominations: [
      { name: "Sunni", value: "islam-sunni" },
      { name: "Ahmadiyya", value: "islam-ahmadiyya" },
      { name: "Shia", value: "islam-shia" },
      { name: "Sufi", value: "islam-sufi" },
      { name: "Other Islamic", value: "islam-other" }
    ]
  },
  {
    name: "Traditional Religions",
    value: "traditional",
    denominations: [
      { name: "Akan Traditional", value: "traditional-akan" },
      { name: "Ewe Traditional", value: "traditional-ewe" },
      { name: "Ga-Adangme Traditional", value: "traditional-ga-adangme" },
      { name: "Dagbani Traditional", value: "traditional-dagbani" },
      { name: "Other Traditional", value: "traditional-other" }
    ]
  },
  {
    name: "Other Religions",
    value: "other",
    denominations: [
      { name: "Bahai", value: "other-bahai" },
      { name: "Buddhism", value: "other-buddhism" },
      { name: "Hinduism", value: "other-hinduism" },
      { name: "Judaism", value: "other-judaism" },
      { name: "Rastafarianism", value: "other-rastafarianism" },
      { name: "Other", value: "other-other" }
    ]
  },
  {
    name: "No Religion",
    value: "none",
    denominations: [
      { name: "Atheist", value: "none-atheist" },
      { name: "Agnostic", value: "none-agnostic" },
      { name: "Secular", value: "none-secular" },
      { name: "Prefer not to say", value: "none-prefer-not-to-say" }
    ]
  }
];

// Initialize our combined religions object
export let religions: ReligionGroup[] = [...DEFAULT_RELIGIONS];

// Let's create a group for community-added global religions
const globalReligionsGroup: ReligionGroup = {
  name: "Community Added",
  value: "global",
  denominations: []
};

// Function to convert global religions to our format
export function convertGlobalReligionsToFormat(globalReligions: GlobalReligion[]): Religion[] {
  return globalReligions.map(religion => ({
    name: religion.religion,
    value: `global-${religion.id}`
  }));
}

// Function to load global religions from the API
export async function loadGlobalReligions(): Promise<void> {
  try {
    const response = await fetch('/api/global-religions');
    if (!response.ok) {
      throw new Error('Failed to fetch global religions');
    }
    
    const globalReligions: GlobalReligion[] = await response.json();
    
    // Convert to our format
    const globalReligionsFormatted = convertGlobalReligionsToFormat(globalReligions);
    
    // Update the global religions group
    globalReligionsGroup.denominations = globalReligionsFormatted.map(r => ({
      name: r.name,
      value: r.value
    }));
    
    // Add the group to our religions array if it has items
    if (globalReligionsFormatted.length > 0) {
      // Remove existing global group if it exists
      religions = religions.filter(r => r.value !== 'global');
      // Add the updated global group
      religions = [...DEFAULT_RELIGIONS, globalReligionsGroup];
    }
    
    console.log('Global religions loaded successfully:', globalReligions.length);
  } catch (error) {
    console.error('Error loading global religions:', error);
    // If there's an error, make sure we at least have the default religions
    religions = [...DEFAULT_RELIGIONS];
  }
}

// Function to add a new global religion
export async function addGlobalReligion(religionName: string): Promise<Religion | undefined> {
  try {
    const response = await fetch('/api/global-religions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        religion: religionName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add global religion');
    }
    
    const newGlobalReligion: GlobalReligion = await response.json();
    
    // Convert to our format
    const newReligion = {
      name: newGlobalReligion.religion,
      value: `global-${newGlobalReligion.id}`
    };
    
    // Add to the global religions group if it exists
    const existingGlobalGroup = religions.find(r => r.value === 'global');
    if (existingGlobalGroup) {
      // Add to existing group if not already there
      if (!existingGlobalGroup.denominations.some(d => d.value === newReligion.value)) {
        existingGlobalGroup.denominations.push({
          name: newReligion.name,
          value: newReligion.value
        });
      }
    } else {
      // Create the global group if it doesn't exist
      globalReligionsGroup.denominations = [{
        name: newReligion.name,
        value: newReligion.value
      }];
      religions = [...religions, globalReligionsGroup];
    }
    
    return newReligion;
  } catch (error) {
    console.error('Error adding global religion:', error);
    return undefined;
  }
}

/**
 * Get a flat list of all religions including their denominations
 * Format: "Religion - Denomination"
 */
export function getFlattenedReligionsList(): Religion[] {
  const flatList: Religion[] = [];
  
  religions.forEach((religion: ReligionGroup) => {
    religion.denominations.forEach((denomination: Religion) => {
      // For global religions, don't add the religion name prefix
      if (religion.value === 'global') {
        flatList.push({
          name: denomination.name,
          value: denomination.value
        });
      } else {
        flatList.push({
          name: `${religion.name} - ${denomination.name}`,
          value: denomination.value
        });
      }
    });
  });
  
  return flatList;
}

/**
 * Get a religion's display name from its value
 */
export function getReligionDisplayName(value: string): string {
  // Check for global religion format
  if (value.startsWith('global-')) {
    // Find in global religions group
    const globalGroup = religions.find((r: ReligionGroup) => r.value === 'global');
    if (globalGroup) {
      const denomination = globalGroup.denominations.find((d: Religion) => d.value === value);
      if (denomination) {
        return denomination.name;
      }
    }
  }
  
  // Check in standard religions
  for (const religion of religions) {
    for (const denomination of religion.denominations) {
      if (denomination.value === value) {
        return religion.value === 'global' 
          ? denomination.name 
          : `${religion.name} - ${denomination.name}`;
      }
    }
  }
  
  return "Not specified";
}