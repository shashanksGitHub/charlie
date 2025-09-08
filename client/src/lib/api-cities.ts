import { City } from "./cities";
import { getAllUSCities, getCitiesForState, majorUSCities } from "./us-cities";

// This file handles fetching cities from external APIs when needed
// For now we'll implement a basic implementation that returns a set of 
// sample cities for each country, but this can be expanded to use real
// city data APIs later

// This type will be used to categorize countries by region/continent
type CountryRegion = {
  country: string;
  region: string;
  continent: string;
};

// Map of countries to their regions and continents
const countryRegionMap: Record<string, CountryRegion> = {
  // Africa
  "Nigeria": { country: "Nigeria", region: "West Africa", continent: "Africa" },
  "Ghana": { country: "Ghana", region: "West Africa", continent: "Africa" },
  "Kenya": { country: "Kenya", region: "East Africa", continent: "Africa" },
  "Egypt": { country: "Egypt", region: "North Africa", continent: "Africa" },
  "South Africa": { country: "South Africa", region: "Southern Africa", continent: "Africa" },
  "Ivory Coast": { country: "Ivory Coast", region: "West Africa", continent: "Africa" },
  "Senegal": { country: "Senegal", region: "West Africa", continent: "Africa" },
  "Cameroon": { country: "Cameroon", region: "Central Africa", continent: "Africa" },
  "Togo": { country: "Togo", region: "West Africa", continent: "Africa" },
  
  // Europe
  "United Kingdom": { country: "United Kingdom", region: "Western Europe", continent: "Europe" },
  "France": { country: "France", region: "Western Europe", continent: "Europe" },
  "Germany": { country: "Germany", region: "Central Europe", continent: "Europe" },
  "Italy": { country: "Italy", region: "Southern Europe", continent: "Europe" },
  "Spain": { country: "Spain", region: "Southern Europe", continent: "Europe" },
  
  // North America
  "United States": { country: "United States", region: "North America", continent: "North America" },
  "Canada": { country: "Canada", region: "North America", continent: "North America" },
  "Mexico": { country: "Mexico", region: "North America", continent: "North America" },
  
  // Asia
  "China": { country: "China", region: "East Asia", continent: "Asia" },
  "Japan": { country: "Japan", region: "East Asia", continent: "Asia" },
  "India": { country: "India", region: "South Asia", continent: "Asia" },
  
  // Oceania
  "Australia": { country: "Australia", region: "Oceania", continent: "Oceania" },
  "New Zealand": { country: "New Zealand", region: "Oceania", continent: "Oceania" },
};

// Base city datasets for when we need to get cities for countries not in the main list
const sampleCitiesByCountry: Record<string, string[]> = {
  // These are just sample cities for demonstration
  "Nigeria": ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Maiduguri", "Kaduna", "Zaria", "Jos", "Ilorin", "Oyo", "Enugu", "Abeokuta", "Onitsha", "Warri", "Sokoto", "Calabar", "Uyo", "Osogbo"],
  "Kenya": ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale", "Garissa", "Kakamega", "Nyeri", "Machakos", "Lamu", "Naivasha", "Meru", "Embu", "Kericho", "Bungoma"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Luxor", "Aswan", "Mansoura", "Tanta", "Asyut", "Ismailia", "Fayyum", "Zagazig", "Damietta", "Minya", "Hurghada", "Sohag"],
  "Ivory Coast": ["Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro", "Divo", "Korhogo", "Man", "Gagnoa", "Abengourou", "Odienné", "Séguéla", "Boundiali", "Ferkessédougou", "Dabou"],
  "Togo": ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé", "Bassar", "Tsévié", "Aného", "Mango", "Dapaong", "Sotouboua", "Vogan", "Niamtougou", "Bafilo", "Badou"],
  "Senegal": ["Dakar", "Touba", "Thiès", "Rufisque", "Kaolack", "M'Bour", "Saint-Louis", "Ziguinchor", "Diourbel", "Louga", "Tambacounda", "Kolda", "Matam", "Fatick", "Dagana"],
  "Cameroon": ["Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam", "Ngaoundéré", "Bertoua", "Loum", "Kumba", "Edéa", "Kumbo", "Foumban", "Nkongsamba", "Buea"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Newcastle", "Canberra", "Wollongong", "Hobart", "Geelong", "Townsville", "Cairns", "Darwin", "Toowoomba", "Ballarat", "Bendigo", "Launceston", "Mackay", "Rockhampton", "Bunbury"],
  "France": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Saint-Étienne", "Toulon", "Le Havre", "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne", "Saint-Denis", "Le Mans", "Aix-en-Provence", "Clermont-Ferrand", "Brest"],
  "Italy": ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Venice", "Verona", "Bari", "Catania", "Messina", "Padua", "Trieste", "Taranto", "Brescia", "Parma", "Modena", "Reggio Calabria", "Livorno", "Cagliari", "Salerno", "Perugia", "Pescara"],
  "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "L'Hospitalet", "La Coruña", "Vitoria", "Granada", "Elche", "Oviedo", "Badalona", "Cartagena", "Terrassa", "Jerez de la Frontera"]
};

/**
 * Get a list of cities for a specific country from API
 * This simulates what would be a call to a real API
 */
export async function fetchCitiesForCountry(country: string): Promise<City[]> {
  console.log(`[API] Fetching cities for country: ${country}`);
  
  // Special handling for United States - use our comprehensive database
  if (country === "United States") {
    // Return major US cities for initial display (faster)
    // The full database can be loaded on demand with getAllUSCities()
    return majorUSCities;
  }
  
  // Simulating network delay for other countries
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Get sample cities for this country or use a default set
  const citiesForCountry = sampleCitiesByCountry[country] || 
                           ["Capital City", "Major City 1", "Major City 2"];
  
  return citiesForCountry.map(cityName => ({
    city: cityName,
    country: country
  }));
}

/**
 * Search for cities based on a query string
 * In a real implementation, this would call an API with the search parameter
 */
export async function searchCities(query: string, country?: string): Promise<City[]> {
  console.log(`[API] Searching cities with query: ${query}${country ? ` in ${country}` : ''}`);
  
  // Short delay to allow typing to complete
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Case for US cities - search the full database by state or city name
  if (country === "United States" || !country) {
    // Get all US cities
    const allUSCities = getAllUSCities();
    
    // Filter based on query
    const queryLower = query.toLowerCase();
    const filteredCities = allUSCities.filter(city => 
      city.city.toLowerCase().includes(queryLower)
    );
    
    // Return top 15 results (for performance)
    return filteredCities.slice(0, 15);
  }
  
  // For other countries, use sample data for now
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Get sample cities for this country
  let results: City[] = [];
  
  if (country && sampleCitiesByCountry[country]) {
    const cities = sampleCitiesByCountry[country];
    const queryLower = query.toLowerCase();
    
    results = cities
      .filter(cityName => cityName.toLowerCase().includes(queryLower))
      .map(cityName => ({
        city: cityName,
        country: country
      }));
  }
  
  // If no results or no country specified, add some generic results
  if (results.length === 0 && query.length > 0) {
    // Return generated "neighborhoods" based on the query
    results.push({ city: `${query} Central`, country: country || "Various" });
    results.push({ city: `${query} Heights`, country: country || "Various" });
    results.push({ city: `${query} Park`, country: country || "Various" });
    results.push({ city: `New ${query}`, country: country || "Various" });
    results.push({ city: `${query} Village`, country: country || "Various" });
  }
  
  return results;
}

/**
 * Get cities near a specified location
 */
export async function getCitiesNearLocation(city: string, country: string): Promise<City[]> {
  console.log(`[API] Getting cities near ${city}, ${country}`);
  
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real implementation, this would call a geolocation API
  // For now, return some fake "nearby" locations
  return [
    { city: `${city} North`, country },
    { city: `${city} South`, country },
    { city: `${city} East`, country },
    { city: `${city} West`, country },
    { city: `${city} Suburb`, country },
    { city: `${city} Heights`, country },
    { city: `${city} Downtown`, country },
    { city: `${city} Park`, country },
  ];
}

/**
 * Get popular/major cities for a region
 */
export async function getPopularCitiesForRegion(region: string): Promise<City[]> {
  console.log(`[API] Getting popular cities for region: ${region}`);
  
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // For now, return some predefined cities by region
  const popularCities: Record<string, City[]> = {
    "West Africa": [
      { city: "Lagos", country: "Nigeria" },
      { city: "Accra", country: "Ghana" },
      { city: "Abidjan", country: "Ivory Coast" },
      { city: "Dakar", country: "Senegal" },
      { city: "Kumasi", country: "Ghana" },
      { city: "Ibadan", country: "Nigeria" },
      { city: "Lomé", country: "Togo" },
      { city: "Abuja", country: "Nigeria" },
      { city: "Cotonou", country: "Benin" },
    ],
    "East Africa": [
      { city: "Nairobi", country: "Kenya" },
      { city: "Dar es Salaam", country: "Tanzania" },
      { city: "Addis Ababa", country: "Ethiopia" },
      { city: "Kampala", country: "Uganda" },
      { city: "Kigali", country: "Rwanda" },
      { city: "Mombasa", country: "Kenya" },
    ],
    "North Africa": [
      { city: "Cairo", country: "Egypt" },
      { city: "Casablanca", country: "Morocco" },
      { city: "Algiers", country: "Algeria" },
      { city: "Tunis", country: "Tunisia" },
      { city: "Alexandria", country: "Egypt" },
      { city: "Tripoli", country: "Libya" },
    ]
  };
  
  return popularCities[region] || [];
}

// Export default for easier importing
export default {
  fetchCitiesForCountry,
  searchCities,
  getCitiesNearLocation,
  getPopularCitiesForRegion
};