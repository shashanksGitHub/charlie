// Essential cities database - minimal fallback for Google Places API
// Focuses on unique localities that might not be well-covered by Google Places

export interface City {
  city: string;
  country: string;
}

// Cities, towns, neighborhoods, and settlements in Ghana - ultra comprehensive list organized by regions
export const ghanaianCities: City[] = [
  // GREATER ACCRA REGION
  // Major cities and towns
  { city: "Accra", country: "Ghana" },
  { city: "Tema", country: "Ghana" },
  { city: "Ashaiman", country: "Ghana" },
  { city: "Madina", country: "Ghana" },
  { city: "Adenta", country: "Ghana" },
  { city: "Teshie", country: "Ghana" },
  { city: "Nungua", country: "Ghana" },
  { city: "La", country: "Ghana" },
  { city: "Osu", country: "Ghana" },
  { city: "Dome", country: "Ghana" },
  { city: "Kasoa", country: "Ghana" },
  { city: "Ga", country: "Ghana" },
  { city: "Akweteyman", country: "Ghana" },
  { city: "Legon", country: "Ghana" },
  { city: "Dodowa", country: "Ghana" },
  { city: "Abokobi", country: "Ghana" },
  { city: "Ada", country: "Ghana" },
  { city: "Dawhenya", country: "Ghana" },
  { city: "Prampram", country: "Ghana" },
  { city: "Sege", country: "Ghana" },
  { city: "Battor", country: "Ghana" },
  { city: "Oyibi", country: "Ghana" },
  { city: "Aburi", country: "Ghana" },
  { city: "Pantang", country: "Ghana" },
  { city: "Pokuase", country: "Ghana" },
  { city: "Amasaman", country: "Ghana" },
  { city: "Gbawe", country: "Ghana" },
  { city: "McCarthy Hill", country: "Ghana" },
  { city: "Ablekuma", country: "Ghana" },
  { city: "Bortianor", country: "Ghana" },
  { city: "Weija", country: "Ghana" },
  { city: "Ngleshie Amanfro", country: "Ghana" },
  { city: "Kokrobite", country: "Ghana" },
  { city: "Dansoman", country: "Ghana" },
  { city: "Jamestown", country: "Ghana" },
  { city: "Chorkor", country: "Ghana" },
  { city: "Korle Bu", country: "Ghana" },
  { city: "Mamprobi", country: "Ghana" },
  { city: "Odorkor", country: "Ghana" },
  { city: "Kaneshie", country: "Ghana" },
  { city: "Abeka", country: "Ghana" },
  { city: "Darkuman", country: "Ghana" },
  { city: "Tesano", country: "Ghana" },
  { city: "Alajo", country: "Ghana" },
  { city: "Kokomlemle", country: "Ghana" },
  { city: "Achimota", country: "Ghana" },
  { city: "New Town", country: "Ghana" },
  { city: "Kotobabi", country: "Ghana" },
  { city: "Nima", country: "Ghana" },
  { city: "Maamobi", country: "Ghana" },
  { city: "Kanda", country: "Ghana" },
  { city: "Accra Central", country: "Ghana" },
  { city: "Adabraka", country: "Ghana" },
  { city: "Ridge", country: "Ghana" },
  { city: "North Ridge", country: "Ghana" },
  { city: "West Ridge", country: "Ghana" },
  { city: "East Ridge", country: "Ghana" },
  { city: "Airport Residential Area", country: "Ghana" },
  { city: "Cantonments", country: "Ghana" },
  { city: "Labone", country: "Ghana" },
  { city: "Labadi", country: "Ghana" },
  { city: "North Labone", country: "Ghana" },
  { city: "Ringway Estates", country: "Ghana" },
  { city: "Roman Ridge", country: "Ghana" },
  { city: "Abelemkpe", country: "Ghana" },
  { city: "Dzorwulu", country: "Ghana" },
  { city: "East Legon", country: "Ghana" },
  { city: "East Legon Hills", country: "Ghana" },
  { city: "East Legon Extension", country: "Ghana" },
  { city: "Okponglo", country: "Ghana" },
  { city: "Shiashie", country: "Ghana" },
  { city: "Tetteh Quarshie", country: "Ghana" },
  { city: "Baatsona", country: "Ghana" },
  { city: "Spintex", country: "Ghana" },
  { city: "Sakumono", country: "Ghana" },
  { city: "Community 25", country: "Ghana" },
  { city: "Lapaz", country: "Ghana" },
  
  // ASHANTI REGION
  { city: "Kumasi", country: "Ghana" },
  { city: "Obuasi", country: "Ghana" },
  { city: "Ejisu", country: "Ghana" },
  { city: "Konongo", country: "Ghana" },
  { city: "Mampong", country: "Ghana" },
  { city: "Offinso", country: "Ghana" },
  { city: "Bekwai", country: "Ghana" },
  { city: "Agona", country: "Ghana" },
  { city: "Jacobu", country: "Ghana" },
  { city: "Nyinahin", country: "Ghana" },
  { city: "Tepa", country: "Ghana" },
  { city: "Kenyase", country: "Ghana" },
  { city: "Manso", country: "Ghana" },
  { city: "Dunkwa", country: "Ghana" },
  { city: "Fumesua", country: "Ghana" },
  { city: "Atwima", country: "Ghana" },
  { city: "Boankra", country: "Ghana" },
  { city: "Ahinsan", country: "Ghana" },
  { city: "Ahodwo", country: "Ghana" },
  { city: "Asokwa", country: "Ghana" },
  { city: "Bantama", country: "Ghana" },
  { city: "Kwadaso", country: "Ghana" },
  { city: "Suame", country: "Ghana" },
  { city: "Tafo", country: "Ghana" },
  { city: "Nhyiaeso", country: "Ghana" },
  { city: "Dichemso", country: "Ghana" },
  { city: "Ayigya", country: "Ghana" },
  { city: "Kotei", country: "Ghana" },
  { city: "Emena", country: "Ghana" },
  { city: "Adum", country: "Ghana" },
  { city: "Asafo", country: "Ghana" },
  { city: "Manhyia", country: "Ghana" },
  { city: "Feyiase", country: "Ghana" },
  { city: "Abrepo", country: "Ghana" },
  { city: "Ashtown", country: "Ghana" },

  // NORTHERN REGION
  { city: "Tamale", country: "Ghana" },
  { city: "Yendi", country: "Ghana" },
  { city: "Salaga", country: "Ghana" },
  { city: "Bimbilla", country: "Ghana" },
  { city: "Savelugu", country: "Ghana" },
  { city: "Karaga", country: "Ghana" },
  { city: "Gushegu", country: "Ghana" },
  { city: "Tolon", country: "Ghana" },
  { city: "Daboya", country: "Ghana" },
  { city: "Kpandai", country: "Ghana" },
  { city: "Walewale", country: "Ghana" },
  { city: "Nalerigu", country: "Ghana" },
  { city: "Gambaga", country: "Ghana" },

  // CENTRAL REGION
  { city: "Cape Coast", country: "Ghana" },
  { city: "Elmina", country: "Ghana" },
  { city: "Winneba", country: "Ghana" },
  { city: "Swedru", country: "Ghana" },
  { city: "Kasoa", country: "Ghana" },
  { city: "Dunkwa-on-Offin", country: "Ghana" },
  { city: "Twifo Praso", country: "Ghana" },
  { city: "Agona Swedru", country: "Ghana" },
  { city: "Nyakrom", country: "Ghana" },
  { city: "Saltpond", country: "Ghana" },
  { city: "Anomabo", country: "Ghana" },
  { city: "Mankessim", country: "Ghana" },
  { city: "Abura Dunkwa", country: "Ghana" },
  { city: "Diaso", country: "Ghana" },
  { city: "Tarkwa", country: "Ghana" },
  { city: "Prestea", country: "Ghana" },
  { city: "Bogoso", country: "Ghana" },
  { city: "Nsuta", country: "Ghana" },
  { city: "Huni Valley", country: "Ghana" },

  // WESTERN REGION
  { city: "Sekondi-Takoradi", country: "Ghana" },
  { city: "Axim", country: "Ghana" },
  { city: "Half Assini", country: "Ghana" },
  { city: "Elubo", country: "Ghana" },
  { city: "Nkroful", country: "Ghana" },
  { city: "Agona", country: "Ghana" },
  { city: "Tarkwa", country: "Ghana" },
  { city: "Prestea", country: "Ghana" },
  { city: "Bogoso", country: "Ghana" },
  { city: "Nsuta", country: "Ghana" },
  { city: "Dunkwa", country: "Ghana" },
  { city: "Obuasi", country: "Ghana" },
  { city: "Bibiani", country: "Ghana" },
  { city: "Sefwi Wiawso", country: "Ghana" },
  { city: "Daboase", country: "Ghana" },
  { city: "Inchaban", country: "Ghana" },
  { city: "Shama", country: "Ghana" },

  // EASTERN REGION
  { city: "Koforidua", country: "Ghana" },
  { city: "Akropong", country: "Ghana" },
  { city: "Aburi", country: "Ghana" },
  { city: "Kibi", country: "Ghana" },
  { city: "Akim Oda", country: "Ghana" },
  { city: "Begoro", country: "Ghana" },
  { city: "Mpraeso", country: "Ghana" },
  { city: "Nkawkaw", country: "Ghana" },
  { city: "Akwatia", country: "Ghana" },
  { city: "Asamankese", country: "Ghana" },
  { city: "Nsawam", country: "Ghana" },
  { city: "Suhum", country: "Ghana" },
  { city: "Kyebi", country: "Ghana" },
  { city: "Somanya", country: "Ghana" },
  { city: "Odumase Krobo", country: "Ghana" },
  { city: "Akuse", country: "Ghana" },
  { city: "Atimpoku", country: "Ghana" },
  { city: "New Tafo", country: "Ghana" },

  // VOLTA REGION
  { city: "Ho", country: "Ghana" },
  { city: "Hohoe", country: "Ghana" },
  { city: "Keta", country: "Ghana" },
  { city: "Anloga", country: "Ghana" },
  { city: "Dzodze", country: "Ghana" },
  { city: "Aflao", country: "Ghana" },
  { city: "Denu", country: "Ghana" },
  { city: "Kpando", country: "Ghana" },
  { city: "Jasikan", country: "Ghana" },
  { city: "Kadjebi", country: "Ghana" },
  { city: "Nkwanta", country: "Ghana" },
  { city: "Dambai", country: "Ghana" },
  { city: "Krachi", country: "Ghana" },
  { city: "Kete Krachi", country: "Ghana" },
  { city: "Worawora", country: "Ghana" },
  { city: "Have", country: "Ghana" },
  { city: "Akatsi", country: "Ghana" },
  { city: "Sogakope", country: "Ghana" },
  { city: "Dabala", country: "Ghana" },

  // BRONG AHAFO REGION
  { city: "Sunyani", country: "Ghana" },
  { city: "Techiman", country: "Ghana" },
  { city: "Berekum", country: "Ghana" },
  { city: "Dormaa Ahenkro", country: "Ghana" },
  { city: "Wenchi", country: "Ghana" },
  { city: "Kintampo", country: "Ghana" },
  { city: "Atebubu", country: "Ghana" },
  { city: "Nkoranza", country: "Ghana" },
  { city: "Bechem", country: "Ghana" },
  { city: "Drobo", country: "Ghana" },
  { city: "Goaso", country: "Ghana" },
  { city: "Hwidiem", country: "Ghana" },
  { city: "Sampa", country: "Ghana" },
  { city: "Duayaw Nkwanta", country: "Ghana" },
  { city: "Yeji", country: "Ghana" },
  { city: "Prang", country: "Ghana" },

  // UPPER EAST REGION
  { city: "Bolgatanga", country: "Ghana" },
  { city: "Bawku", country: "Ghana" },
  { city: "Navrongo", country: "Ghana" },
  { city: "Zebilla", country: "Ghana" },
  { city: "Paga", country: "Ghana" },
  { city: "Sandema", country: "Ghana" },
  { city: "Fada N'gourma", country: "Ghana" },
  { city: "Tongo", country: "Ghana" },
  { city: "Garu", country: "Ghana" },

  // UPPER WEST REGION  
  { city: "Wa", country: "Ghana" },
  { city: "Tumu", country: "Ghana" },
  { city: "Lawra", country: "Ghana" },
  { city: "Jirapa", country: "Ghana" },
  { city: "Nandom", country: "Ghana" },
  { city: "Funsi", country: "Ghana" },
  { city: "Hamile", country: "Ghana" },
  { city: "Gwollu", country: "Ghana" },
  { city: "Lambussie", country: "Ghana" },

  // ADDITIONAL TOWNS AND SETTLEMENTS
  { city: "Kpong", country: "Ghana" },
  { city: "Senchi", country: "Ghana" },
  { city: "Frankadua", country: "Ghana" },
  { city: "Bunso", country: "Ghana" },
  { city: "Oyoko", country: "Ghana" },
  { city: "Adukrom", country: "Ghana" },
  { city: "Mamfe", country: "Ghana" },
  { city: "Obomeng", country: "Ghana" },
  { city: "Kokompe", country: "Ghana" },
  { city: "Asesewa", country: "Ghana" },
  { city: "Akyem Tafo", country: "Ghana" },
  { city: "Akim Swedru", country: "Ghana" },
  { city: "Kade", country: "Ghana" },
  { city: "Asiakwa", country: "Ghana" },
  { city: "Kukurantumi", country: "Ghana" },
  { city: "Osiem", country: "Ghana" },
  { city: "Apedwa", country: "Ghana" },
  { city: "Anyinam", country: "Ghana" },
  { city: "Asafo", country: "Ghana" },
  { city: "Ofoase", country: "Ghana" },
  { city: "Mangoase", country: "Ghana" },
  { city: "Akyem Oda", country: "Ghana" },
  { city: "Abomosu", country: "Ghana" },
  { city: "Sekyedumase", country: "Ghana" },
  { city: "Ahafo Ano", country: "Ghana" },
  { city: "Goaso", country: "Ghana" },
  { city: "Sankore", country: "Ghana" },
  { city: "Acherensua", country: "Ghana" },
  { city: "Hwediem", country: "Ghana" },
  { city: "Kukuom", country: "Ghana" },
  { city: "Mim", country: "Ghana" },
  { city: "Mehame", country: "Ghana" },
  { city: "Nsawkaw", country: "Ghana" },
  { city: "Akomadan", country: "Ghana" },
  { city: "Akumadan", country: "Ghana" },
  { city: "Effiduase", country: "Ghana" },
  { city: "Asante Mampong", country: "Ghana" },
  { city: "Agogo", country: "Ghana" },
  { city: "Drobonso", country: "Ghana" },
  { city: "Antoa", country: "Ghana" },
  { city: "Juaso", country: "Ghana" },
  { city: "Konongo", country: "Ghana" },
  { city: "Patasi", country: "Ghana" },
  { city: "Brodekwano", country: "Ghana" },
  { city: "Aboabo", country: "Ghana" },
  { city: "Santase", country: "Ghana" },
  { city: "Pankrono", country: "Ghana" },
  { city: "Buokrom", country: "Ghana" },
  { city: "Asokore Mampong", country: "Ghana" },
  { city: "Ejura", country: "Ghana" },
  { city: "Sekyedumase", country: "Ghana" },
  { city: "Nkawie", country: "Ghana" },
  { city: "Toase", country: "Ghana" },
  { city: "Ahwiaa", country: "Ghana" },
  { city: "Ntonso", country: "Ghana" },
  { city: "Bonwire", country: "Ghana" },
  { city: "Adanwomase", country: "Ghana" },
  { city: "Besease", country: "Ghana" },
  { city: "Bomfa", country: "Ghana" },
  { city: "Adankwame", country: "Ghana" },
  { city: "Kaase", country: "Ghana" }
];

// Combine all essential cities - only Ghana locations preserved as fallback
export const allCities: City[] = [
  ...ghanaianCities
];

/**
 * Get city suggestions based on user input
 * This serves as a minimal fallback when Google Places API is unavailable
 * @param input User's input string
 * @returns Array of matching city suggestions (max 5)
 */
export function getSuggestions(input: string): City[] {
  if (!input || input.length < 2) return [];
  
  const inputLower = input.toLowerCase();
  let results: City[] = [];
  
  // Check if input contains a comma (user might be typing "city, country")
  if (inputLower.includes(',')) {
    const parts = inputLower.split(',').map(part => part.trim());
    const cityPart = parts[0];
    const countryPart = parts[1];
    
    // If the user has started typing a country after the comma
    if (countryPart && countryPart.length >= 1) {
      // Match both city and country
      results = allCities.filter(item => 
        item.city.toLowerCase().includes(cityPart) && 
        item.country.toLowerCase().includes(countryPart)
      );
      return results.slice(0, 5);
    }
    
    // Just match the city if country hasn't been typed yet
    results = allCities.filter(item => 
      item.city.toLowerCase().includes(cityPart)
    );
    return results.slice(0, 5);
  }
  
  // First try to find cities that start with the input
  const priorityMatches = allCities.filter(item => 
    item.city.toLowerCase().startsWith(inputLower)
  );
  
  // If we have enough priority matches, return them
  if (priorityMatches.length >= 5) {
    return priorityMatches.slice(0, 5);
  }
  
  // Next, find cities that include the input anywhere in the name
  const secondaryMatches = allCities.filter(item => 
    !item.city.toLowerCase().startsWith(inputLower) && 
    item.city.toLowerCase().includes(inputLower)
  );
  
  // Finally, search by country name as well
  const countryMatches = allCities.filter(item =>
    !item.city.toLowerCase().includes(inputLower) &&
    item.country.toLowerCase().includes(inputLower)
  );
  
  // Combine all matches with proper priority order and return up to 5 suggestions
  return [...priorityMatches, ...secondaryMatches, ...countryMatches].slice(0, 5);
}

/**
 * Format a location string as "City, Country"
 * @param city City name
 * @param country Country name
 * @returns Formatted location string
 */
export function formatLocation(city: string, country: string): string {
  return `${city}, ${country}`;
}

/**
 * Parse a location string into city and country components
 * @param location Location string in "City, Country" format
 * @returns Object with city and country properties
 */
export function parseLocation(location: string): { city: string, country: string } {
  const parts = location.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[1]
    };
  }
  
  // If no comma, assume it's just a city
  return {
    city: parts[0],
    country: ''
  };
}