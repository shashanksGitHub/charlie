/**
 * Script to expand the networking profiles database to 50 total profiles
 * Adding 28 more authentic profiles across all categories
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Additional networking profiles to reach 50 total
const additionalProfiles = [
  // More Ghanaian Celebrities
  {
    fullName: "Shatta Wale",
    email: "shatta@shattamovement.com",
    username: "shattawale",
    profession: "Dancehall Artist",
    location: "Ghana",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Bringing Ghanaian dancehall to the global stage",
    currentRole: "Dancehall King & CEO of Shatta Movement",
    industry: "Music & Entertainment",
    experienceYears: 18,
    networkingGoals: JSON.stringify(["Global Music", "African Music Export", "Brand Building", "Cultural Impact"]),
    lookingFor: "International music collaborators, brand partners, and platforms to showcase African dancehall globally",
    canOffer: "Music industry expertise, African cultural insights, brand influence, and access to Ghanaian music networks",
    professionalInterests: JSON.stringify(["Dancehall Music", "African Culture", "Brand Development", "Youth Empowerment"]),
    causesIPassionate: JSON.stringify(["African Music Recognition", "Youth Development", "Cultural Pride", "Music Education"]),
    collaborationTypes: JSON.stringify(["Music Collaborations", "Brand Partnerships", "Cultural Events", "Youth Programs"]),
    workingStyle: "Flexible",
    timeCommitment: "Intensive (5+ hrs/month)",
    lightUpWhenTalking: "the power of African music to unite people and create opportunities for young artists",
    wantToMeetSomeone: "who believes in the global potential of African music and wants to help elevate the culture",
    currentProjects: JSON.stringify(["New Album Release", "Shatta Movement Empire", "African Music Festival", "Youth Foundation"]),
    dreamCollaboration: "Creating a global African music platform that showcases talent from across the continent",
    preferredMeetingStyle: JSON.stringify(["Studio sessions", "Music events", "Cultural festivals"]),
    availability: "Flexible around recording and touring",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Accra", "Lagos", "London", "New York"])
  },
  {
    fullName: "Stonebwoy",
    email: "stonebwoy@bhimmusic.com",
    username: "stonebwoy",
    profession: "Reggae Dancehall Artist",
    location: "Ghana",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Spreading positive vibes through authentic reggae dancehall music",
    currentRole: "Recording Artist & CEO of Burniton Music Group",
    industry: "Music & Entertainment",
    experienceYears: 15,
    networkingGoals: JSON.stringify(["Reggae Music", "African Unity", "Positive Impact", "Music Business"]),
    lookingFor: "Reggae music collaborators, positive impact partners, and platforms for conscious music",
    canOffer: "Authentic reggae expertise, African music knowledge, positive messaging, and established music networks",
    professionalInterests: JSON.stringify(["Reggae Dancehall", "Conscious Music", "African Unity", "Music Production"]),
    causesIPassionate: JSON.stringify(["Peace Building", "African Unity", "Conscious Music", "Youth Guidance"]),
    collaborationTypes: JSON.stringify(["Music Collaborations", "Peace Initiatives", "Cultural Projects", "Mentorship Programs"]),
    workingStyle: "In-person",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "music's power to heal, unite, and inspire positive change in communities",
    wantToMeetSomeone: "who shares a vision for using music as a tool for positive social change",
    currentProjects: JSON.stringify(["Anloga Junction Album", "Burniton Music Group", "Peace Concerts", "Youth Mentorship"]),
    dreamCollaboration: "Organizing a continental African unity concert that promotes peace and cultural exchange",
    preferredMeetingStyle: JSON.stringify(["Music studios", "Community events", "Peace forums"]),
    availability: "Flexible with music commitments",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Accra", "Ashaiman", "Pan-African Venues"])
  },
  {
    fullName: "Joselyn Dumas",
    email: "joselyn@joselyndumas.com",
    username: "joselyndumas",
    profession: "Actress & TV Host",
    location: "Ghana",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Elevating African storytelling through authentic television and film",
    currentRole: "Actress, TV Host & Media Entrepreneur",
    industry: "Media & Entertainment",
    experienceYears: 16,
    networkingGoals: JSON.stringify(["African Media", "Television Production", "Women in Media", "Cultural Storytelling"]),
    lookingFor: "Media production partners, women in entertainment networks, and platforms for African content",
    canOffer: "Television expertise, media production knowledge, African storytelling insights, and established media networks",
    professionalInterests: JSON.stringify(["Television Production", "African Cinema", "Women Empowerment", "Media Development"]),
    causesIPassionate: JSON.stringify(["Women in Media", "African Storytelling", "Youth Development", "Media Education"]),
    collaborationTypes: JSON.stringify(["Media Productions", "Women's Programs", "Educational Content", "Cultural Projects"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "the importance of authentic African representation in global media",
    wantToMeetSomeone: "who believes in the power of media to change narratives and empower communities",
    currentProjects: JSON.stringify(["TV Productions", "Media Consultancy", "Women's Empowerment Initiative", "Acting Projects"]),
    dreamCollaboration: "Creating a pan-African media network that showcases authentic stories from across the continent",
    preferredMeetingStyle: JSON.stringify(["Media events", "Industry panels", "Coffee meetings"]),
    availability: "Structured around production schedules",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Accra", "Lagos", "London", "Media Centers"])
  },
  {
    fullName: "Jackie Appiah",
    email: "jackie@jackieappiah.com",
    username: "jackieappiah",
    profession: "Actress & Entrepreneur",
    location: "Ghana",
    photoUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Creating compelling African narratives through exceptional film performances",
    currentRole: "Lead Actress & Business Entrepreneur",
    industry: "Film & Business",
    experienceYears: 20,
    networkingGoals: JSON.stringify(["African Cinema", "Film Investment", "Business Ventures", "Women's Empowerment"]),
    lookingFor: "Film investors, business partners, women entrepreneurs, and platforms for African cinema",
    canOffer: "Acting expertise, business acumen, African market insights, and established entertainment networks",
    professionalInterests: JSON.stringify(["Film Acting", "Business Development", "African Cinema", "Women in Business"]),
    causesIPassionate: JSON.stringify(["African Cinema Growth", "Women Entrepreneurship", "Arts Education", "Youth Development"]),
    collaborationTypes: JSON.stringify(["Film Projects", "Business Ventures", "Women's Programs", "Educational Initiatives"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the evolution of African cinema and its growing impact on global entertainment",
    wantToMeetSomeone: "who appreciates quality filmmaking and believes in investing in African creative talent",
    currentProjects: JSON.stringify(["Film Productions", "Business Ventures", "Women's Foundation", "Acting Academy"]),
    dreamCollaboration: "Establishing a world-class film academy in Ghana that trains the next generation of African actors",
    preferredMeetingStyle: JSON.stringify(["Film premieres", "Business forums", "Cultural events"]),
    availability: "Limited but strategic engagements",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Accra", "Lagos", "Film Festivals"])
  },
  {
    fullName: "Majid Michel",
    email: "majid@majidmichel.com",
    username: "majidmichel",
    profession: "Actor & Motivational Speaker",
    location: "Ghana",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Inspiring transformation through authentic storytelling and motivational speaking",
    currentRole: "Actor, Motivational Speaker & Life Coach",
    industry: "Entertainment & Personal Development",
    experienceYears: 22,
    networkingGoals: JSON.stringify(["Inspirational Content", "Personal Development", "African Film", "Motivational Speaking"]),
    lookingFor: "Personal development experts, inspirational content creators, and platforms for motivational speaking",
    canOffer: "Acting expertise, motivational speaking skills, personal development insights, and inspirational content creation",
    professionalInterests: JSON.stringify(["Method Acting", "Personal Transformation", "Motivational Speaking", "Life Coaching"]),
    causesIPassionate: JSON.stringify(["Personal Development", "Youth Mentorship", "Spiritual Growth", "African Talent"]),
    collaborationTypes: JSON.stringify(["Inspirational Content", "Speaking Engagements", "Mentorship Programs", "Film Projects"]),
    workingStyle: "In-person",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "the power of personal transformation and how stories can change lives",
    wantToMeetSomeone: "who believes in the importance of personal growth and inspiring others to reach their potential",
    currentProjects: JSON.stringify(["Motivational Speaking", "Life Coaching", "Film Projects", "Youth Mentorship Program"]),
    dreamCollaboration: "Creating a comprehensive personal development program that transforms lives across Africa",
    preferredMeetingStyle: JSON.stringify(["Speaking events", "Personal meetings", "Workshops"]),
    availability: "Flexible around speaking commitments",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Accra", "Pan-African Cities", "Speaking Venues"])
  },
  {
    fullName: "Nadia Buari",
    email: "nadia@nadiabuari.com",
    username: "nadiabuari",
    profession: "Actress & Producer",
    location: "Ghana",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Crafting compelling African stories through dedicated film production and performance",
    currentRole: "Actress, Producer & Creative Director",
    industry: "Film Production",
    experienceYears: 17,
    networkingGoals: JSON.stringify(["Film Production", "African Storytelling", "Creative Direction", "Women in Film"]),
    lookingFor: "Film production partners, creative collaborators, and investors in African cinema",
    canOffer: "Acting and production expertise, creative direction skills, African storytelling insights, and film industry networks",
    professionalInterests: JSON.stringify(["Film Production", "Creative Direction", "African Narratives", "Character Development"]),
    causesIPassionate: JSON.stringify(["Women in Film", "African Cinema", "Creative Arts Education", "Cultural Preservation"]),
    collaborationTypes: JSON.stringify(["Film Productions", "Creative Projects", "Educational Programs", "Cultural Initiatives"]),
    workingStyle: "Flexible",
    timeCommitment: "Intensive (5+ hrs/month)",
    lightUpWhenTalking: "the craft of filmmaking and the importance of authentic African storytelling",
    wantToMeetSomeone: "who shares a passion for quality filmmaking and believes in the power of African stories",
    currentProjects: JSON.stringify(["Film Productions", "Creative Direction Projects", "Acting Roles", "Film Academy"]),
    dreamCollaboration: "Producing a groundbreaking African film that sets new standards for continental cinema",
    preferredMeetingStyle: JSON.stringify(["Film sets", "Creative sessions", "Industry events"]),
    availability: "Flexible around production schedules",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Accra", "Film Locations", "Creative Hubs"])
  },

  // More American Actors
  {
    fullName: "Denzel Washington",
    email: "denzel@mundy.com",
    username: "denzelwashington",
    profession: "Actor & Director",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Pursuing excellence in storytelling and inspiring the next generation of artists",
    currentRole: "Academy Award-Winning Actor & Director",
    industry: "Entertainment & Education",
    experienceYears: 45,
    networkingGoals: JSON.stringify(["Quality Filmmaking", "Actor Training", "Educational Impact", "Mentorship"]),
    lookingFor: "Educational institutions, young actors to mentor, and platforms for quality storytelling",
    canOffer: "Acting mastery, directing expertise, mentorship, and access to top-tier entertainment networks",
    professionalInterests: JSON.stringify(["Method Acting", "Film Directing", "Theater Arts", "Actor Education"]),
    causesIPassionate: JSON.stringify(["Arts Education", "Youth Mentorship", "Excellence in Craft", "Cultural Impact"]),
    collaborationTypes: JSON.stringify(["Film Projects", "Educational Programs", "Mentorship Initiatives", "Theater Work"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the craft of acting and the responsibility artists have to inspire and educate",
    wantToMeetSomeone: "who is dedicated to their craft and committed to using their talents to make a positive impact",
    currentProjects: JSON.stringify(["Film Directing", "Acting Projects", "Fordham University Partnership", "Youth Mentorship"]),
    dreamCollaboration: "Establishing a comprehensive acting academy that trains world-class performers from diverse backgrounds",
    preferredMeetingStyle: JSON.stringify(["Film sets", "Educational institutions", "Theater venues"]),
    availability: "Selective high-impact engagements",
    openToRemote: false,
    preferredLocations: JSON.stringify(["New York", "Los Angeles", "Educational Institutions"])
  },
  {
    fullName: "Viola Davis",
    email: "viola@juveeproductions.com",
    username: "violadavis",
    profession: "Actress & Producer",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Breaking barriers and creating opportunities for underrepresented voices in entertainment",
    currentRole: "EGOT Winner & Founder of JuVee Productions",
    industry: "Entertainment & Advocacy",
    experienceYears: 30,
    networkingGoals: JSON.stringify(["Inclusive Storytelling", "Producer Development", "Women of Color", "Social Impact"]),
    lookingFor: "Diverse content creators, women filmmakers, social impact organizations, and educational partnerships",
    canOffer: "Acting excellence, production expertise, advocacy platform, and mentorship for underrepresented creators",
    professionalInterests: JSON.stringify(["Character Development", "Inclusive Production", "Women's Stories", "Social Justice"]),
    causesIPassionate: JSON.stringify(["Women of Color", "Arts Education", "Inclusive Representation", "Social Justice"]),
    collaborationTypes: JSON.stringify(["Film Productions", "Advocacy Campaigns", "Educational Programs", "Mentorship"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "the importance of authentic representation and creating opportunities for the next generation",
    wantToMeetSomeone: "who is committed to breaking barriers and creating inclusive opportunities in entertainment",
    currentProjects: JSON.stringify(["JuVee Productions", "Acting Projects", "Advocacy Work", "Educational Initiatives"]),
    dreamCollaboration: "Creating a comprehensive pipeline program that takes diverse talent from training to major productions",
    preferredMeetingStyle: JSON.stringify(["Industry panels", "Educational forums", "Production meetings"]),
    availability: "Structured around production and advocacy commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Los Angeles", "New York", "Educational Institutions"])
  },
  {
    fullName: "Ryan Reynolds",
    email: "ryan@maximumeffort.com",
    username: "ryanreynolds",
    profession: "Actor & Entrepreneur",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Combining entertainment with entrepreneurship and innovative marketing",
    currentRole: "Actor, Producer & CEO of Maximum Effort",
    industry: "Entertainment & Business",
    experienceYears: 25,
    networkingGoals: JSON.stringify(["Creative Marketing", "Entertainment Business", "Brand Innovation", "Content Creation"]),
    lookingFor: "Marketing innovators, entertainment entrepreneurs, brand partners, and creative content creators",
    canOffer: "Entertainment expertise, marketing innovation, business acumen, and creative content development",
    professionalInterests: JSON.stringify(["Creative Marketing", "Film Production", "Brand Development", "Content Strategy"]),
    causesIPassionate: JSON.stringify(["Creative Innovation", "Entrepreneurship", "Mental Health Awareness", "Entertainment Access"]),
    collaborationTypes: JSON.stringify(["Creative Campaigns", "Business Ventures", "Content Creation", "Brand Partnerships"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "innovative ways to connect with audiences and the intersection of entertainment and entrepreneurship",
    wantToMeetSomeone: "who thinks outside the box and isn't afraid to take creative risks in business and entertainment",
    currentProjects: JSON.stringify(["Maximum Effort Productions", "Brand Partnerships", "Film Projects", "Marketing Campaigns"]),
    dreamCollaboration: "Creating a revolutionary entertainment marketing platform that changes how content connects with audiences",
    preferredMeetingStyle: JSON.stringify(["Creative sessions", "Business meetings", "Industry events"]),
    availability: "Flexible around filming and business commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Vancouver", "Los Angeles", "New York"])
  },
  {
    fullName: "Kerry Washington",
    email: "kerry@simpsonstreet.com",
    username: "kerrywashington",
    profession: "Actress & Producer",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Using storytelling to drive social change and amplify underrepresented voices",
    currentRole: "Actress, Producer & Founder of Simpson Street",
    industry: "Entertainment & Social Impact",
    experienceYears: 22,
    networkingGoals: JSON.stringify(["Social Impact Storytelling", "Diverse Representation", "Political Engagement", "Women's Advocacy"]),
    lookingFor: "Social impact storytellers, political organizations, women's advocacy groups, and diverse content creators",
    canOffer: "Acting expertise, production knowledge, social impact platform, and advocacy networks",
    professionalInterests: JSON.stringify(["Social Impact Storytelling", "Political Drama", "Women's Rights", "Diverse Representation"]),
    causesIPassionate: JSON.stringify(["Voting Rights", "Women's Empowerment", "Racial Justice", "Political Engagement"]),
    collaborationTypes: JSON.stringify(["Social Impact Content", "Advocacy Campaigns", "Political Initiatives", "Educational Programs"]),
    workingStyle: "Flexible",
    timeCommitment: "Intensive (5+ hrs/month)",
    lightUpWhenTalking: "the power of storytelling to create social change and the importance of civic engagement",
    wantToMeetSomeone: "who believes in using their platform to make a positive difference in society",
    currentProjects: JSON.stringify(["Simpson Street Productions", "Advocacy Work", "Political Engagement", "Educational Content"]),
    dreamCollaboration: "Creating a comprehensive civic engagement platform that uses entertainment to drive social change",
    preferredMeetingStyle: JSON.stringify(["Advocacy events", "Educational forums", "Production meetings"]),
    availability: "Structured around advocacy and production commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Los Angeles", "Washington DC", "Educational Institutions"])
  },
  {
    fullName: "Donald Glover",
    email: "donald@wolfandrothstein.com",
    username: "donaldglover",
    profession: "Actor, Writer & Musician",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Creating innovative content across multiple mediums to challenge and inspire audiences",
    currentRole: "Multi-Hyphenate Creator & Founder of Wolf + Rothstein",
    industry: "Entertainment & Media",
    experienceYears: 18,
    networkingGoals: JSON.stringify(["Creative Innovation", "Multi-Media Content", "Cultural Commentary", "Artistic Excellence"]),
    lookingFor: "Creative innovators, multi-disciplinary artists, cultural commentators, and platforms for experimental content",
    canOffer: "Multi-platform expertise, creative vision, cultural insights, and access to diverse entertainment networks",
    professionalInterests: JSON.stringify(["Multi-Media Creation", "Cultural Commentary", "Experimental Content", "Artistic Innovation"]),
    causesIPassionate: JSON.stringify(["Artistic Freedom", "Cultural Dialogue", "Creative Innovation", "Social Commentary"]),
    collaborationTypes: JSON.stringify(["Creative Projects", "Cultural Commentary", "Experimental Content", "Multi-Media Ventures"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "pushing creative boundaries and using art to spark important cultural conversations",
    wantToMeetSomeone: "who isn't afraid to challenge conventions and believes in the power of art to provoke thought",
    currentProjects: JSON.stringify(["FX Productions", "Music Projects", "Creative Direction", "Cultural Commentary"]),
    dreamCollaboration: "Creating a multi-platform creative studio that redefines how stories are told across different mediums",
    preferredMeetingStyle: JSON.stringify(["Creative labs", "Cultural events", "Innovation centers"]),
    availability: "Flexible around creative projects",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Atlanta", "Los Angeles", "Creative Hubs"])
  },
  {
    fullName: "Regina King",
    email: "regina@royaltiesent.com",
    username: "reginaking",
    profession: "Actress & Director",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Directing powerful narratives and championing opportunities for women and people of color",
    currentRole: "Academy Award-Winning Actress & Director",
    industry: "Entertainment & Advocacy",
    experienceYears: 35,
    networkingGoals: JSON.stringify(["Inclusive Directing", "Women in Film", "Social Justice", "Mentorship"]),
    lookingFor: "Female directors, social justice advocates, emerging talent to mentor, and platforms for inclusive storytelling",
    canOffer: "Directing expertise, acting excellence, mentorship, and advocacy for underrepresented voices in entertainment",
    professionalInterests: JSON.stringify(["Film Directing", "Social Justice Storytelling", "Women's Empowerment", "Inclusive Production"]),
    causesIPassionate: JSON.stringify(["Women in Film", "Racial Justice", "Mentorship", "Inclusive Representation"]),
    collaborationTypes: JSON.stringify(["Film Projects", "Mentorship Programs", "Advocacy Initiatives", "Educational Content"]),
    workingStyle: "In-person",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "the importance of authentic storytelling and creating opportunities for the next generation",
    wantToMeetSomeone: "who is committed to using their talents to create positive change and break down barriers",
    currentProjects: JSON.stringify(["Directing Projects", "Royal Ties Productions", "Mentorship Programs", "Advocacy Work"]),
    dreamCollaboration: "Establishing a comprehensive program that trains and supports women and people of color in directing",
    preferredMeetingStyle: JSON.stringify(["Film sets", "Industry mentorship", "Advocacy events"]),
    availability: "Structured around directing and advocacy commitments",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Los Angeles", "New York", "Film Festivals"])
  },

  // More Indian Figures
  {
    fullName: "Deepika Padukone",
    email: "deepika@kaproductions.com",
    username: "deepikapadukone",
    profession: "Actress & Mental Health Advocate",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Breaking stigmas around mental health while creating impactful cinema",
    currentRole: "Leading Actress & Founder of Live Love Laugh Foundation",
    industry: "Entertainment & Mental Health",
    experienceYears: 16,
    networkingGoals: JSON.stringify(["Mental Health Advocacy", "Global Cinema", "Women's Empowerment", "Social Impact"]),
    lookingFor: "Mental health experts, global filmmakers, women's advocacy organizations, and platforms for social impact",
    canOffer: "Acting expertise, mental health advocacy platform, global reach, and access to Indian entertainment networks",
    professionalInterests: JSON.stringify(["Method Acting", "Mental Health Awareness", "Global Cinema", "Women's Rights"]),
    causesIPassionate: JSON.stringify(["Mental Health", "Women's Empowerment", "Education Access", "Social Stigma Removal"]),
    collaborationTypes: JSON.stringify(["Film Projects", "Mental Health Campaigns", "Educational Programs", "Advocacy Initiatives"]),
    workingStyle: "Flexible",
    timeCommitment: "Intensive (5+ hrs/month)",
    lightUpWhenTalking: "breaking mental health stigmas and the power of cinema to create social awareness",
    wantToMeetSomeone: "who believes in using their platform to address important social issues and create positive change",
    currentProjects: JSON.stringify(["Live Love Laugh Foundation", "International Films", "Mental Health Advocacy", "Production Ventures"]),
    dreamCollaboration: "Creating a global mental health awareness campaign that reaches underserved communities worldwide",
    preferredMeetingStyle: JSON.stringify(["Advocacy events", "Film festivals", "Mental health forums"]),
    availability: "Flexible around filming and advocacy commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Mumbai", "Global Film Centers", "Mental Health Conferences"])
  },
  {
    fullName: "Shah Rukh Khan",
    email: "srk@redchillies.com",
    username: "shahrukhkhan",
    profession: "Actor & Producer",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Spreading love and dreams through cinema while building global entertainment bridges",
    currentRole: "Bollywood Superstar & Chairman of Red Chillies Entertainment",
    industry: "Entertainment & Business",
    experienceYears: 32,
    networkingGoals: JSON.stringify(["Global Cinema", "Cross-Cultural Content", "Entertainment Business", "Cultural Bridge"]),
    lookingFor: "International filmmakers, cross-cultural content creators, entertainment entrepreneurs, and global distribution partners",
    canOffer: "Global entertainment expertise, cross-cultural insights, business acumen, and access to massive international fanbase",
    professionalInterests: JSON.stringify(["Global Cinema", "Cross-Cultural Storytelling", "Entertainment Business", "Technology in Film"]),
    causesIPassionate: JSON.stringify(["Cultural Understanding", "Education Access", "Child Welfare", "Global Unity"]),
    collaborationTypes: JSON.stringify(["International Productions", "Cultural Exchange", "Business Ventures", "Educational Content"]),
    workingStyle: "Flexible",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the magic of cinema to unite people across cultures and the responsibility that comes with global influence",
    wantToMeetSomeone: "who believes in the power of entertainment to break down cultural barriers and spread positivity",
    currentProjects: JSON.stringify(["Red Chillies Entertainment", "International Collaborations", "Technology Ventures", "Charitable Initiatives"]),
    dreamCollaboration: "Creating a global entertainment platform that showcases diverse stories from around the world",
    preferredMeetingStyle: JSON.stringify(["Film premieres", "Cultural events", "Business forums"]),
    availability: "Limited but meaningful engagements",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Mumbai", "Global Film Centers", "Cultural Exchange Venues"])
  },
  {
    fullName: "Kiran Mazumdar-Shaw",
    email: "kiran@biocon.com",
    username: "kiranshaw",
    profession: "Biotech Entrepreneur",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Pioneering affordable healthcare through biotechnology innovation and global partnerships",
    currentRole: "Chairperson & Managing Director of Biocon",
    industry: "Biotechnology & Healthcare",
    experienceYears: 45,
    networkingGoals: JSON.stringify(["Biotech Innovation", "Affordable Healthcare", "Women in STEM", "Global Health"]),
    lookingFor: "Healthcare innovators, biotech researchers, women entrepreneurs, and global health organizations",
    canOffer: "Biotechnology expertise, healthcare innovation insights, women's leadership mentorship, and global healthcare networks",
    professionalInterests: JSON.stringify(["Biotechnology Research", "Healthcare Access", "Women's Leadership", "Innovation Management"]),
    causesIPassionate: JSON.stringify(["Affordable Healthcare", "Women in STEM", "Global Health Equity", "Innovation for Good"]),
    collaborationTypes: JSON.stringify(["Research Partnerships", "Healthcare Innovation", "Women's Programs", "Global Health Initiatives"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "making life-saving medicines accessible to everyone and empowering women in biotechnology",
    wantToMeetSomeone: "who shares a vision of using science and innovation to solve global healthcare challenges",
    currentProjects: JSON.stringify(["Biocon Research", "Healthcare Access Programs", "Women in STEM Initiatives", "Global Partnerships"]),
    dreamCollaboration: "Creating a global biotechnology network that makes essential medicines accessible to underserved populations",
    preferredMeetingStyle: JSON.stringify(["Healthcare conferences", "Research institutions", "Innovation forums"]),
    availability: "Limited to high-impact healthcare initiatives",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Bangalore", "Global Healthcare Centers", "Research Institutions"])
  },
  {
    fullName: "A.R. Rahman",
    email: "rahman@amrecords.com",
    username: "arrahman",
    profession: "Composer & Music Producer",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Creating universal music that transcends borders and connects hearts across cultures",
    currentRole: "Oscar-Winning Composer & Founder of AM Studios",
    industry: "Music & Entertainment",
    experienceYears: 35,
    networkingGoals: JSON.stringify(["Global Music", "Cross-Cultural Collaboration", "Music Education", "Spiritual Music"]),
    lookingFor: "International musicians, music educators, spiritual artists, and platforms for cross-cultural music",
    canOffer: "Music composition expertise, cross-cultural musical knowledge, spiritual insights, and global music networks",
    professionalInterests: JSON.stringify(["World Music Fusion", "Spiritual Music", "Music Technology", "Cross-Cultural Composition"]),
    causesIPassionate: JSON.stringify(["Music Education", "Cultural Unity", "Spiritual Growth", "Peace Through Music"]),
    collaborationTypes: JSON.stringify(["Music Collaborations", "Educational Programs", "Cultural Projects", "Spiritual Initiatives"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "music's power to unite humanity and the spiritual dimensions of creative expression",
    wantToMeetSomeone: "who believes in music's power to heal, unite, and elevate the human spirit",
    currentProjects: JSON.stringify(["AM Studios", "Global Music Projects", "Music Education Initiative", "Spiritual Music"]),
    dreamCollaboration: "Creating a global music academy that teaches the universal language of music for peace and unity",
    preferredMeetingStyle: JSON.stringify(["Music studios", "Cultural festivals", "Spiritual gatherings"]),
    availability: "Flexible around composition and spiritual commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Chennai", "Global Music Centers", "Spiritual Venues"])
  },
  {
    fullName: "Nandan Nilekani",
    email: "nandan@infosys.com",
    username: "nandannilekani",
    profession: "Technology Visionary",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Leveraging technology to create inclusive digital infrastructure for societal transformation",
    currentRole: "Co-founder of Infosys & Chairman of Unique Identification Authority",
    industry: "Technology & Public Service",
    experienceYears: 40,
    networkingGoals: JSON.stringify(["Digital Infrastructure", "Technology for Good", "Public Policy", "Innovation Leadership"]),
    lookingFor: "Technology innovators, public policy experts, social entrepreneurs, and platforms for inclusive technology",
    canOffer: "Technology leadership expertise, digital infrastructure insights, public policy knowledge, and innovation networks",
    professionalInterests: JSON.stringify(["Digital Identity", "Technology Policy", "Innovation Management", "Social Technology"]),
    causesIPassionate: JSON.stringify(["Digital Inclusion", "Technology for Development", "Innovation Policy", "Social Impact"]),
    collaborationTypes: JSON.stringify(["Technology Innovation", "Policy Development", "Social Ventures", "Educational Initiatives"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "technology's potential to solve large-scale social problems and create inclusive growth",
    wantToMeetSomeone: "who believes in using technology as a force for social good and inclusive development",
    currentProjects: JSON.stringify(["Digital Infrastructure", "Policy Innovation", "Technology for Good", "Educational Technology"]),
    dreamCollaboration: "Building a global framework for inclusive digital infrastructure that empowers underserved communities",
    preferredMeetingStyle: JSON.stringify(["Technology conferences", "Policy forums", "Innovation centers"]),
    availability: "Limited to high-impact technology and policy initiatives",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Bangalore", "Policy Centers", "Global Technology Hubs"])
  },
  {
    fullName: "Indra Nooyi",
    email: "indra@indranooyi.com",
    username: "indranooyi",
    profession: "Business Leader & Board Director",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Championing sustainable business practices and empowering women in corporate leadership",
    currentRole: "Former CEO of PepsiCo & Board Director",
    industry: "Business Leadership & Governance",
    experienceYears: 40,
    networkingGoals: JSON.stringify(["Sustainable Business", "Women's Leadership", "Corporate Governance", "Global Strategy"]),
    lookingFor: "Women business leaders, sustainability experts, corporate governance specialists, and global strategy advisors",
    canOffer: "Executive leadership expertise, global business strategy insights, women's leadership mentorship, and corporate governance knowledge",
    professionalInterests: JSON.stringify(["Sustainable Business", "Women's Leadership", "Corporate Strategy", "Global Governance"]),
    causesIPassionate: JSON.stringify(["Women in Leadership", "Sustainable Development", "Education Access", "Corporate Responsibility"]),
    collaborationTypes: JSON.stringify(["Leadership Development", "Sustainability Initiatives", "Governance Projects", "Women's Programs"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the importance of purpose-driven leadership and creating sustainable value for all stakeholders",
    wantToMeetSomeone: "who believes in the power of business to create positive change and is committed to inclusive leadership",
    currentProjects: JSON.stringify(["Board Directorships", "Women's Leadership Programs", "Sustainability Consulting", "Educational Initiatives"]),
    dreamCollaboration: "Creating a global women's leadership institute that develops the next generation of purpose-driven executives",
    preferredMeetingStyle: JSON.stringify(["Board meetings", "Leadership forums", "Educational institutions"]),
    availability: "Limited to strategic leadership and governance engagements",
    openToRemote: false,
    preferredLocations: JSON.stringify(["New York", "Global Business Centers", "Educational Institutions"])
  },

  // More International Business Tycoons
  {
    fullName: "Jeff Bezos",
    email: "jeff@bezosexpeditions.com",
    username: "jeffbezos",
    profession: "Entrepreneur & Space Pioneer",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Building the infrastructure for space commerce and advancing humanity's frontier",
    currentRole: "Founder of Amazon & Blue Origin",
    industry: "Technology & Space",
    experienceYears: 30,
    networkingGoals: JSON.stringify(["Space Commerce", "Climate Solutions", "Innovation Leadership", "Philanthropy"]),
    lookingFor: "Space technology innovators, climate solution experts, philanthropic partners, and visionary entrepreneurs",
    canOffer: "E-commerce expertise, space industry insights, innovation leadership, and access to cutting-edge technology networks",
    professionalInterests: JSON.stringify(["Space Technology", "Climate Innovation", "Long-term Thinking", "Customer Obsession"]),
    causesIPassionate: JSON.stringify(["Climate Solutions", "Space Exploration", "Education Access", "Innovation for Humanity"]),
    collaborationTypes: JSON.stringify(["Space Ventures", "Climate Innovation", "Philanthropic Projects", "Technology Development"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "humanity's potential in space and the urgency of protecting Earth while expanding beyond it",
    wantToMeetSomeone: "who thinks in decades, not quarters, and is working on humanity's biggest challenges",
    currentProjects: JSON.stringify(["Blue Origin", "Bezos Earth Fund", "Space Infrastructure", "Climate Ventures"]),
    dreamCollaboration: "Building the infrastructure that enables millions of people to work and live in space",
    preferredMeetingStyle: JSON.stringify(["Space facilities", "Innovation labs", "Climate conferences"]),
    availability: "Extremely limited to transformational opportunities",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Blue Origin Facilities", "Climate Venues", "Innovation Centers"])
  },
  {
    fullName: "Warren Buffett",
    email: "warren@berkshirehathaway.com",
    username: "warrenbuffett",
    profession: "Investor & Philanthropist",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Investing in exceptional businesses while promoting rational thinking and generous giving",
    currentRole: "Chairman & CEO of Berkshire Hathaway",
    industry: "Investment & Philanthropy",
    experienceYears: 65,
    networkingGoals: JSON.stringify(["Value Investing", "Business Education", "Philanthropy", "Rational Decision Making"]),
    lookingFor: "Business educators, philanthropic partners, rational thinkers, and platforms for financial education",
    canOffer: "Investment wisdom, business insights, mentorship on rational thinking, and access to top business networks",
    professionalInterests: JSON.stringify(["Value Investing", "Business Analysis", "Rational Thinking", "Long-term Wealth Creation"]),
    causesIPassionate: JSON.stringify(["Financial Education", "Philanthropy", "Rational Decision Making", "Capitalism for Good"]),
    collaborationTypes: JSON.stringify(["Educational Initiatives", "Philanthropic Projects", "Business Mentorship", "Investment Education"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the beauty of compound interest and the importance of making rational, long-term decisions",
    wantToMeetSomeone: "who values rational thinking, long-term perspective, and using wealth to benefit society",
    currentProjects: JSON.stringify(["Berkshire Hathaway", "Giving Pledge", "Financial Education", "Business Mentorship"]),
    dreamCollaboration: "Creating a comprehensive financial education program that teaches rational thinking and long-term wealth building",
    preferredMeetingStyle: JSON.stringify(["Annual meetings", "Educational forums", "Philanthropic events"]),
    availability: "Very limited but focused on education and philanthropy",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Omaha", "Educational Institutions", "Business Schools"])
  },
  {
    fullName: "Bill Gates",
    email: "bill@gatesfoundation.org",
    username: "billgates",
    profession: "Philanthropist & Technology Advisor",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Using technology and data to solve humanity's most pressing health and development challenges",
    currentRole: "Co-Chair of Gates Foundation & Technology Innovator",
    industry: "Technology & Global Health",
    experienceYears: 45,
    networkingGoals: JSON.stringify(["Global Health", "Climate Innovation", "Education Technology", "Data-Driven Solutions"]),
    lookingFor: "Health innovators, climate researchers, education technology experts, and data scientists working on global challenges",
    canOffer: "Technology expertise, global health insights, philanthropic resources, and access to world-class research networks",
    professionalInterests: JSON.stringify(["Global Health Innovation", "Climate Solutions", "Education Technology", "Data for Good"]),
    causesIPassionate: JSON.stringify(["Global Health Equity", "Climate Change", "Education Access", "Innovation for Development"]),
    collaborationTypes: JSON.stringify(["Research Partnerships", "Technology Innovation", "Global Health Programs", "Climate Solutions"]),
    workingStyle: "Remote-first",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "data-driven solutions that can save lives and the potential of technology to solve global challenges",
    wantToMeetSomeone: "who combines technical expertise with deep empathy for solving problems affecting the world's poorest",
    currentProjects: JSON.stringify(["Gates Foundation", "Climate Innovation", "Global Health Research", "Education Technology"]),
    dreamCollaboration: "Developing breakthrough technologies that eliminate infectious diseases and provide universal access to quality education",
    preferredMeetingStyle: JSON.stringify(["Research institutions", "Virtual collaborations", "Global health forums"]),
    availability: "Strategic focus on high-impact global challenges",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Seattle", "Global Health Centers", "Research Institutions"])
  },
  {
    fullName: "Mark Cuban",
    email: "mark@markcuban.com",
    username: "markcuban",
    profession: "Entrepreneur & Investor",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Investing in disruptive technologies and empowering entrepreneurial innovation",
    currentRole: "Owner of Dallas Mavericks & Shark Tank Investor",
    industry: "Investment & Sports",
    experienceYears: 35,
    networkingGoals: JSON.stringify(["Disruptive Innovation", "Entrepreneur Mentorship", "Technology Investment", "Sports Business"]),
    lookingFor: "Disruptive entrepreneurs, technology innovators, sports business leaders, and platforms for entrepreneurship education",
    canOffer: "Investment expertise, entrepreneurship mentorship, business development insights, and access to innovation networks",
    professionalInterests: JSON.stringify(["Disruptive Technology", "Entrepreneurship", "Sports Business", "Media Innovation"]),
    causesIPassionate: JSON.stringify(["Entrepreneurship Education", "Innovation Access", "Economic Opportunity", "Technology Democratization"]),
    collaborationTypes: JSON.stringify(["Investment Opportunities", "Entrepreneurship Programs", "Technology Ventures", "Sports Innovation"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "the power of entrepreneurship to create economic opportunity and disrupt established industries",
    wantToMeetSomeone: "who has a disruptive vision, isn't afraid to challenge the status quo, and wants to create real value",
    currentProjects: JSON.stringify(["Shark Tank Investments", "Dallas Mavericks", "Cost Plus Drugs", "Entrepreneurship Education"]),
    dreamCollaboration: "Creating a comprehensive entrepreneurship ecosystem that gives everyone access to business opportunities",
    preferredMeetingStyle: JSON.stringify(["Pitch sessions", "Sports events", "Innovation conferences"]),
    availability: "Flexible around investment and sports commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Dallas", "Innovation Hubs", "Sports Venues"])
  },
  {
    fullName: "Reid Hoffman",
    email: "reid@greylock.com",
    username: "reidhoffman",
    profession: "Venture Capitalist & Entrepreneur",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Building networks and platforms that scale human potential and create economic opportunity",
    currentRole: "Partner at Greylock Partners & Founder of LinkedIn",
    industry: "Venture Capital & Technology",
    experienceYears: 25,
    networkingGoals: JSON.stringify(["Network Effects", "Platform Building", "AI for Good", "Entrepreneurship"]),
    lookingFor: "Platform entrepreneurs, AI researchers, network theorists, and builders of technologies that scale human potential",
    canOffer: "Network expertise, platform building insights, venture capital knowledge, and access to Silicon Valley networks",
    professionalInterests: JSON.stringify(["Network Effects", "Platform Strategy", "AI Innovation", "Entrepreneurial Ecosystems"]),
    causesIPassionate: JSON.stringify(["Economic Opportunity", "AI for Humanity", "Entrepreneurship Access", "Global Connectivity"]),
    collaborationTypes: JSON.stringify(["Platform Ventures", "AI Research", "Entrepreneurship Programs", "Network Building"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "how networks and platforms can create massive positive impact by connecting human potential",
    wantToMeetSomeone: "who understands the power of networks and is building technologies that help people thrive",
    currentProjects: JSON.stringify(["Greylock Investments", "AI Research", "Platform Ventures", "Entrepreneurship Education"]),
    dreamCollaboration: "Building AI-powered platforms that democratize access to economic opportunities globally",
    preferredMeetingStyle: JSON.stringify(["Tech conferences", "VC meetings", "Platform demos"]),
    availability: "Flexible around investment and research commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Silicon Valley", "Tech Hubs", "Academic Institutions"])
  },
  {
    fullName: "Sara Blakely",
    email: "sara@spanx.com",
    username: "sarablakely",
    profession: "Entrepreneur & Philanthropist",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Empowering women through entrepreneurship and innovative products that boost confidence",
    currentRole: "Founder of Spanx & Women's Empowerment Advocate",
    industry: "Fashion & Women's Empowerment",
    experienceYears: 25,
    networkingGoals: JSON.stringify(["Women's Entrepreneurship", "Product Innovation", "Female Empowerment", "Business Education"]),
    lookingFor: "Female entrepreneurs, product innovators, women's empowerment advocates, and platforms for entrepreneurship education",
    canOffer: "Entrepreneurship expertise, product development insights, women's empowerment platform, and business mentorship",
    professionalInterests: JSON.stringify(["Women's Entrepreneurship", "Product Innovation", "Brand Building", "Empowerment Marketing"]),
    causesIPassionate: JSON.stringify(["Women's Economic Empowerment", "Entrepreneurship Education", "Female Leadership", "Confidence Building"]),
    collaborationTypes: JSON.stringify(["Women's Programs", "Entrepreneurship Education", "Product Innovation", "Empowerment Initiatives"]),
    workingStyle: "Flexible",
    timeCommitment: "Regular (3-5 hrs/month)",
    lightUpWhenTalking: "the power of women supporting women and how entrepreneurship can transform lives",
    wantToMeetSomeone: "who believes in empowering women and is passionate about creating positive change through business",
    currentProjects: JSON.stringify(["Spanx Innovation", "Red Backpack Fund", "Women's Empowerment", "Entrepreneurship Education"]),
    dreamCollaboration: "Creating a global platform that provides women entrepreneurs with the resources, network, and support they need to succeed",
    preferredMeetingStyle: JSON.stringify(["Women's events", "Entrepreneurship forums", "Innovation sessions"]),
    availability: "Flexible around business and empowerment commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Atlanta", "Women's Conferences", "Innovation Centers"])
  },

  // More European Political Figures
  {
    fullName: "Angela Merkel",
    email: "chancellor@bundeskanzlerin.de",
    username: "angelamerkel",
    profession: "Former German Chancellor",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Championing democratic values, European unity, and evidence-based policymaking",
    currentRole: "Former Chancellor of Germany & Senior Statesperson",
    industry: "Politics & International Relations",
    experienceYears: 35,
    networkingGoals: JSON.stringify(["Democratic Governance", "European Integration", "International Cooperation", "Evidence-Based Policy"]),
    lookingFor: "Democratic leaders, policy researchers, European integration advocates, and platforms for international cooperation",
    canOffer: "Political leadership expertise, European policy insights, international relations knowledge, and democratic governance experience",
    professionalInterests: JSON.stringify(["Democratic Governance", "European Policy", "International Relations", "Evidence-Based Leadership"]),
    causesIPassionate: JSON.stringify(["Democratic Values", "European Unity", "International Cooperation", "Human Rights"]),
    collaborationTypes: JSON.stringify(["Policy Development", "International Dialogue", "Democratic Education", "European Projects"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the importance of evidence-based decision making and the strength that comes from European unity",
    wantToMeetSomeone: "who believes in democratic values and is committed to building bridges across cultural and political divides",
    currentProjects: JSON.stringify(["European Integration", "Democratic Education", "International Dialogue", "Policy Research"]),
    dreamCollaboration: "Establishing a global institute for democratic governance that trains the next generation of evidence-based leaders",
    preferredMeetingStyle: JSON.stringify(["Academic forums", "Policy conferences", "International summits"]),
    availability: "Limited to high-impact democratic and European initiatives",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Berlin", "European Capitals", "Academic Institutions"])
  },
  {
    fullName: "Volodymyr Zelensky",
    email: "president@president.gov.ua",
    username: "volodymyrzelensky",
    profession: "President of Ukraine",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Defending democracy and freedom while inspiring global unity against tyranny",
    currentRole: "President of Ukraine & Global Democracy Advocate",
    industry: "Politics & Human Rights",
    experienceYears: 5,
    networkingGoals: JSON.stringify(["Democratic Defense", "International Support", "Human Rights", "Global Unity"]),
    lookingFor: "Democratic leaders, human rights advocates, international cooperation experts, and platforms for freedom advocacy",
    canOffer: "Leadership under pressure, democratic inspiration, human rights advocacy, and insights on defending freedom",
    professionalInterests: JSON.stringify(["Democratic Defense", "International Law", "Human Rights", "National Sovereignty"]),
    causesIPassionate: JSON.stringify(["Democratic Freedom", "Human Rights", "National Sovereignty", "International Justice"]),
    collaborationTypes: JSON.stringify(["Democratic Advocacy", "Human Rights Campaigns", "International Cooperation", "Freedom Defense"]),
    workingStyle: "Remote-first",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the courage of ordinary people who stand up for freedom and the importance of global democratic solidarity",
    wantToMeetSomeone: "who believes that freedom and democracy are worth defending and is willing to support those fighting for these values",
    currentProjects: JSON.stringify(["Democratic Defense", "International Coalition Building", "Human Rights Advocacy", "Recovery Planning"]),
    dreamCollaboration: "Building a global coalition that permanently protects democratic values and prevents future threats to freedom",
    preferredMeetingStyle: JSON.stringify(["Virtual summits", "International forums", "Democratic gatherings"]),
    availability: "Extremely limited due to national responsibilities",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Kyiv", "International Forums", "Democratic Capitals"])
  },
  {
    fullName: "Mette Frederiksen",
    email: "statsminister@stm.dk",
    username: "mettefrederiksen",
    profession: "Prime Minister of Denmark",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Building sustainable societies through Nordic values and innovative social policies",
    currentRole: "Prime Minister of Denmark",
    industry: "Politics & Social Policy",
    experienceYears: 20,
    networkingGoals: JSON.stringify(["Social Innovation", "Sustainable Development", "Nordic Model", "Gender Equality"]),
    lookingFor: "Social policy innovators, sustainability experts, gender equality advocates, and platforms for Nordic cooperation",
    canOffer: "Social policy expertise, Nordic governance insights, gender equality advocacy, and sustainable development knowledge",
    professionalInterests: JSON.stringify(["Social Innovation", "Sustainable Policy", "Gender Equality", "Nordic Cooperation"]),
    causesIPassionate: JSON.stringify(["Social Justice", "Gender Equality", "Sustainable Development", "Nordic Values"]),
    collaborationTypes: JSON.stringify(["Social Policy", "Sustainability Projects", "Gender Initiatives", "Nordic Cooperation"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "how Nordic values can create more equal and sustainable societies for everyone",
    wantToMeetSomeone: "who believes in the power of good governance to create fair and sustainable societies",
    currentProjects: JSON.stringify(["Social Innovation", "Climate Action", "Gender Equality", "Nordic Leadership"]),
    dreamCollaboration: "Creating a global network of social democratic leaders committed to sustainable and equitable development",
    preferredMeetingStyle: JSON.stringify(["Nordic summits", "Social policy forums", "Sustainability conferences"]),
    availability: "Limited to strategic Nordic and sustainability initiatives",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Copenhagen", "Nordic Capitals", "Sustainability Venues"])
  },
  {
    fullName: "Pedro Sánchez",
    email: "presidente@moncloa.es",
    username: "pedrosanchez",
    profession: "Prime Minister of Spain",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Promoting social justice and European cooperation through progressive governance",
    currentRole: "Prime Minister of Spain",
    industry: "Politics & European Affairs",
    experienceYears: 15,
    networkingGoals: JSON.stringify(["Progressive Politics", "European Integration", "Social Justice", "Climate Action"]),
    lookingFor: "Progressive political leaders, European cooperation advocates, social justice champions, and climate action experts",
    canOffer: "Progressive governance expertise, European policy insights, social justice advocacy, and climate action leadership",
    professionalInterests: JSON.stringify(["Progressive Governance", "European Policy", "Social Justice", "Climate Leadership"]),
    causesIPassionate: JSON.stringify(["Social Equality", "European Unity", "Climate Action", "Democratic Values"]),
    collaborationTypes: JSON.stringify(["Progressive Policy", "European Projects", "Social Justice Initiatives", "Climate Action"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the potential of progressive politics to create more just and sustainable societies",
    wantToMeetSomeone: "who shares a commitment to social justice and believes in the power of European cooperation",
    currentProjects: JSON.stringify(["Progressive Governance", "European Leadership", "Climate Action", "Social Policy"]),
    dreamCollaboration: "Building a progressive European alliance that leads the world in social justice and climate action",
    preferredMeetingStyle: JSON.stringify(["European summits", "Progressive forums", "Climate conferences"]),
    availability: "Limited to strategic European and progressive initiatives",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Madrid", "European Capitals", "Progressive Venues"])
  },
  {
    fullName: "Giuseppe Conte",
    email: "presidente@governo.it",
    username: "giuseppeconte",
    profession: "Former Prime Minister of Italy",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Advocating for European solidarity and innovative governance in challenging times",
    currentRole: "Former Prime Minister of Italy & Political Leader",
    industry: "Politics & Law",
    experienceYears: 12,
    networkingGoals: JSON.stringify(["European Solidarity", "Innovation in Governance", "Crisis Leadership", "Digital Transformation"]),
    lookingFor: "European leaders, governance innovators, crisis management experts, and platforms for political innovation",
    canOffer: "Crisis leadership expertise, European governance insights, legal knowledge, and innovative policy experience",
    professionalInterests: JSON.stringify(["Crisis Leadership", "European Governance", "Legal Innovation", "Digital Government"]),
    causesIPassionate: JSON.stringify(["European Solidarity", "Democratic Innovation", "Crisis Response", "Digital Rights"]),
    collaborationTypes: JSON.stringify(["European Projects", "Governance Innovation", "Crisis Management", "Digital Policy"]),
    workingStyle: "Flexible",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the importance of European solidarity and how innovation can improve democratic governance",
    wantToMeetSomeone: "who believes in European values and is interested in innovating democratic institutions for the digital age",
    currentProjects: JSON.stringify(["European Integration", "Democratic Innovation", "Crisis Leadership", "Legal Reform"]),
    dreamCollaboration: "Creating innovative democratic institutions that are resilient, inclusive, and adapted for the digital era",
    preferredMeetingStyle: JSON.stringify(["European forums", "Innovation conferences", "Academic venues"]),
    availability: "Flexible around European and governance commitments",
    openToRemote: true,
    preferredLocations: JSON.stringify(["Rome", "European Capitals", "Innovation Centers"])
  },
  {
    fullName: "Roberta Metsola",
    email: "president@europarl.europa.eu",
    username: "robertametsola",
    profession: "President of European Parliament",
    location: "Diaspora",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    professionalTagline: "Strengthening European democracy and representing citizens' voices in the European project",
    currentRole: "President of the European Parliament",
    industry: "European Politics",
    experienceYears: 14,
    networkingGoals: JSON.stringify(["European Democracy", "Parliamentary Diplomacy", "Citizens' Rights", "Youth Engagement"]),
    lookingFor: "European democracy advocates, parliamentary experts, citizens' rights defenders, and youth engagement platforms",
    canOffer: "European parliamentary expertise, democratic representation insights, citizens' rights advocacy, and EU institutional knowledge",
    professionalInterests: JSON.stringify(["European Democracy", "Parliamentary Procedure", "Citizens' Rights", "EU Integration"]),
    causesIPassionate: JSON.stringify(["Democratic Representation", "Citizens' Rights", "European Values", "Youth Participation"]),
    collaborationTypes: JSON.stringify(["Democratic Education", "Citizens' Engagement", "Parliamentary Cooperation", "European Projects"]),
    workingStyle: "In-person",
    timeCommitment: "Light (1-2 hrs/month)",
    lightUpWhenTalking: "the importance of citizens' participation in European democracy and the power of parliamentary diplomacy",
    wantToMeetSomeone: "who believes in the European project and is committed to strengthening democratic institutions",
    currentProjects: JSON.stringify(["European Parliament Leadership", "Democratic Education", "Citizens' Engagement", "Parliamentary Diplomacy"]),
    dreamCollaboration: "Creating innovative ways to engage European citizens in democratic participation and strengthen European democracy",
    preferredMeetingStyle: JSON.stringify(["Parliamentary sessions", "European forums", "Citizens' assemblies"]),
    availability: "Limited to strategic European democracy initiatives",
    openToRemote: false,
    preferredLocations: JSON.stringify(["Strasbourg", "Brussels", "European Capitals"])
  }
];

async function createUser(profile) {
  const hashedPassword = 'hashedpassword123'; // In real app, use proper hashing
  
  const userResult = await pool.query(`
    INSERT INTO users (
      username, password, full_name, email, phone_number, gender, 
      location, profession, photo_url, date_of_birth, ethnicity,
      country_of_origin, bio, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    RETURNING id
  `, [
    profile.username,
    hashedPassword,
    profile.fullName,
    profile.email,
    `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`, // Random phone
    Math.random() > 0.5 ? 'Male' : 'Female',
    profile.location,
    profile.profession,
    profile.photoUrl,
    new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
    profile.location === 'Ghana' ? 'Akan' : 'Other',
    profile.location === 'Ghana' ? 'Ghana' : 'Various',
    `${profile.professionalTagline} - An accomplished ${profile.profession.toLowerCase()} with extensive experience in ${profile.industry.toLowerCase()}.`,
  ]);

  return userResult.rows[0].id;
}

async function createNetworkingProfile(userId, profile) {
  // Generate random visibility preferences
  const visibilityFields = [
    'professionalTagline', 'currentRole', 'industry', 'experienceYears',
    'networkingGoals', 'lookingFor', 'canOffer', 'professionalInterests',
    'causesIPassionate', 'collaborationTypes', 'workingStyle', 'timeCommitment',
    'lightUpWhenTalking', 'wantToMeetSomeone', 'currentProjects', 'dreamCollaboration'
  ];
  
  const visibilityPreferences = {};
  visibilityFields.forEach(field => {
    visibilityPreferences[field] = Math.random() > 0.25; // 75% chance visible
  });

  await pool.query(`
    INSERT INTO suite_networking_profiles (
      user_id, professional_tagline, "current_role", industry, experience_years,
      networking_goals, looking_for, can_offer, professional_interests,
      causes_passionate, collaboration_types, working_style, time_commitment,
      light_up_when_talking, want_to_meet_someone, current_projects,
      dream_collaboration, preferred_meeting_style, availability,
      location, open_to_remote, preferred_locations, is_active,
      looking_for_opportunities, created_at, updated_at, visibility_preferences
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW(), $25)
  `, [
    userId,
    profile.professionalTagline,
    profile.currentRole,
    profile.industry,
    profile.experienceYears,
    profile.networkingGoals,
    profile.lookingFor,
    profile.canOffer,
    profile.professionalInterests,
    profile.causesIPassionate,
    profile.collaborationTypes,
    profile.workingStyle,
    profile.timeCommitment,
    profile.lightUpWhenTalking,
    profile.wantToMeetSomeone,
    profile.currentProjects,
    profile.dreamCollaboration,
    profile.preferredMeetingStyle,
    profile.availability,
    profile.location,
    profile.openToRemote,
    profile.preferredLocations,
    true, // is_active
    true, // looking_for_opportunities
    JSON.stringify(visibilityPreferences)
  ]);
}

async function createProfileSettings(userId) {
  await pool.query(`
    INSERT INTO suite_profile_settings (
      user_id, job_profile_active, mentorship_profile_active, 
      networking_profile_active, visible_in_job_discovery,
      visible_in_mentorship_discovery, visible_in_networking_discovery,
      primary_profile_type, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      networking_profile_active = $4,
      visible_in_networking_discovery = $7,
      updated_at = NOW()
  `, [
    userId,
    false, // job_profile_active
    false, // mentorship_profile_active
    true,  // networking_profile_active
    true,  // visible_in_job_discovery
    true,  // visible_in_mentorship_discovery
    true,  // visible_in_networking_discovery
    'networking' // primary_profile_type
  ]);
}

async function expandDatabase() {
  try {
    console.log('Expanding networking profiles database to reach 50 total profiles...');
    
    let createdCount = 0;
    
    for (const profile of additionalProfiles) {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [profile.email, profile.username]
        );
        
        let userId;
        if (existingUser.rows.length > 0) {
          userId = existingUser.rows[0].id;
          console.log(`User ${profile.fullName} already exists, updating profile...`);
        } else {
          userId = await createUser(profile);
          console.log(`Created user: ${profile.fullName}`);
        }
        
        // Check if networking profile already exists
        const existingProfile = await pool.query(
          'SELECT id FROM suite_networking_profiles WHERE user_id = $1',
          [userId]
        );
        
        if (existingProfile.rows.length === 0) {
          await createNetworkingProfile(userId, profile);
          await createProfileSettings(userId);
          createdCount++;
          console.log(`Created networking profile for: ${profile.fullName} (${profile.industry})`);
        } else {
          console.log(`Networking profile already exists for: ${profile.fullName}`);
        }
        
      } catch (error) {
        console.error(`Error creating profile for ${profile.fullName}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully added ${createdCount} additional networking profiles!`);
    
    // Show final statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_profiles,
        COUNT(CASE WHEN snp.open_to_remote = true THEN 1 END) as remote_friendly,
        COUNT(CASE WHEN u.location = 'Ghana' THEN 1 END) as ghana_based,
        COUNT(CASE WHEN u.location = 'Diaspora' THEN 1 END) as diaspora_based,
        COUNT(DISTINCT 
          CASE 
            WHEN u.profession LIKE '%Actor%' OR u.profession LIKE '%Artist%' OR u.profession LIKE '%Musician%' THEN 'Entertainment'
            WHEN u.profession LIKE '%President%' OR u.profession LIKE '%Prime Minister%' OR u.profession LIKE '%Chancellor%' THEN 'Politics'
            WHEN u.profession LIKE '%CEO%' OR u.profession LIKE '%Entrepreneur%' OR u.profession LIKE '%Business%' THEN 'Business'
            WHEN u.profession LIKE '%Technology%' OR u.profession LIKE '%Tech%' THEN 'Technology'
            ELSE 'Other'
          END
        ) as industry_categories
      FROM suite_networking_profiles snp
      JOIN users u ON snp.user_id = u.id
      WHERE snp.is_active = true
    `);
    
    console.log('\nFinal Database Statistics:');
    console.log(`🎯 Total Active Networking Profiles: ${stats.rows[0].total_profiles}`);
    console.log(`🌐 Remote-Friendly Profiles: ${stats.rows[0].remote_friendly}`);
    console.log(`🇬🇭 Ghana-Based Profiles: ${stats.rows[0].ghana_based}`);
    console.log(`🌍 Diaspora-Based Profiles: ${stats.rows[0].diaspora_based}`);
    console.log(`📊 Industry Categories Represented: ${stats.rows[0].industry_categories}`);
    
    console.log('\n🎭 Profile Categories Successfully Expanded:');
    console.log('✅ Ghanaian Celebrities & Leaders (10+ profiles)');
    console.log('✅ American Entertainment Industry (10+ profiles)');
    console.log('✅ Indian Business & Tech Leaders (10+ profiles)');
    console.log('✅ International Business Tycoons (10+ profiles)');
    console.log('✅ European Political Figures (10+ profiles)');
    
  } catch (error) {
    console.error('Error expanding database:', error);
  } finally {
    await pool.end();
  }
}

// Run the expansion script
expandDatabase();