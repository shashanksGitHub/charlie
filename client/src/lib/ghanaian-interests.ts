// A comprehensive list of interests, hobbies, and activities
// relevant to Ghanaians both in Ghana and in the diaspora

type InterestCategory = {
  category: string;
  interests: string[];
};

export const interestCategories: InterestCategory[] = [
  {
    category: "Cultural",
    interests: [
      "Traditional Festivals",
      "Adinkra Symbols",
      "Kente Weaving",
      "Ghanaian Heritage",
      "Akan Culture",
      "Ewe Traditions",
      "Ga Homowo",
      "Cultural Events",
      "Traditional Music",
      "Highlife Music",
      "African Stories",
      "Local Languages"
    ]
  },
  {
    category: "Food",
    interests: [
      "Jollof Rice",
      "Waakye Cooking",
      "Fufu & Soup",
      "Kenkey & Fish",
      "Banku",
      "Kelewele",
      "Traditional Cuisine",
      "Street Food",
      "Food Tourism",
      "Cooking Classes",
      "Plantain Dishes",
      "Palm Wine"
    ]
  },
  {
    category: "Music & Dance",
    interests: [
      "Afrobeats",
      "Highlife",
      "Hiplife",
      "Gospel Music",
      "Azonto Dance",
      "Traditional Drumming",
      "Adowa Dance",
      "Kpanlogo",
      "Agbadza",
      "Borborbor",
      "Church Choir",
      "DJing"
    ]
  },
  {
    category: "Sports & Activities",
    interests: [
      "Football",
      "Black Stars",
      "Basketball",
      "Table Tennis",
      "Athletics",
      "Beach Volleyball",
      "Boxing",
      "Ampe Games",
      "Local Sports",
      "Marathon Running",
      "Swimming",
      "Gym & Fitness"
    ]
  },
  {
    category: "Education",
    interests: [
      "Reading",
      "African Literature",
      "Book Clubs",
      "Language Learning",
      "Academic Achievement",
      "STEM Education",
      "Public Speaking",
      "Educational Trips",
      "Learning New Skills",
      "Online Courses",
      "Teaching",
      "Mentoring"
    ]
  },
  {
    category: "Professional",
    interests: [
      "Entrepreneurship",
      "Tech Startups",
      "Digital Marketing",
      "Finance & Investment",
      "Real Estate",
      "Career Development",
      "Business Networking",
      "Professional Growth",
      "Healthcare",
      "Legal Practice",
      "Engineering",
      "Creative Industry"
    ]
  },
  {
    category: "Arts & Entertainment",
    interests: [
      "African Cinema",
      "Ghanaian Films",
      "Painting",
      "Photography",
      "Poetry & Spoken Word",
      "Fashion Design",
      "Textile Art",
      "Traditional Crafts",
      "Modern Art",
      "Nollywood Movies",
      "Comedy Shows",
      "Theatre"
    ]
  },
  {
    category: "Travel & Outdoors",
    interests: [
      "Ghana Tourism",
      "Beach Getaways",
      "Kakum National Park",
      "Mole Safaris",
      "Hiking",
      "Waterfalls",
      "Lake Volta",
      "Market Visits",
      "Road Trips",
      "Camping",
      "Ecotourism",
      "Cultural Tourism"
    ]
  },
  {
    category: "Faith & Spirituality",
    interests: [
      "Christian Faith",
      "Islamic Practice",
      "Traditional Beliefs",
      "Church Activities",
      "Bible Study",
      "Prayer Groups",
      "Meditation",
      "Spiritual Growth",
      "Religious Festivals",
      "Interfaith Dialogue",
      "Choir Singing",
      "Religious Events"
    ]
  },
  {
    category: "Technology",
    interests: [
      "Coding & Programming",
      "Web Development",
      "Tech Gadgets",
      "Social Media",
      "Mobile Apps",
      "Digital Innovation",
      "Video Games",
      "AI & Robotics",
      "Tech Meetups",
      "Cryptocurrency",
      "Tech Education",
      "Fintech"
    ]
  },
  {
    category: "Social & Community",
    interests: [
      "Community Service",
      "Volunteer Work",
      "Networking Events",
      "Diaspora Meet-ups",
      "Cultural Exchange",
      "Youth Groups",
      "Family Gatherings",
      "Hometown Associations",
      "Charity Work",
      "Social Events",
      "Community Development",
      "Advocacy"
    ]
  },
  {
    category: "Lifestyle",
    interests: [
      "Natural Hair",
      "African Fashion",
      "Interior Design",
      "Modern Lifestyle",
      "Health & Wellness",
      "Vlogging",
      "Beauty & Style",
      "Skincare",
      "Fitness",
      "Self-Care",
      "Personal Development",
      "Sustainable Living"
    ]
  }
];

// Flat list of all interests for easy access
export const allInterests: string[] = interestCategories.flatMap(category => category.interests);

// Get random interests (useful for suggesting interests)
export const getRandomInterests = (count: number = 5): string[] => {
  const shuffled = [...allInterests].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Get interests by category
export const getInterestsByCategory = (categoryName: string): string[] => {
  const category = interestCategories.find(c => c.category === categoryName);
  return category ? category.interests : [];
};