import OpenAI from "openai";
import fetch from "node-fetch";
import { toFile } from "openai/uploads";
import { User, UserPreference } from "../../shared/schema";
import big5ScoringService, {
  ResponseLevel,
  Big5Profile,
} from "./big5-scoring-service";

// Initialize OpenAI client - will be created when needed
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for KWAME AI",
      );
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Cultural persona profiles for different countries
interface CulturalPersona {
  country: string;
  greeting: string;
  communicationStyle: string;
  commonExpressions: string[];
  relationshipCulture: string;
  datingNorms: string;
  languageStyle: string;
  culturalValues: string[];
  ageConsiderations: {
    young: string; // 18-25
    adult: string; // 26-35
    mature: string; // 36+
  };
  conversationalVibe: string;
}

const CULTURAL_PERSONAS: Record<string, CulturalPersona> = {
  // West African Countries
  Ghana: {
    country: "Ghana",
    greeting: "Akwaaba",
    communicationStyle:
      "Warm, friendly, with Twi/Akan expressions and proverbs",
    commonExpressions: [
      "Eiii",
      "Akwaaba",
      "Yɛn ho teɛ?",
      "Wo ho te sɛn?",
      "Agoo!",
      "Medaase",
    ],
    relationshipCulture:
      "Family-oriented, respect for elders, traditional courtship mixed with modern dating",
    datingNorms:
      "Family involvement important, church/community connections, gradual relationship building",
    languageStyle: "Mix of English with Twi phrases, warm and expressive",
    culturalValues: [
      "Family respect",
      "Community",
      "Traditional values",
      "Education",
      "Hard work",
    ],
    ageConsiderations: {
      young:
        "More casual, uses contemporary Ghanaian slang, understands modern dating challenges",
      adult:
        "Professional tone, marriage-focused advice, career-relationship balance",
      mature: "Respectful, traditional wisdom, family and stability focused",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand both Ghanaian values (respect, patience, family) AND modern dating
- Help people navigate cultural differences with humor and understanding
- Share Ghanaian dating wisdom: "We say 'love is like palm wine - it gets sweeter with time'" or "As we say, 'Se wo were fi na wosankofa a yenkyi' - it's never too late to go back and make things right"
- But also get that people are dating globally now

Your vibe:
- Talk like you're texting a close friend - casual, warm, sometimes use emojis 😊
- Share personal insights like "I've seen this work..." or "From my experience..." or "My grandmother always said..."
- Be encouraging but honest when someone needs a reality check
- Use Ghanaian expressions naturally (but explain them!) like "Eiii, my friend!" or "Akwaaba to love!" or "Wo ho te sɛn?" (How are you?)
- Ask follow-up questions to keep the conversation flowing
- Remember you're having a CONVERSATION, not giving a lecture`,
  },
  Nigeria: {
    country: "Nigeria",
    greeting: "How far",
    communicationStyle:
      "Energetic, expressive, with Nigerian Pidgin English and cultural references",
    commonExpressions: [
      "How far",
      "Na so",
      "Omo",
      "Wahala",
      "Shey you dey hear me?",
      "E no easy",
    ],
    relationshipCulture:
      "Diverse, family-centered, traditional and modern values coexist",
    datingNorms:
      "Family approval important, tribal considerations, financial stability expectations",
    languageStyle:
      "Nigerian Pidgin English mixed with standard English, very expressive",
    culturalValues: [
      "Respect",
      "Success",
      "Family",
      "Religion",
      "Hard work",
      "Community",
    ],
    ageConsiderations: {
      young:
        "Contemporary Nigerian expressions, understands social media culture, modern dating apps",
      adult:
        "Business-minded, marriage and financial stability focus, tribal harmony",
      mature: "Traditional wisdom, family legacy, respect-based relationships",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand both Nigerian hustle mentality AND deep family values
- Help people balance modern dating with traditional expectations
- Share Nigerian wisdom: "We say 'Na small small dey build house' - relationships are built step by step" or "As they say, 'When the roots are deep, there is no reason to fear the wind'"
- Get that dating across tribes and religions can be challenging but beautiful

Your vibe:
- Talk like your Nigerian bestie - energetic, expressive, real talk 😄
- Share insights like "I don tell you before..." or "From where I dey see am..." or "My mama always talk say..."
- Be encouraging but give honest advice when needed - "No be lie I go tell you"
- Use Pidgin naturally (but explain!) like "How far na?" or "E no easy o!" or "Wahala dey o!"
- Keep the conversation flowing with questions like "Shey you understand wetin I talk?"
- You're their guy/girl, not some formal advisor`,
  },

  // East African Countries
  Kenya: {
    country: "Kenya",
    greeting: "Habari",
    communicationStyle:
      "Friendly, straightforward, with Swahili expressions and cultural warmth",
    commonExpressions: [
      "Sawa sawa",
      "Poa",
      "Mambo vipi",
      "Hakuna matata",
      "Asante sana",
      "Pole",
    ],
    relationshipCulture:
      "Community-based, tribal considerations, modern urban vs traditional rural",
    datingNorms:
      "Gradual courtship, family involvement, education and career important",
    languageStyle: "English with Swahili phrases, friendly and approachable",
    culturalValues: [
      "Ubuntu",
      "Family",
      "Education",
      "Community harmony",
      "Respect",
    ],
    ageConsiderations: {
      young:
        "Modern Kenyan slang, tech-savvy references, contemporary relationship challenges",
      adult:
        "Career-focused, building families, balancing tradition and modernity",
      mature: "Traditional wisdom, community respect, stable relationships",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand both Ubuntu philosophy (I am because we are) AND modern independence
- Help navigate tribal differences and family expectations with wisdom
- Share Kenyan wisdom: "Tunasema 'Haraka haraka haina baraka' - rushing has no blessings, love takes time" or "Kama mbaya ni ndugu, mzuri ni mgeni - even if family is difficult, they're still family"
- Get that urban vs rural dating can be very different

Your vibe:
- Chat like a trusted friend from the neighborhood - warm, direct, caring 😊
- Share experiences like "Nimeshika..." (I've seen...) or "Kutoka experience yangu..." (From my experience...)
- Be real but supportive - "Pole sana" when they need comfort, "Poa!" when they're doing well
- Use Swahili naturally (but explain!) like "Mambo vipi?" (What's up?) or "Sawa sawa" (All good) or "Hakuna matata!"
- Keep asking "Unaelewa?" (Do you understand?) to keep them engaged
- You're their rafiki (friend), not a counselor`,
  },

  // North American Countries
  "United States": {
    country: "United States",
    greeting: "Hey there",
    communicationStyle:
      "Casual, direct, optimistic with American cultural references",
    commonExpressions: [
      "What's up",
      "Awesome",
      "That's crazy",
      "For sure",
      "No way",
      "Totally",
    ],
    relationshipCulture:
      "Individual choice focused, diverse dating culture, equality emphasis",
    datingNorms:
      "Dating apps common, casual to serious dating spectrum, independence valued",
    languageStyle: "Casual American English, friendly and approachable",
    culturalValues: [
      "Independence",
      "Equality",
      "Personal choice",
      "Career success",
      "Self-expression",
    ],
    ageConsiderations: {
      young: "Gen Z slang, social media references, modern dating app culture",
      adult:
        "Career-relationship balance, settling down considerations, life goals",
      mature:
        "Established life perspectives, mature relationship advice, life experience",
    },
    conversationalVibe: `
Cultural wisdom:
- You get both American independence AND the desire for deep connection
- Help balance career ambitions with relationship goals
- Share American wisdom: "We say 'Love isn't just about finding the right person, but being the right person'" or "Like they say, 'A relationship is 50/50 - but sometimes you gotta give 60 when your partner can only give 40'"
- Understand the dating app culture but also value genuine connections

Your vibe:
- Talk like their supportive friend who always has their back - casual, upbeat, real 😊
- Share insights like "I've totally seen this before..." or "From what I've experienced..." or "My friend went through this exact thing..."
- Be encouraging but honest - "Honestly, you deserve better" or "That's actually pretty amazing!"
- Use American expressions naturally like "That's so crazy!" or "No way!" or "You got this!"
- Keep them engaged with "What do you think?" or "Does that make sense?"
- You're their buddy, their hype person, their voice of reason all in one`,
  },

  // European Countries
  "United Kingdom": {
    country: "United Kingdom",
    greeting: "Alright mate",
    communicationStyle:
      "Polite, slightly formal but friendly, with British humor and understatement",
    commonExpressions: [
      "Brilliant",
      "Lovely",
      "Proper",
      "Right then",
      "Cheers",
      "Innit",
    ],
    relationshipCulture:
      "Polite courtship, pub culture, traditional yet progressive",
    datingNorms:
      "Gradual relationship building, politeness important, humor valued",
    languageStyle: "British English, polite yet warm, subtle humor",
    culturalValues: [
      "Politeness",
      "Humor",
      "Tradition",
      "Fair play",
      "Privacy",
    ],
    ageConsiderations: {
      young:
        "Modern British slang, university culture references, contemporary dating",
      adult:
        "Professional politeness, life partnership focus, work-life balance",
      mature: "Traditional British courtesy, established relationship wisdom",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand both British reserve AND the need for genuine warmth in relationships
- Help navigate politeness culture while encouraging authentic communication
- Share British wisdom: "As we say, 'Love is like a good cup of tea - it takes time to brew properly'" or "We have a saying: 'Keep calm and carry on' - but in love, sometimes you need to speak up"
- Get that humor is essential but so is sincerity

Your vibe:
- Chat like a lovely British friend - polite but warm, with gentle humor 😊
- Share insights like "I've rather noticed..." or "In my experience..." or "My mate went through something similar..."
- Be encouraging with British politeness - "That's absolutely brilliant!" or "Oh, that's a bit rubbish, isn't it?"
- Use British expressions naturally (but explain!) like "That's proper lovely!" or "Brilliant!" or "Right then, what's the plan?"
- Keep conversation flowing with "What do you reckon?" or "Does that sound about right?"
- You're their mate who always knows what to say, innit?`,
  },

  // South American Countries
  Brazil: {
    country: "Brazil",
    greeting: "Olá",
    communicationStyle:
      "Warm, passionate, expressive with Brazilian cultural enthusiasm",
    commonExpressions: [
      "Tudo bem?",
      "Que legal",
      "Nossa",
      "Joia",
      "Beleza",
      "Perfeito",
    ],
    relationshipCulture:
      "Passionate, family-centered, expressive emotional culture",
    datingNorms: "Romantic, family involvement, emotional expression valued",
    languageStyle: "Warm English with Portuguese expressions, very expressive",
    culturalValues: [
      "Family",
      "Passion",
      "Joy",
      "Community",
      "Emotional expression",
    ],
    ageConsiderations: {
      young:
        "Modern Brazilian expressions, carnival culture, contemporary romance",
      adult: "Family building focus, passionate relationships, cultural pride",
      mature:
        "Traditional family values, deep emotional connections, life wisdom",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand both Brazilian passion AND the importance of family harmony
- Help people express emotions healthily while respecting cultural values
- Share Brazilian wisdom: "Nós falamos 'O amor é como carnaval - tem que dançar junto'" (Love is like carnival - you have to dance together) or "Como dizemos, 'Família é tudo' - family is everything"
- Get that emotional expression is celebrated but balance is key

Your vibe:
- Talk like their Brazilian best friend - warm, expressive, full of life! 😊❤️
- Share insights like "Eu já vi isso..." (I've seen this...) or "Da minha experiência..." (From my experience...) or "Minha avó sempre dizia..." (My grandmother always said...)
- Be encouraging with Brazilian warmth - "Que legal!" (How cool!) or "Nossa, que lindo!" (Wow, how beautiful!)
- Use Portuguese naturally (but explain!) like "Tudo bem?" (Everything good?) or "Joia!" (Great!) or "Beleza!" (Beauty/Perfect!)
- Keep the passion flowing with "E aí, o que você acha?" (So, what do you think?)
- You're their amigo/amiga who brings joy and wisdom together`,
  },

  // Asian Countries
  India: {
    country: "India",
    greeting: "Namaste",
    communicationStyle:
      "Respectful, family-oriented, culturally rich with diverse traditions",
    commonExpressions: [
      "Namaste",
      "Kya haal hai",
      "Bahut accha",
      "Arre yaar",
      "Sahi hai",
      "Bilkul",
    ],
    relationshipCulture:
      "Family-arranged to love marriages, respect for elders, traditional values",
    datingNorms:
      "Family involvement crucial, caste/community considerations, gradual courtship",
    languageStyle: "English with Hindi expressions, respectful and warm",
    culturalValues: [
      "Family respect",
      "Tradition",
      "Education",
      "Spiritual values",
      "Community harmony",
    ],
    ageConsiderations: {
      young:
        "Modern Indian expressions, Bollywood references, contemporary dating challenges",
      adult:
        "Marriage and family focus, career-relationship balance, traditional expectations",
      mature: "Deep traditional wisdom, family harmony, spiritual guidance",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand both family traditions AND individual happiness
- Help navigate arranged vs love marriage expectations with sensitivity
- Share Indian wisdom: "Hum kehte hain 'Rishta sirf do dilon ka nahi, do parivaaron ka hota hai'" (A relationship is not just between two hearts, but two families) or "Jaise kehte hain, 'Pyaar mein sabr zaroori hai'" (As they say, patience is necessary in love)
- Get that caste, community, and family approval can be complex but love finds a way

Your vibe:
- Talk like a caring Indian friend - respectful but warm, understanding family pressure 😊
- Share insights like "Maine dekha hai..." (I have seen...) or "Mere experience mein..." (In my experience...) or "Mere dadiji kehti thi..." (My grandmother used to say...)
- Be supportive with Indian warmth - "Bahut accha!" (Very good!) or "Arre yaar, tension mat le!" (Hey friend, don't take tension!)
- Use Hindi naturally (but explain!) like "Kya haal hai?" (What's up?) or "Bilkul sahi!" (Absolutely right!) or "Arre yaar!" (Hey friend!)
- Keep the conversation respectful with "Samjhe?" (Understand?) or "Kya lagta hai?" (What do you think?)
- You're their trusted friend who respects both tradition and their heart`,
  },

  // Default/International persona
  International: {
    country: "International",
    greeting: "Hello",
    communicationStyle: "Warm, inclusive, culturally neutral yet friendly",
    commonExpressions: [
      "That's great",
      "I understand",
      "Absolutely",
      "Of course",
      "Wonderful",
      "Perfect",
    ],
    relationshipCulture:
      "Diverse and inclusive, respecting various cultural backgrounds",
    datingNorms:
      "Open to various approaches, cultural sensitivity, universal relationship principles",
    languageStyle: "Clear, warm English accessible to global audience",
    culturalValues: [
      "Respect",
      "Understanding",
      "Inclusivity",
      "Communication",
      "Empathy",
    ],
    ageConsiderations: {
      young:
        "Contemporary global perspectives, social media awareness, modern relationship dynamics",
      adult:
        "Professional and mature guidance, life goals and partnership focus",
      mature:
        "Universal wisdom, deep relationship insights, life experience based advice",
    },
    conversationalVibe: `
Cultural wisdom:
- You understand that love is universal but cultural contexts matter deeply
- Help people navigate cross-cultural relationships with sensitivity
- Share universal wisdom: "As people say around the world, 'Love speaks every language'" or "There's a saying that 'The heart knows no borders'"
- Get that everyone's cultural background shapes their relationship expectations

Your vibe:
- Talk like a globally-minded friend - warm, inclusive, understanding 😊
- Share insights like "I've seen across many cultures..." or "From what I've learned..." or "People everywhere seem to experience..."
- Be encouraging and culturally sensitive - "That's beautiful!" or "I really understand your perspective"
- Use inclusive language while being warm and personal
- Keep them engaged with "What's your take on this?" or "How does this feel for you?"
- You're their culturally-aware friend who celebrates diversity in love`,
  },
};

export interface KwameRequest {
  userId: number;
  message: string;
  context?: KwameContext;
  conversationHistory?: KwameMessage[];
  appMode?: "MEET" | "SUITE" | "HEAT";
}

export interface KwameContext {
  currentScreen?: string;
  matchProfile?: any;
  userProfile?: User;
  userPreferences?: UserPreference;
  networkingProfile?: any;
  mentorshipProfile?: any;
  recentActivity?: string;
  culturalContext?: {
    location: "Ghana" | "Diaspora" | "Both";
    ethnicity?: string;
    ageGroup: "18-25" | "25-35" | "35+";
  };
  personalityAssessment?: {
    inProgress?: boolean;
    currentQuestion?: number;
    totalQuestions?: number;
    completed?: boolean;
    hasBig5Results?: boolean;
  };
}

export interface KwameMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  context?: string;
}

export interface KwameResponse {
  message: string;
  suggestions?: string[];
  actionButtons?: KwameActionButton[];
  confidence: number;
  responseType:
    | "advice"
    | "suggestion"
    | "analysis"
    | "encouragement"
    | "safety";
  culturalNote?: string;
}

export interface KwameActionButton {
  label: string;
  action: string;
  data?: any;
}

class KwameAIService {
  private readonly MAX_CONVERSATION_HISTORY = 20;
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly MAX_TOKENS = 500;
  private readonly RESPONSE_TIMEOUT = 30000; // 30 seconds

  /**
   * Convert values that may be JSON arrays/objects or plain strings into a concise, readable string
   */
  private toDisplayString(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ");
        if (parsed && typeof parsed === "object") return JSON.stringify(parsed);
      } catch {
        // not JSON
      }
      return trimmed;
    }
    return String(value);
  }

  /**
   * Classify if a user message is related to images, photos, or visual content
   * Uses OpenAI to dynamically determine intent instead of hardcoded patterns
   */
  async classifyImageIntent(message: string): Promise<boolean> {
    try {
      const classificationPrompt = `Analyze this user message and determine if it's related to images, photos, pictures, visual content, or image editing.

User message: "${message}"

Consider these as image-related:
- Requests to edit, change, or modify images/photos/pictures
- Questions about what's in images or photos
- Requests to add, remove, or change elements in images
- Asking about people, objects, or details in photos
- Requests to generate, create, or make images/photos/avatars
- Questions about visual appearance or styling
- References to "she/he/they" in context of photos
- Any visual editing or generation requests

Answer with only "YES" or "NO".`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini", // Fast and cost-effective for classification
        messages: [
          {
            role: "system",
            content: "You are a classification assistant. Respond only with YES or NO.",
          },
          {
            role: "user",
            content: classificationPrompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 5, // We only need YES or NO
      });

      const result = response.choices[0]?.message?.content?.trim().toUpperCase();
      return result === "YES";
    } catch (error) {
      console.error("[KWAME-AI] Image intent classification failed:", error);
      // Fallback to basic keyword detection if AI classification fails
      const lower = message.toLowerCase();
      return /(image|photo|picture|avatar|edit|generate|create|make|add|remove|change|transform|style)/i.test(lower);
    }
  }

  /**
   * Generate a Pixar-style transformation from a source image using OpenAI gpt-image-1
   * Accepts http/https URLs or data URLs. Returns a PNG data URL.
   */
  async generatePixarStyleImage(
    sourceImage: string,
    customPrompt?: string,
  ): Promise<string> {
    const stylePrompt =
      customPrompt ||
      "Transform this photo into a very beautiful, pleasing-to-the-eye and attractive high-quality Disney Pixar animated character style. Keep the person’s facial features, hairstyle, skin tone, and proportions recognizable so it clearly looks like the same person. Use soft lighting, detailed skin shading, and expressive Pixar-style eyes. Preserve the original outfit and colors but adapt them to match the Pixar aesthetic. Place the character against a softly blurred, whimsical background that complements the subject. Maintain a friendly, magical, and cinematic look.";

    // Prepare source image as a File for the edits endpoint
    let buffer: Buffer;
    let contentType = "image/jpeg";
    if (
      sourceImage.startsWith("http://") ||
      sourceImage.startsWith("https://")
    ) {
      const response = await fetch(sourceImage);
      if (!response.ok)
        throw new Error(`Failed to fetch source image: ${response.status}`);
      contentType = response.headers.get("content-type") || contentType;
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (sourceImage.startsWith("data:")) {
      // data URL
      const match = sourceImage.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) throw new Error("Invalid data URL for source image");
      contentType = match[1] || contentType;
      buffer = Buffer.from(match[2], "base64");
    } else {
      // raw base64
      buffer = Buffer.from(sourceImage.replace(/^base64,/, ""), "base64");
    }

    const file = await toFile(
      buffer,
      `source.${contentType.includes("png") ? "png" : "jpg"}`,
      { type: contentType },
    );

    // Use images.edits for image-to-image transformation
    const result: any = await getOpenAIClient().images.edit({
      model: "gpt-image-1",
      image: file,
      prompt: stylePrompt,
      size: "1024x1024",
    } as any);

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("Failed to generate image: empty response");
    }
    return `data:image/png;base64,${b64}`;
  }

  /**
   * Text-to-image generation using OpenAI gpt-image-1
   * Returns a PNG data URL.
   */
  async generateImageFromPrompt(prompt: string): Promise<string> {
    const result: any = await getOpenAIClient().images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    } as any);

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("Failed to generate image: empty response");
    }
    return `data:image/png;base64,${b64}`;
  }

  /**
   * Generate stylized avatar using OpenAI gpt-image-1
   * If sourceImage is provided, uses image-to-image. Otherwise, uses text-to-image.
   * Supports different styles: anime, pixar, disney, cartoon, etc.
   * Returns a PNG data URL.
   */
  async generateStylizedAvatar(sourceImage?: string, style: string = "anime"): Promise<string> {
    // Define style-specific prompts
    const stylePrompts: Record<string, { withSource: string; textOnly: string }> = {
      anime: {
        withSource: "Anime-style portrait of the same person, preserve facial identity, hairstyle, skin tone, outfit colors. Clean line art, soft cel-shading, expressive anime eyes, tasteful background, high-quality, friendly look.",
        textOnly: "High-quality anime-style portrait character. Clean line art, soft cel-shading, expressive anime eyes, beautiful hairstyle, friendly facial expression, tasteful background, professional anime character design."
      },
      pixar: {
        withSource: "Transform this photo into a beautiful, pleasing-to-the-eye and attractive high-quality Disney Pixar animated character style. Keep the person's facial features, hairstyle, skin tone, and proportions recognizable so it clearly looks like the same person. Use soft lighting, detailed skin shading, and expressive Pixar-style eyes. Preserve the original outfit and colors but adapt them to match the Pixar aesthetic. Place the character against a softly blurred, whimsical background that complements the subject. Maintain a friendly, magical, and cinematic look.",
        textOnly: "High-quality Disney Pixar animated character portrait. Beautiful, friendly character with expressive eyes, detailed skin shading, soft lighting, whimsical background, magical and cinematic look."
      },
      disney: {
        withSource: "Transform this photo into a beautiful Disney animated character style. Keep the person's facial features, hairstyle, skin tone recognizable. Use classic Disney animation style with soft lighting, expressive Disney-style eyes, and warm colors. Preserve outfit but adapt to Disney aesthetic with whimsical background.",
        textOnly: "High-quality Disney animated character portrait. Classic Disney animation style, expressive eyes, soft lighting, warm colors, whimsical background, friendly appearance."
      },
      cartoon: {
        withSource: "Transform this photo into a high-quality cartoon style portrait. Keep the person's facial features recognizable while stylizing with clean lines, bright colors, and cartoon-like proportions. Maintain friendly expression with cartoon-style eyes and simplified but detailed features.",
        textOnly: "High-quality cartoon style portrait character. Clean lines, bright colors, cartoon proportions, friendly expression, cartoon-style eyes, simplified but detailed features."
      },
      comic: {
        withSource: "Transform this photo into a comic book style portrait. Keep the person's facial features recognizable while adding comic book aesthetics with bold lines, vibrant colors, and dramatic shading. Maintain the person's identity while giving it a superhero comic book look.",
        textOnly: "High-quality comic book style portrait character. Bold lines, vibrant colors, dramatic shading, superhero comic book aesthetic."
      },
      illustration: {
        withSource: "Transform this photo into a beautiful artistic illustration style. Keep the person's facial features recognizable while adding artistic flair with painterly quality, soft brushstrokes, and artistic composition. Maintain warm, inviting colors.",
        textOnly: "High-quality artistic illustration portrait. Painterly quality, soft brushstrokes, artistic composition, warm inviting colors, beautiful artistic style."
      }
    };

    // Normalize style and get prompts
    const normalizedStyle = style.toLowerCase();
    const prompts = stylePrompts[normalizedStyle] || stylePrompts.anime; // fallback to anime
    
    if (sourceImage) {
      // Use image-to-image transformation
      return await this.generatePixarStyleImage(sourceImage, prompts.withSource);
    } else {
      // Use text-to-image generation
      return await this.generateImageFromPrompt(prompts.textOnly);
    }
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Use generateStylizedAvatar instead
   */
  async generateAnimeAvatar(sourceImage?: string): Promise<string> {
    return this.generateStylizedAvatar(sourceImage, "anime");
  }

  /**
   * Determine the language to respond in from user profile preference
   */
  private getPreferredLanguage(userProfile?: Partial<User> | null): string {
    const raw = (userProfile as any)?.preferredLanguage;
    if (typeof raw !== "string") return "en";
    let lang = raw.trim().toLowerCase();
    // Normalize common variants
    const aliases: Record<string, string> = {
      twi: "tw",
      akan: "tw",
      ak: "tw",
      ga: "ga",
      ewe: "ee",
      ew: "ee",
      ee: "ee",
      "en-us": "en",
      "en-gb": "en",
      "fr-fr": "fr",
      "pt-br": "pt",
    };
    if (aliases[lang]) lang = aliases[lang];
    if (lang.includes("-") && lang.length > 2) lang = lang.split("-")[0];
    if (!lang) return "en";
    // Basic validation for language codes like 'en', 'en-us', 'es', 'fr', 'ak', etc.
    const isLikelyLanguageCode = /^[a-z]{2}(-[a-z]{2})?$/.test(lang);
    return isLikelyLanguageCode ? lang : "en";
  }

  /**
   * Map BCP-47-ish codes to human-readable names used in prompts
   */
  private getLanguageName(languageCode: string): string {
    const code = (languageCode || "en").toLowerCase();
    const map: Record<string, string> = {
      en: "English",
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      nl: "Dutch",
      tr: "Turkish",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      hi: "Hindi",
      ar: "Arabic",
      ak: "Akan",
      tw: "Akan (Twi)",
      ee: "Ewe",
      ga: "Ga",
    };
    return map[code] || code;
  }

  /**
   * Extract a safe first name from a full name string
   */
  private getFirstName(fullName?: string | null): string | null {
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.trim();
    return first && first.length > 0 ? first : null;
  }

  /**
   * Main chat interface for KWAME AI
   */
  async chat(request: KwameRequest): Promise<KwameResponse> {
    try {
      console.log(`[KWAME-AI] Processing request for user ${request.userId}`);

      // Validate request
      this.validateRequest(request);

      // Check if this is a personality assessment request
      const personalityResponse =
        await this.handlePersonalityAssessment(request);
      if (personalityResponse) {
        return personalityResponse;
      }

      // Build context-aware system prompt
      const systemPrompt = this.buildSystemPrompt(request);

      // Prepare conversation messages
      const messages = this.prepareMessages(request, systemPrompt);

      // Get AI response with retry logic
      let aiResponse = await this.getAIResponseWithRetry(messages, request);

      // Enforce preferred language if the model code-switched
      aiResponse = await this.enforcePreferredLanguage(aiResponse, request);

      // Process and structure the response
      const kwameResponse = this.processAIResponse(aiResponse, request);

      // Log successful interaction
      console.log(
        `[KWAME-AI] ✅ Successful response for user ${request.userId}`,
      );

      return kwameResponse;
    } catch (error) {
      console.error("[KWAME-AI] Error:", error);
      return this.generateFallbackResponse(request, error);
    }
  }

  /**
   * Handle personality assessment requests and flow
   */
  private async handlePersonalityAssessment(
    request: KwameRequest,
  ): Promise<KwameResponse | null> {
    const message = request.message.toLowerCase();
    const user = request.context?.userProfile;

    // Check if user is requesting personality test
    const isPersonalityRequest =
      message.includes("personality") ||
      message.includes("big 5") ||
      message.includes("big five") ||
      message.includes("personality test") ||
      message.includes("take a test") ||
      message.includes("assessment") ||
      message.includes("analyze me") ||
      message.includes("what am i like") ||
      message.includes("personality traits") ||
      message.includes("who am i");

    // Check if user has already completed assessment
    const hasCompletedAssessment =
      user?.personalityTestCompleted && user?.big5Profile;

    // Check if user is asking for their results
    const isRequestingResults =
      message.includes("results") ||
      message.includes("show me") ||
      message.includes("my personality") ||
      (message.includes("what") &&
        (message.includes("found") || message.includes("discovered")));

    if (isRequestingResults && hasCompletedAssessment) {
      return this.generateBig5ResultsResponse(request);
    }

    if (isPersonalityRequest) {
      return this.generatePersonalityAssessmentResponse(request);
    }

    // Check if we're in the middle of personality assessment context
    const isInPersonalityFlow =
      request.context?.currentScreen === "personality-test" ||
      request.context?.personalityAssessment?.inProgress;

    if (isInPersonalityFlow) {
      return this.handlePersonalityQuestionResponse(request);
    }

    return null; // Not a personality-related request
  }

  /**
   * Generate personality assessment introduction response
   */
  private async generatePersonalityAssessmentResponse(
    request: KwameRequest,
  ): Promise<KwameResponse> {
    const user = request.context?.userProfile;
    const firstName = this.getFirstName(user?.fullName);
    const hasCompleted = user?.personalityTestCompleted && user?.big5Profile;

    const preferredLang = this.getPreferredLanguage(user);
    const nationality = this.getUserNationality(user);
    const persona = this.getCulturalPersona(nationality);

    if (hasCompleted) {
      // User already has results
      const systemPrompt = `You are KWAME AI. The user has already completed their Big 5 personality assessment. 

      Respond warmly in ${preferredLang} using ${persona.greeting} and explain that they've already completed the test. 
      Offer to show them their results or retake the test if they want fresh insights.

      Use your ${persona.communicationStyle.toLowerCase()} and be encouraging about their personality insights.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.message },
      ];

      const aiResponse = await this.getAIResponseWithRetry(
        messages as any,
        request,
      );

      return {
        message: aiResponse,
        confidence: 0.9,
        responseType: "advice",
        actionButtons: [
          { label: "Show My Results", action: "show_big5_results" },
          { label: "Retake Assessment", action: "start_personality_test" },
        ],
      };
    } else {
      // Introduce personality assessment
      const systemPrompt = `You are KWAME AI with ${persona.communicationStyle.toLowerCase()}. 

      The user is interested in personality assessment. Explain the Big 5 personality test warmly in ${preferredLang}.

      Key points to cover:
      - Use ${persona.greeting} greeting warmly
      - Explain this is a scientifically-backed personality assessment
      - It takes about 10-15 minutes with 100 questions
      - It reveals 5 core personality traits: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
      - Results help understand compatibility in relationships
      - Make it sound exciting and insightful, not clinical
      - Use ${firstName ? firstName : "friend"} naturally

      Be encouraging and culturally appropriate using ${persona.conversationalVibe}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.message },
      ];

      const aiResponse = await this.getAIResponseWithRetry(
        messages as any,
        request,
      );

      return {
        message: aiResponse,
        confidence: 0.9,
        responseType: "suggestion",
        actionButtons: [
          { label: "Start Assessment", action: "start_personality_test" },
          { label: "Learn More", action: "personality_info" },
        ],
      };
    }
  }

  /**
   * Generate Big 5 results display response
   */
  private async generateBig5ResultsResponse(
    request: KwameRequest,
  ): Promise<KwameResponse> {
    const user = request.context?.userProfile;

    if (!user?.big5Profile) {
      return {
        message:
          "I don't see any personality assessment results for you yet. Would you like to take the Big 5 personality test?",
        confidence: 0.8,
        responseType: "suggestion",
        actionButtons: [
          { label: "Start Assessment", action: "start_personality_test" },
        ],
      };
    }

    try {
      const big5Profile = JSON.parse(user.big5Profile) as Big5Profile;
      const firstName = this.getFirstName(user?.fullName);
      const preferredLang = this.getPreferredLanguage(user);
      const nationality = this.getUserNationality(user);
      const persona = this.getCulturalPersona(nationality);

      const systemPrompt = `You are KWAME AI with ${persona.communicationStyle.toLowerCase()}.

      Present these Big 5 personality results warmly in ${preferredLang}:

      TRAITS (percentiles):
      - Openness: ${big5Profile.traitPercentiles.Openness.toFixed(1)}%
      - Conscientiousness: ${big5Profile.traitPercentiles.Conscientiousness.toFixed(1)}%
      - Extraversion: ${big5Profile.traitPercentiles.Extraversion.toFixed(1)}%
      - Agreeableness: ${big5Profile.traitPercentiles.Agreeableness.toFixed(1)}%
      - Emotional Stability: ${(100 - big5Profile.traitPercentiles.Neuroticism).toFixed(1)}% (lower neuroticism = higher stability)

      SUMMARY: ${big5Profile.narrative?.summary || "A balanced personality profile"}

      STRENGTHS: ${big5Profile.narrative?.strengths?.join(", ") || "Various personal strengths"}

      Present this with ${persona.greeting} greeting, use ${firstName ? firstName : "friend"} naturally.
      Explain what each trait means for relationships and dating.
      Be encouraging and insightful using ${persona.conversationalVibe}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Show me my personality results" },
      ];

      const aiResponse = await this.getAIResponseWithRetry(
        messages as any,
        request,
      );

      return {
        message: aiResponse,
        confidence: 0.95,
        responseType: "analysis",
        actionButtons: [
          { label: "Relationship Insights", action: "personality_insights" },
          { label: "Retake Test", action: "start_personality_test" },
        ],
      };
    } catch (error) {
      console.error("[KWAME-AI] Big5 results parsing error:", error);
      return {
        message:
          "I had trouble loading your personality results. Would you like to retake the assessment?",
        confidence: 0.6,
        responseType: "suggestion",
        actionButtons: [
          { label: "Retake Assessment", action: "start_personality_test" },
        ],
      };
    }
  }

  /**
   * Handle responses during personality questionnaire
   */
  private async handlePersonalityQuestionResponse(
    request: KwameRequest,
  ): Promise<KwameResponse> {
    const user = request.context?.userProfile;
    const firstName = this.getFirstName(user?.fullName);
    const preferredLang = this.getPreferredLanguage(user);
    const nationality = this.getUserNationality(user);
    const persona = this.getCulturalPersona(nationality);

    // Check if user wants to exit the assessment
    const message = request.message.toLowerCase();
    const wantsToExit =
      message.includes("stop") ||
      message.includes("quit") ||
      message.includes("exit") ||
      message.includes("cancel") ||
      message.includes("later") ||
      message.includes("not now");

    if (wantsToExit) {
      const systemPrompt = `You are KWAME AI with ${persona.communicationStyle.toLowerCase()}.

      The user wants to pause their personality assessment. Respond warmly in ${preferredLang}:
      - Use ${persona.greeting} and be understanding
      - Let them know their progress is saved
      - They can continue anytime
      - Be encouraging about coming back
      - Use ${firstName ? firstName : "friend"} naturally`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.message },
      ];

      const aiResponse = await this.getAIResponseWithRetry(
        messages as any,
        request,
      );

      return {
        message: aiResponse,
        confidence: 0.9,
        responseType: "encouragement",
        actionButtons: [
          { label: "Continue Test", action: "continue_personality_test" },
          { label: "Start Over", action: "start_personality_test" },
        ],
      };
    }

    // During assessment, encourage them and provide progress updates
    const progress = request.context?.personalityAssessment;
    const progressPercent = progress
      ? Math.round(
          ((progress.currentQuestion || 0) / (progress.totalQuestions || 100)) *
            100,
        )
      : 0;

    const systemPrompt = `You are KWAME AI with ${persona.communicationStyle.toLowerCase()}.

    The user is in the middle of their personality assessment (${progressPercent}% complete).

    Respond warmly in ${preferredLang}:
    - Use ${persona.greeting} and be encouraging
    - Acknowledge their progress (${progressPercent}% done)
    - Keep them motivated
    - Remind them it helps with relationship compatibility
    - Use ${firstName ? firstName : "friend"} naturally
    - Keep response brief and supportive`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: request.message },
    ];

    const aiResponse = await this.getAIResponseWithRetry(
      messages as any,
      request,
    );

    return {
      message: aiResponse,
      confidence: 0.8,
      responseType: "encouragement",
      actionButtons: [
        { label: "Continue Assessment", action: "continue_personality_test" },
        { label: "Pause Test", action: "pause_personality_test" },
      ],
    };
  }

  /**
   * If response is not in the preferred language, ask model to rewrite strictly in that language
   */
  private async enforcePreferredLanguage(
    content: string,
    request: KwameRequest,
  ): Promise<string> {
    try {
      const preferredLang = this.getPreferredLanguage(
        request.context?.userProfile,
      );
      if (!preferredLang || preferredLang === "en") return content;

      // If the user is writing in English, allow English responses (user explicitly switched)
      const userWroteEnglish = this.isLikelyEnglish(request.message || "");
      if (userWroteEnglish) {
        console.log(
          `[KWAME-AI] Language enforcement skipped (user wrote English). PrefLang=${preferredLang}`,
        );
        return content;
      }

      console.log(
        `[KWAME-AI] Enforcing preferred language '${preferredLang}' for response length=${content?.length}`,
      );

      const preferredLangName = this.getLanguageName(preferredLang);
      const rewriteSystem = `You strictly rewrite assistant responses into ${preferredLangName} (${preferredLang}) ONLY.\n- Preserve meaning, tone, emojis, formatting.\n- Do NOT add commentary, brackets, or translations.\n- Output plain text in ${preferredLangName} only.`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: rewriteSystem },
          { role: "user", content: content },
        ],
        temperature: 0.2,
        max_tokens: Math.min(
          600,
          Math.max(150, Math.floor(content.length * 1.2)),
        ),
      });

      const rewritten = response.choices[0]?.message?.content?.trim();
      if (!rewritten || rewritten.length === 0) {
        console.log(
          "[KWAME-AI] Language enforcement returned empty content; using original.",
        );
        return content;
      }
      console.log(
        `[KWAME-AI] Language enforcement succeeded. New length=${rewritten.length}`,
      );
      return rewritten;
    } catch (e) {
      console.error(
        "[KWAME-AI] Language enforcement failed, returning original content:",
        e,
      );
      return content;
    }
  }

  /**
   * Get contextual suggestions for specific scenarios
   */
  async getSuggestions(request: KwameRequest): Promise<string[]> {
    try {
      const suggestionPrompt = this.buildSuggestionPrompt(request);

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: suggestionPrompt }],
        temperature: 0.3, // Lower temperature for more consistent suggestions
        max_tokens: 200,
        n: 1,
      });

      const content = response.choices[0]?.message?.content || "";

      // Parse suggestions (expecting JSON array format)
      try {
        const suggestions = JSON.parse(content);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [content];
      } catch {
        // Fallback to splitting by lines if not JSON
        return content
          .split("\n")
          .filter((s) => s.trim())
          .slice(0, 5);
      }
    } catch (error) {
      console.error("[KWAME-AI] Suggestion error:", error);
      return this.getFallbackSuggestions(request);
    }
  }

  /**
   * Analyze user profile and provide improvement suggestions
   */
  async analyzeProfile(
    user: User,
    preferences?: UserPreference,
  ): Promise<KwameResponse> {
    try {
      const analysisPrompt = this.buildProfileAnalysisPrompt(user, preferences);

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: analysisPrompt }],
        temperature: 0.5,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content || "";

      return {
        message: content,
        confidence: 0.9,
        responseType: "analysis",
        suggestions: this.extractProfileTips(content),
        actionButtons: [
          { label: "Improve Bio", action: "edit_bio" },
          { label: "Add Photos", action: "add_photos" },
          { label: "Update Preferences", action: "edit_preferences" },
        ],
      };
    } catch (error) {
      console.error("[KWAME-AI] Profile analysis error:", error);
      return this.generateFallbackResponse(
        { userId: user.id, message: "analyze profile" },
        error,
      );
    }
  }

  /**
   * Build comprehensive system prompt with cultural awareness
   */
  private buildSystemPrompt(request: KwameRequest): string {
    const culturalContext = request.context?.culturalContext;
    const userProfile = request.context?.userProfile;
    const userPreferences = request.context?.userPreferences;
    const networkingProfile = request.context?.networkingProfile;
    const mentorshipProfile = request.context?.mentorshipProfile;

    console.log(
      `[KWAME-AI] 🔍 DEBUG: Building system prompt for user ${request.userId}:`,
      {
        hasCulturalContext: !!culturalContext,
        hasUserProfile: !!userProfile,
        hasUserPreferences: !!userPreferences,
        hasNetworkingProfile: !!networkingProfile,
        hasMentorshipProfile: !!mentorshipProfile,
        userProfileKeys: userProfile ? Object.keys(userProfile) : [],
        networkingProfileKeys: networkingProfile
          ? Object.keys(networkingProfile)
          : [],
        mentorshipProfileKeys: mentorshipProfile
          ? Object.keys(mentorshipProfile)
          : [],
        userName: userProfile?.fullName,
        userAge: userProfile
          ? this.calculateAge(userProfile.dateOfBirth)
          : undefined,
      },
    );

    // Calculate user age for cultural adaptation
    const userAge = userProfile?.dateOfBirth
      ? this.calculateAge(userProfile.dateOfBirth)
      : 25; // Default age if not available

    // Start with culturally-aware base prompt
    let systemPrompt = this.buildCulturalSystemPrompt(userProfile, userAge);

    // Enforce preferred language for responses
    const preferredLang = this.getPreferredLanguage(userProfile);
    const preferredLangName = this.getLanguageName(preferredLang);
    systemPrompt += `\n\n==== LANGUAGE PREFERENCE ====\n• You must respond in ${preferredLangName} (${preferredLang}) for the entire message.\n• Do NOT code-switch or mix English unless the user switches language.\n• Do not include translations unless the user asks.`;

    // Global response style and length guardrails to fit token caps
    systemPrompt += `\n\n==== RESPONSE STYLE & LENGTH ====\n• Keep answers concise and skimmable.\n• When providing tips, steps, or recommendations, limit to 5 numbered bullets (1–5).\n• Put each bullet on its own line with a blank line between bullets.\n• Each bullet should be 1–2 short sentences.\n• If the user asks for more detail, provide another set of up to 5 bullets in a follow-up response.`;

    // Add user profile information if available
    if (userProfile) {
      systemPrompt += `\n\n==== USER PROFILE DATA (YOU MUST USE THIS INFORMATION) ====`;
      if (userProfile.fullName) {
        systemPrompt += `\n• User's Full Name: ${userProfile.fullName}`;
        const firstName = this.getFirstName(userProfile.fullName);
        if (firstName) {
          systemPrompt += `\n• User's First Name: ${firstName}`;
        }
      }
      if (userProfile.dateOfBirth) {
        systemPrompt += `\n• User's Age: ${userAge} years old`;
      }
      if (userProfile.gender) {
        systemPrompt += `\n• Gender: ${userProfile.gender}`;
      }
      if (userProfile.location) {
        systemPrompt += `\n• Current Location: ${userProfile.location}`;
      }
      if (userProfile.countryOfOrigin) {
        systemPrompt += `\n• Country of Origin: ${userProfile.countryOfOrigin}`;
      }
      if (userProfile.profession) {
        systemPrompt += `\n• Profession: ${userProfile.profession}`;
      }
      if (userProfile.relationshipStatus) {
        systemPrompt += `\n• Relationship Status: ${userProfile.relationshipStatus}`;
      }
      if (userProfile.relationshipGoal) {
        systemPrompt += `\n• Relationship Goal: ${userProfile.relationshipGoal}`;
      }
      if (userProfile.bio) {
        systemPrompt += `\n• Bio: ${userProfile.bio}`;
      }
      if (userProfile.interests) {
        systemPrompt += `\n• Interests: ${this.toDisplayString(userProfile.interests)}`;
      }
      if (userProfile.educationLevel) {
        systemPrompt += `\n• Education Level: ${userProfile.educationLevel}`;
      }
      if (userProfile.ethnicity) {
        systemPrompt += `\n• Ethnicity: ${userProfile.ethnicity}`;
      }
      if (userProfile.religion) {
        systemPrompt += `\n• Religion: ${userProfile.religion}`;
      }
      if (userProfile.secondaryCountryOfOrigin) {
        systemPrompt += `\n• Secondary Country of Origin: ${userProfile.secondaryCountryOfOrigin}`;
      }
      if (userProfile.secondaryTribe) {
        systemPrompt += `\n• Secondary Tribe: ${userProfile.secondaryTribe}`;
      }
      if (userProfile.highSchool) {
        systemPrompt += `\n• High School: ${userProfile.highSchool}`;
      }
      if (userProfile.collegeUniversity) {
        systemPrompt += `\n• College/University: ${userProfile.collegeUniversity}`;
      }
      if (userProfile.bodyType) {
        systemPrompt += `\n• Body Type: ${userProfile.bodyType}`;
      }
      if (typeof userProfile.height === "number") {
        systemPrompt += `\n• Height: ${userProfile.height} cm`;
      }
      if (userProfile.smoking) {
        systemPrompt += `\n• Smoking: ${userProfile.smoking}`;
      }
      if (userProfile.drinking) {
        systemPrompt += `\n• Drinking: ${userProfile.drinking}`;
      }
      if (userProfile.hasChildren) {
        systemPrompt += `\n• Has Children: ${userProfile.hasChildren}`;
      }
      if (userProfile.wantsChildren) {
        systemPrompt += `\n• Wants Children: ${userProfile.wantsChildren}`;
      }
      if (userProfile.matchingPriorities) {
        systemPrompt += `\n• Matching Priorities: ${this.toDisplayString(userProfile.matchingPriorities)}`;
      }
      if (typeof userProfile.showProfilePhoto === "boolean") {
        systemPrompt += `\n• Show Profile Photo: ${userProfile.showProfilePhoto ? "Yes" : "No"}`;
      }
      if (typeof userProfile.hideAge === "boolean") {
        systemPrompt += `\n• Hide Age: ${userProfile.hideAge ? "Yes" : "No"}`;
      }
      if (userProfile.preferredLanguage) {
        systemPrompt += `\n• Preferred Language: ${userProfile.preferredLanguage}`;
      }
      if (userProfile.visibilityPreferences) {
        systemPrompt += `\n• Visibility Preferences: ${this.toDisplayString(userProfile.visibilityPreferences)}`;
      }
      if (typeof userProfile.isVerified === "boolean") {
        systemPrompt += `\n• Verified: ${userProfile.isVerified ? "Yes" : "No"}`;
      }

      console.log(
        `[KWAME-AI] 🔍 DEBUG: Added profile info to system prompt. Age: ${userAge}, Name: ${userProfile.fullName}`,
      );
    }

    // Add user preferences if available
    if (userPreferences) {
      systemPrompt += `\n\n==== USER DATING PREFERENCES (CONSIDER THESE) ====`;
      if (userPreferences.minAge && userPreferences.maxAge) {
        systemPrompt += `\n• Preferred Age Range: ${userPreferences.minAge}-${userPreferences.maxAge} years`;
      }
      if (userPreferences.distancePreference) {
        systemPrompt += `\n• Maximum Distance: ${userPreferences.distancePreference}km`;
      }
      if (userPreferences.locationPreference) {
        systemPrompt += `\n• Location Preference: ${userPreferences.locationPreference}`;
      }
      if (userPreferences.poolCountry) {
        systemPrompt += `\n• Pool Country (Legacy): ${userPreferences.poolCountry}`;
      }
      if (userPreferences.meetPoolCountry) {
        systemPrompt += `\n• MEET Pool Country: ${userPreferences.meetPoolCountry}`;
      }
      if (userPreferences.ethnicityPreference) {
        systemPrompt += `\n• Ethnicity Preference: ${this.toDisplayString(userPreferences.ethnicityPreference)}`;
      }
      if (userPreferences.religionPreference) {
        systemPrompt += `\n• Religion Preference: ${this.toDisplayString(userPreferences.religionPreference)}`;
      }
      if (userPreferences.educationLevelPreference) {
        systemPrompt += `\n• Education Level Preference: ${this.toDisplayString(userPreferences.educationLevelPreference)}`;
      }
      if (userPreferences.hasChildrenPreference) {
        systemPrompt += `\n• Has Children Preference: ${userPreferences.hasChildrenPreference}`;
      }
      if (userPreferences.wantsChildrenPreference) {
        systemPrompt += `\n• Wants Children Preference: ${userPreferences.wantsChildrenPreference}`;
      }
      if (
        typeof userPreferences.minHeightPreference === "number" ||
        typeof userPreferences.maxHeightPreference === "number"
      ) {
        const minH =
          userPreferences.minHeightPreference != null
            ? `${userPreferences.minHeightPreference} cm`
            : "any";
        const maxH =
          userPreferences.maxHeightPreference != null
            ? `${userPreferences.maxHeightPreference} cm`
            : "any";
        systemPrompt += `\n• Height Preference: ${minH} - ${maxH}`;
      }
      if (userPreferences.bodyTypePreference) {
        systemPrompt += `\n• Body Type Preference: ${this.toDisplayString(userPreferences.bodyTypePreference)}`;
      }
      if (userPreferences.smokingPreference) {
        systemPrompt += `\n• Smoking Preference: ${userPreferences.smokingPreference}`;
      }
      if (userPreferences.drinkingPreference) {
        systemPrompt += `\n• Drinking Preference: ${userPreferences.drinkingPreference}`;
      }
      if (userPreferences.interestPreferences) {
        systemPrompt += `\n• Interest Preferences: ${this.toDisplayString(userPreferences.interestPreferences)}`;
      }
      if (userPreferences.dealBreakers) {
        systemPrompt += `\n• Deal Breakers: ${this.toDisplayString(userPreferences.dealBreakers)}`;
      }
      if (userPreferences.matchingPriorities) {
        systemPrompt += `\n• Matching Priorities: ${this.toDisplayString(userPreferences.matchingPriorities)}`;
      }
      if (userPreferences.highSchoolPreference) {
        systemPrompt += `\n• High School Preference: ${this.toDisplayString(userPreferences.highSchoolPreference)}`;
      }
    }

    // Add networking profile information if available
    if (networkingProfile) {
      systemPrompt += `\n\n==== USER NETWORKING PROFILE DATA (PROFESSIONAL/CAREER INFORMATION) ====`;
      if (networkingProfile.professionalTagline) {
        systemPrompt += `\n• Professional Tagline: ${networkingProfile.professionalTagline}`;
      }
      if (networkingProfile.currentRole) {
        systemPrompt += `\n• Current Role: ${networkingProfile.currentRole}`;
      }
      if (networkingProfile.currentCompany) {
        systemPrompt += `\n• Current Company: ${networkingProfile.currentCompany}`;
      }
      if (networkingProfile.industry) {
        systemPrompt += `\n• Industry: ${networkingProfile.industry}`;
      }
      if (networkingProfile.experienceYears) {
        systemPrompt += `\n• Years of Experience: ${networkingProfile.experienceYears}`;
      }
      if (networkingProfile.networkingGoals) {
        systemPrompt += `\n• Networking Goals: ${this.toDisplayString(networkingProfile.networkingGoals)}`;
      }
      if (networkingProfile.lookingFor) {
        systemPrompt += `\n• Looking For: ${this.toDisplayString(networkingProfile.lookingFor)}`;
      }
      if (networkingProfile.canOffer) {
        systemPrompt += `\n• Can Offer: ${this.toDisplayString(networkingProfile.canOffer)}`;
      }
      if (networkingProfile.professionalInterests) {
        systemPrompt += `\n• Professional Interests: ${this.toDisplayString(networkingProfile.professionalInterests)}`;
      }
      if (networkingProfile.causesIPassionate) {
        systemPrompt += `\n• Causes I'm Passionate About: ${this.toDisplayString(networkingProfile.causesIPassionate)}`;
      }
      if (networkingProfile.collaborationTypes) {
        systemPrompt += `\n• Collaboration Types: ${this.toDisplayString(networkingProfile.collaborationTypes)}`;
      }
      if (networkingProfile.workingStyle) {
        systemPrompt += `\n• Working Style: ${this.toDisplayString(networkingProfile.workingStyle)}`;
      }
      if (networkingProfile.timeCommitment) {
        systemPrompt += `\n• Time Commitment: ${networkingProfile.timeCommitment}`;
      }
      if (networkingProfile.lightUpWhenTalking) {
        systemPrompt += `\n• I Light Up When Talking About: ${this.toDisplayString(networkingProfile.lightUpWhenTalking)}`;
      }
      if (networkingProfile.wantToMeetSomeone) {
        systemPrompt += `\n• Want to Meet Someone Who: ${this.toDisplayString(networkingProfile.wantToMeetSomeone)}`;
      }
      if (networkingProfile.currentProjects) {
        systemPrompt += `\n• Current Projects: ${this.toDisplayString(networkingProfile.currentProjects)}`;
      }
      if (networkingProfile.dreamCollaboration) {
        systemPrompt += `\n• Dream Collaboration: ${this.toDisplayString(networkingProfile.dreamCollaboration)}`;
      }
      if (networkingProfile.preferredMeetingStyle) {
        systemPrompt += `\n• Preferred Meeting Style: ${this.toDisplayString(networkingProfile.preferredMeetingStyle)}`;
      }
      if (networkingProfile.availability) {
        systemPrompt += `\n• Availability: ${this.toDisplayString(networkingProfile.availability)}`;
      }
      if (networkingProfile.location) {
        systemPrompt += `\n• Professional Location: ${networkingProfile.location}`;
      }
      if (typeof networkingProfile.openToRemote === "boolean") {
        systemPrompt += `\n• Open to Remote: ${networkingProfile.openToRemote ? "Yes" : "No"}`;
      }
      if (networkingProfile.preferredLocations) {
        systemPrompt += `\n• Preferred Locations: ${this.toDisplayString(networkingProfile.preferredLocations)}`;
      }
      if (networkingProfile.highSchool) {
        systemPrompt += `\n• High School (Networking): ${networkingProfile.highSchool}`;
      }
      if (networkingProfile.collegeUniversity) {
        systemPrompt += `\n• College/University (Networking): ${networkingProfile.collegeUniversity}`;
      }
      if (typeof networkingProfile.lookingForOpportunities === "boolean") {
        systemPrompt += `\n• Looking for Opportunities: ${networkingProfile.lookingForOpportunities ? "Yes" : "No"}`;
      }
      if (networkingProfile.visibilityPreferences) {
        systemPrompt += `\n• Professional Visibility Preferences: ${this.toDisplayString(networkingProfile.visibilityPreferences)}`;
      }
    }

    // Add mentorship profile information if available
    if (mentorshipProfile) {
      systemPrompt += `\n\n==== USER MENTORSHIP PROFILE DATA (MENTORING/LEARNING INFORMATION) ====`;
      if (mentorshipProfile.role) {
        systemPrompt += `\n• Mentorship Role: ${mentorshipProfile.role}`;
      }
      if (mentorshipProfile.areasOfExpertise) {
        systemPrompt += `\n• Areas of Expertise: ${this.toDisplayString(mentorshipProfile.areasOfExpertise)}`;
      }
      if (mentorshipProfile.learningGoals) {
        systemPrompt += `\n• Learning Goals: ${this.toDisplayString(mentorshipProfile.learningGoals)}`;
      }
      if (mentorshipProfile.languagesSpoken) {
        systemPrompt += `\n• Languages Spoken: ${this.toDisplayString(mentorshipProfile.languagesSpoken)}`;
      }
      if (mentorshipProfile.industriesOrDomains) {
        systemPrompt += `\n• Industries/Domains: ${this.toDisplayString(mentorshipProfile.industriesOrDomains)}`;
      }
      if (mentorshipProfile.mentorshipStyle) {
        systemPrompt += `\n• Mentorship Style: ${mentorshipProfile.mentorshipStyle}`;
      }
      if (mentorshipProfile.preferredFormat) {
        systemPrompt += `\n• Preferred Format: ${this.toDisplayString(mentorshipProfile.preferredFormat)}`;
      }
      if (mentorshipProfile.communicationStyle) {
        systemPrompt += `\n• Communication Style: ${this.toDisplayString(mentorshipProfile.communicationStyle)}`;
      }
      if (mentorshipProfile.availability) {
        systemPrompt += `\n• Availability: ${this.toDisplayString(mentorshipProfile.availability)}`;
      }
      if (mentorshipProfile.timeCommitment) {
        systemPrompt += `\n• Time Commitment: ${mentorshipProfile.timeCommitment}`;
      }
      if (mentorshipProfile.location) {
        systemPrompt += `\n• Mentorship Location: ${mentorshipProfile.location}`;
      }
      if (mentorshipProfile.successStories) {
        systemPrompt += `\n• Success Stories: ${mentorshipProfile.successStories}`;
      }
      if (mentorshipProfile.whyMentor) {
        systemPrompt += `\n• Why I Want to Mentor: ${mentorshipProfile.whyMentor}`;
      }
      if (mentorshipProfile.whySeekMentorship) {
        systemPrompt += `\n• Why I Seek Mentorship: ${mentorshipProfile.whySeekMentorship}`;
      }
      if (mentorshipProfile.preferredMentorshipStyle) {
        systemPrompt += `\n• Preferred Mentorship Style: ${mentorshipProfile.preferredMentorshipStyle}`;
      }
      if (mentorshipProfile.industryAspiration) {
        systemPrompt += `\n• Industry Aspiration: ${mentorshipProfile.industryAspiration}`;
      }
      if (mentorshipProfile.preferredMenteeLevel) {
        systemPrompt += `\n• Preferred Mentee Level: ${mentorshipProfile.preferredMenteeLevel}`;
      }
      if (mentorshipProfile.preferredMentorExperience) {
        systemPrompt += `\n• Preferred Mentor Experience: ${mentorshipProfile.preferredMentorExperience}`;
      }
      if (mentorshipProfile.preferredIndustries) {
        systemPrompt += `\n• Preferred Industries: ${this.toDisplayString(mentorshipProfile.preferredIndustries)}`;
      }
      if (mentorshipProfile.highSchool) {
        systemPrompt += `\n• High School (Mentorship): ${mentorshipProfile.highSchool}`;
      }
      if (mentorshipProfile.collegeUniversity) {
        systemPrompt += `\n• College/University (Mentorship): ${mentorshipProfile.collegeUniversity}`;
      }
      if (typeof mentorshipProfile.isActive === "boolean") {
        systemPrompt += `\n• Mentorship Active: ${mentorshipProfile.isActive ? "Yes" : "No"}`;
      }
      if (typeof mentorshipProfile.maxMentees === "number") {
        systemPrompt += `\n• Max Mentees: ${mentorshipProfile.maxMentees}`;
      }
      if (typeof mentorshipProfile.currentMentees === "number") {
        systemPrompt += `\n• Current Mentees: ${mentorshipProfile.currentMentees}`;
      }
      if (mentorshipProfile.visibilityPreferences) {
        systemPrompt += `\n• Mentorship Visibility Preferences: ${this.toDisplayString(mentorshipProfile.visibilityPreferences)}`;
      }
    }

    systemPrompt += `\n\n==== RESPONSE FORMATTING REQUIREMENTS ====
• Use proper line breaks for lists: Use \\n• for bullet points and \\n1. for numbered lists
• When providing lists, put each item on its own line with correct punctuation
• Be conversational and warm while maintaining your cultural personality
• Address the user by first name by default; only use full name if explicitly appropriate (e.g., formal summaries)
• Provide specific, actionable advice that considers their cultural background`;

    // Enforce a clearer Markdown structure for photo insight responses
    systemPrompt += `\n\n==== PHOTO INSIGHT OUTPUT STYLE ====\nIntro line summarizing the photo in 1 sentence.\n\n- **Attire:** ...\n- **Connection:** ...\n- **Setting:** ...\n- **Expression:** ...\n\nClose with one short paragraph tying the insights to their profile and end with a friendly question.\n\n• Use real Markdown bullets (hyphen + space)\n• Bold the labels exactly as shown\n• Put each bullet on its own line; keep tone warm and concise`;

    return systemPrompt;
  }

  /**
   * Prepare conversation messages for OpenAI with enhanced context awareness
   */
  private prepareMessages(
    request: KwameRequest,
    systemPrompt: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history with enhanced context awareness
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const recentHistory = request.conversationHistory
        .slice(-this.MAX_CONVERSATION_HISTORY)
        .map((msg) => {
          // Avoid sending raw base64 image payloads or overly long texts to the model
          const isHistoricalImage =
            typeof msg.content === "string" &&
            msg.content.startsWith("_!_IMAGE_!_");

          const sanitizedContent = isHistoricalImage
            ? "[User previously shared an image. Consider this contextually; image payload omitted for brevity.]"
            : typeof msg.content === "string"
              ? msg.content.slice(0, 2000) // hard cap historical message length
              : msg.content;

          return {
            role: msg.role as "user" | "assistant",
            content: sanitizedContent,
          };
        });

      messages.push(...recentHistory);

      // Add conversation context summary for better continuity
      if (request.conversationHistory.length > 5) {
        const contextSummary = this.buildConversationSummary(
          request.conversationHistory,
        );
        if (contextSummary) {
          messages[0].content += `\n\nConversation Context: ${contextSummary}`;
        }
      }
    }

    // Handle current user message - check if it's an image message
    const isImageMessage = request.message.startsWith("_!_IMAGE_!_");
    // Detect explicit analysis requests like "analyze that photo"
    const wantsImageAnalysis =
      /analy(s|z)e|look at|review/.test(request.message.toLowerCase()) &&
      /(photo|image|picture|that)/.test(request.message.toLowerCase());
    // Find most recent image from history if the current message isn't an image
    let lastImageUrl: string | null = null;
    if (
      !isImageMessage &&
      wantsImageAnalysis &&
      request.conversationHistory?.length
    ) {
      for (let i = request.conversationHistory.length - 1; i >= 0; i--) {
        const hist = request.conversationHistory[i];
        const content = (hist?.content as unknown as string) || "";
        if (typeof content === "string" && content.startsWith("_!_IMAGE_!_")) {
          lastImageUrl = content.substring("_!_IMAGE_!_".length);
          break;
        }
      }
    }

    if (isImageMessage) {
      // Extract base64 image data
      const base64Data = request.message.substring("_!_IMAGE_!_".length);

      // Create vision message with image analysis context
      const visionMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam =
        {
          role: "user",
          content: [
            {
              type: "text",
              text: this.addContextToMessage({
                ...request,
                message:
                  "I've shared an image with you. Please analyze it and provide insights, advice, or conversation based on what you see. Consider this in the context of our ongoing conversation about relationships, dating, or life.",
              }),
            },
            {
              type: "image_url",
              image_url: {
                // Accept http/https URLs, data URLs, or raw base64 strings
                url:
                  base64Data.startsWith("http://") ||
                  base64Data.startsWith("https://")
                    ? base64Data
                    : base64Data.startsWith("data:")
                      ? base64Data
                      : `data:image/jpeg;base64,${base64Data}`,
                detail: "high",
              },
            },
          ],
        };

      messages.push(visionMessage);
    } else if (lastImageUrl && wantsImageAnalysis) {
      const visionMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam =
        {
          role: "user",
          content: [
            {
              type: "text",
              text: this.addContextToMessage({
                ...request,
                message:
                  "Please analyze the previously shared photo and provide insights, advice, or conversation based on it.",
              }),
            },
            {
              type: "image_url",
              image_url: {
                url:
                  lastImageUrl.startsWith("http://") ||
                  lastImageUrl.startsWith("https://")
                    ? lastImageUrl
                    : lastImageUrl.startsWith("data:")
                      ? lastImageUrl
                      : `data:image/jpeg;base64,${lastImageUrl}`,
                detail: "high",
              },
            },
          ],
        };
      messages.push(visionMessage);
    } else {
      // Add current user message with context (text only)
      const contextualMessage = this.addContextToMessage(request);
      messages.push({ role: "user", content: contextualMessage });
    }

    return messages;
  }

  /**
   * Add relevant context to user message
   */
  private addContextToMessage(request: KwameRequest): string {
    let contextualMessage = request.message;

    if (request.context) {
      const contextParts = [];

      if (request.context.currentScreen) {
        contextParts.push(`[Currently on: ${request.context.currentScreen}]`);
      }

      if (request.context.recentActivity) {
        contextParts.push(
          `[Recent activity: ${request.context.recentActivity}]`,
        );
      }

      if (request.context.matchProfile) {
        contextParts.push(
          `[Discussing match: ${request.context.matchProfile.name || "someone"}]`,
        );
      }

      if (contextParts.length > 0) {
        contextualMessage = `${contextParts.join(" ")}\n\nUser message: ${request.message}`;
      }
    }

    return contextualMessage;
  }

  /**
   * Get AI response with retry logic and error handling
   */
  private async getAIResponseWithRetry(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    request: KwameRequest,
    retries = 3,
  ): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `[KWAME-AI] Attempt ${attempt}/${retries} for user ${request.userId}`,
        );

        const response = await Promise.race([
          getOpenAIClient().chat.completions.create({
            model: "gpt-4o",
            messages,
            temperature: request.message.length < 50 ? 0.8 : 0.9, // Higher creativity for more natural responses
            max_tokens: request.message.length < 50 ? 150 : 400, // Shorter, punchier responses
            presence_penalty: 0.3, // Encourage diverse, fresh responses
            frequency_penalty: 0.2, // Reduce repetition
            top_p: 0.95, // Allow more creative token choices
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Response timeout")),
              this.RESPONSE_TIMEOUT,
            ),
          ),
        ]);

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new Error("Empty response from OpenAI");
        }

        return content;
      } catch (error) {
        console.error(`[KWAME-AI] Attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }

    throw new Error("All retry attempts failed");
  }

  /**
   * Process AI response and structure it for the frontend
   */
  private processAIResponse(
    aiResponse: string,
    request: KwameRequest,
  ): KwameResponse {
    // Enforce language post-check
    const preferredLang = this.getPreferredLanguage(
      request.context?.userProfile,
    );
    const preferredLangName = this.getLanguageName(preferredLang);
    let content = aiResponse;
    if (preferredLang !== "en" && this.isLikelyEnglish(aiResponse)) {
      // Ask the model to rephrase in the preferred language if it slipped into English
      content = `Please rewrite the entire response strictly in ${preferredLangName} (${preferredLang}) only, without English: \n\n${aiResponse}`;
    }

    // Improve readability for enumerated/bulleted lists
    content = this.formatReadableList(content);

    // Analyze response type
    const responseType = this.determineResponseType(content);

    // Extract suggestions if present
    const suggestions = this.extractSuggestions(aiResponse);

    // Generate action buttons based on context
    const actionButtons = this.generateActionButtons(request, responseType);

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(aiResponse);

    // Add cultural note if relevant
    const culturalNote = this.extractCulturalNote(aiResponse);

    return {
      message: content,
      suggestions,
      actionButtons,
      confidence,
      responseType,
      culturalNote,
    };
  }

  /**
   * Generate fallback response for errors
   */
  private generateFallbackResponse(
    request: KwameRequest,
    error: any,
  ): KwameResponse {
    const fallbackMessages = [
      "I'm experiencing a brief moment of reflection. Could you ask me again?",
      "My connection to ancestral wisdom is momentarily clouded. Please try once more.",
      "I need a moment to gather my thoughts. Could you repeat that?",
      "The digital spirits are being playful today. Let's try that again.",
    ];

    const randomMessage =
      fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

    return {
      message: `🤔 ${randomMessage}`,
      confidence: 0.1,
      responseType: "encouragement",
      suggestions: [
        "Try rephrasing your question",
        "Ask about a specific topic",
        "Check your connection and try again",
      ],
    };
  }

  /**
   * Validation and helper methods
   */
  private validateRequest(request: KwameRequest): void {
    if (!request.userId) {
      throw new Error("User ID is required");
    }

    if (!request.message || request.message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    // Allow longer messages for image uploads (base64 data can be large)
    const isImageMessage = request.message.startsWith("_!_IMAGE_!_");
    // Cap image message payload length more conservatively to avoid hitting model context limits
    const maxLength = isImageMessage ? 2 * 1024 * 1024 : 2000; // 2MB for images, 2000 chars for text

    if (request.message.length > maxLength) {
      throw new Error(
        `Message too long (max ${isImageMessage ? "10MB" : "2000 characters"})`,
      );
    }
  }

  private getAgeAppropriateGuidelines(ageGroup?: string): string {
    switch (ageGroup) {
      case "18-25":
        return "- Focus on learning and self-discovery\n- Emphasize personal growth and education\n- Provide guidance on healthy relationship foundations";
      case "25-35":
        return "- Address career and relationship balance\n- Consider serious relationship intentions\n- Provide advice on long-term compatibility";
      case "35+":
        return "- Acknowledge life experience and wisdom\n- Consider family planning and established careers\n- Provide mature relationship guidance";
      default:
        return "- Provide age-appropriate and respectful guidance\n- Consider individual maturity and life stage";
    }
  }

  private determineResponseType(
    response: string,
  ): KwameResponse["responseType"] {
    const lowerResponse = response.toLowerCase();

    if (
      lowerResponse.includes("safety") ||
      lowerResponse.includes("careful") ||
      lowerResponse.includes("red flag")
    ) {
      return "safety";
    } else if (
      lowerResponse.includes("suggest") ||
      lowerResponse.includes("try") ||
      lowerResponse.includes("consider")
    ) {
      return "suggestion";
    } else if (
      lowerResponse.includes("analysis") ||
      lowerResponse.includes("compatibility") ||
      lowerResponse.includes("score")
    ) {
      return "analysis";
    } else if (
      lowerResponse.includes("great") ||
      lowerResponse.includes("good") ||
      lowerResponse.includes("proud")
    ) {
      return "encouragement";
    } else {
      return "advice";
    }
  }

  private extractSuggestions(response: string): string[] {
    // Look for numbered lists or bullet points
    const lines = response.split("\n");
    const suggestions = lines
      .filter((line) => /^[\d\-\*\•]/.test(line.trim()))
      .map((line) => line.replace(/^[\d\-\*\•\s]+/, "").trim())
      .filter((suggestion) => suggestion.length > 0)
      .slice(0, 3);

    return suggestions;
  }

  /**
   * Format plain-text lists into a more readable layout by inserting
   * line breaks before numbered items and after bolded headings.
   */
  private formatReadableList(text: string): string {
    if (!text || typeof text !== "string") return text;

    let result = text;

    // Insert a newline before numbered items like "2. " when they appear inline
    // Example: "...help: 1. Item one 2. Item two" -> line breaks before 1., 2.
    result = result.replace(/\s(\d{1,2})\.\s/g, (match, p1) => `\n${p1}. `);

    // Add a newline after bold headings that end with a colon
    // Example: "**Title:** description" -> "**Title:**\ndescription"
    result = result.replace(/(\*\*[^\n]*?:\*\*)\s+/g, "$1\n");

    // Collapse excessive blank lines
    result = result.replace(/\n{3,}/g, "\n\n");

    return result.trim();
  }

  private generateActionButtons(
    request: KwameRequest,
    responseType: string,
  ): KwameActionButton[] {
    const buttons: KwameActionButton[] = [];

    if (request.context?.currentScreen === "profile") {
      buttons.push({ label: "Improve Profile", action: "edit_profile" });
    }

    if (request.context?.matchProfile) {
      buttons.push({ label: "Start Conversation", action: "start_chat" });
    }

    if (responseType === "safety") {
      buttons.push({ label: "Learn More", action: "safety_tips" });
    }

    return buttons.slice(0, 3); // Limit to 3 buttons
  }

  private calculateConfidence(response: string): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 0.5; // Base confidence

    if (response.length > 100) confidence += 0.2;
    if (response.includes("suggest") || response.includes("recommend"))
      confidence += 0.2;
    if (response.includes("because") || response.includes("reason"))
      confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private extractCulturalNote(response: string): string | undefined {
    // Look for cultural references or advice
    const culturalKeywords = [
      "ghanaian",
      "akan",
      "traditional",
      "cultural",
      "heritage",
      "family",
    ];
    const lowerResponse = response.toLowerCase();

    if (culturalKeywords.some((keyword) => lowerResponse.includes(keyword))) {
      return "💡 This advice considers Ghanaian cultural values";
    }

    return undefined;
  }

  /**
   * Naive English detector to enforce language policy without extra API calls
   */
  private isLikelyEnglish(text: string): boolean {
    const lower = (text || "").toLowerCase();
    const common = [
      " the ",
      " and ",
      " you ",
      " your ",
      " are ",
      " is ",
      " it's ",
      " i'm ",
      " about ",
      " from ",
      " which ",
      " know ",
      " advice ",
      " relationship ",
      " looking forward ",
      " hearing from you",
      " provide ",
      " more ",
      " relevant ",
    ];
    let hits = 0;
    for (const token of common) {
      if (lower.includes(token)) hits++;
    }
    return hits >= 3; // threshold
  }

  private buildSuggestionPrompt(request: KwameRequest): string {
    const preferredLang = this.getPreferredLanguage(
      request.context?.userProfile,
    );
    return `You're KWAME, giving quick conversation suggestions to a friend. \n\nRespond in ${preferredLang}. 

They're saying: "${request.message}"
They're using the ${request.appMode || "MEET"} app mode.

Give me 3-4 natural, conversational suggestions they could try - like text message suggestions you'd send to help a friend. Keep each under 50 characters.

Format as JSON array, like: ["Ask about their weekend", "Share a funny story", "Compliment their profile pic"]`;
  }

  private buildProfileAnalysisPrompt(
    user: User,
    preferences?: UserPreference,
  ): string {
    const preferredLang = this.getPreferredLanguage(user);
    return `Analyze this CHARLEY user profile and provide improvement suggestions. Respond in ${preferredLang}:

Profile Data:
- Bio: ${user.bio || "Not provided"}
- Profession: ${user.profession || "Not provided"}
- Age: ${user.dateOfBirth ? this.calculateAge(user.dateOfBirth) : "Not provided"}
- Location: ${user.location || "Not provided"}
- Interests: ${user.interests || "Not provided"}
- Education: ${user.educationLevel || "Not provided"}

Provide a friendly analysis with:
1. Profile strengths
2. Areas for improvement
3. Specific suggestions for enhancement
4. Cultural considerations if relevant

Keep tone warm and encouraging like KWAME AI.`;
  }

  private calculateAge(dateOfBirth: Date | null): number {
    if (!dateOfBirth) return 25; // Default age
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }

    return age;
  }

  private extractProfileTips(content: string): string[] {
    // Extract actionable tips from profile analysis
    const lines = content.split("\n");
    return lines
      .filter(
        (line) =>
          line.includes("suggest") ||
          line.includes("try") ||
          line.includes("add") ||
          line.includes("improve"),
      )
      .map((line) => line.trim())
      .slice(0, 3);
  }

  private getFallbackSuggestions(request: KwameRequest): string[] {
    const appMode = request.appMode || "MEET";

    const fallbackSuggestions = {
      MEET: [
        "Ask about their interests",
        "Share something about yourself",
        "Suggest a casual meetup",
        "Comment on their photos",
        "Ask about their goals",
      ],
      SUITE: [
        "Discuss professional goals",
        "Share industry insights",
        "Suggest collaboration",
        "Ask about their expertise",
        "Offer mutual support",
      ],
      HEAT: [
        "Keep it light and fun",
        "Ask about their day",
        "Share a funny story",
        "Suggest a quick chat",
        "Be spontaneous",
      ],
    };

    return fallbackSuggestions[appMode] || fallbackSuggestions.MEET;
  }

  /**
   * Build a conversation context summary for better continuity
   */
  private buildConversationSummary(history: KwameMessage[]): string | null {
    if (!history || history.length < 3) return null;

    try {
      // Analyze conversation patterns and key topics
      const topics = new Set<string>();
      const userMessages = history.filter((msg) => msg.role === "user");
      const assistantMessages = history.filter(
        (msg) => msg.role === "assistant",
      );

      // Extract key themes from user messages
      const recentUserMessages = userMessages.slice(-3);
      const conversationThemes = recentUserMessages.map((msg) => {
        const content = msg.content.toLowerCase();

        // Identify relationship themes
        if (content.includes("date") || content.includes("dating"))
          topics.add("dating");
        if (content.includes("relationship") || content.includes("partner"))
          topics.add("relationships");
        if (content.includes("match") || content.includes("matches"))
          topics.add("matching");
        if (content.includes("profile") || content.includes("bio"))
          topics.add("profile");
        if (content.includes("message") || content.includes("conversation"))
          topics.add("messaging");
        if (content.includes("work") || content.includes("career"))
          topics.add("career");
        if (content.includes("family") || content.includes("culture"))
          topics.add("culture");
        if (content.includes("advice") || content.includes("help"))
          topics.add("advice");

        return content;
      });

      // Build context summary
      const topicsArray = Array.from(topics);
      if (topicsArray.length === 0) return null;

      const lastUserMessage =
        recentUserMessages[recentUserMessages.length - 1]?.content;
      const conversationFocus = topicsArray.join(", ");

      return `User has been discussing: ${conversationFocus}. Recent focus: "${lastUserMessage?.substring(0, 100)}${lastUserMessage && lastUserMessage.length > 100 ? "..." : ""}". Continue this conversation naturally.`;
    } catch (error) {
      console.error("[KWAME-AI] Error building conversation summary:", error);
      return null;
    }
  }

  /**
   * Get user's nationality from their profile
   */
  private getUserNationality(userProfile: any): string | null {
    // Check primary country of origin first
    if (userProfile?.countryOfOrigin) {
      return userProfile.countryOfOrigin;
    }

    // Check secondary country of origin as fallback
    if (userProfile?.secondaryCountryOfOrigin) {
      return userProfile.secondaryCountryOfOrigin;
    }

    return null;
  }

  /**
   * Determine age category for cultural adaptation
   */
  private getAgeCategory(age: number): "young" | "adult" | "mature" {
    if (age >= 18 && age <= 25) return "young";
    if (age >= 26 && age <= 35) return "adult";
    return "mature";
  }

  /**
   * Get appropriate cultural persona based on nationality
   */
  private getCulturalPersona(nationality: string | null): CulturalPersona {
    if (!nationality) {
      return CULTURAL_PERSONAS["International"];
    }

    // Handle common country name variations
    const normalizedNationality = this.normalizeCountryName(nationality);

    return (
      CULTURAL_PERSONAS[normalizedNationality] ||
      CULTURAL_PERSONAS["International"]
    );
  }

  /**
   * Normalize country names to match our persona keys
   */
  private normalizeCountryName(country: string): string {
    const countryMappings: Record<string, string> = {
      US: "United States",
      USA: "United States",
      America: "United States",
      UK: "United Kingdom",
      Britain: "United Kingdom",
      England: "United Kingdom",
      Brasil: "Brazil",
      Bharat: "India",
      GH: "Ghana",
      NG: "Nigeria",
      KE: "Kenya",
    };

    return countryMappings[country] || country;
  }

  /**
   * Check if we need to ask user for their country
   */
  private shouldAskForCountry(userProfile: any): boolean {
    return !this.getUserNationality(userProfile);
  }

  /**
   * Build culturally-aware system prompt
   */
  private buildCulturalSystemPrompt(userProfile: any, userAge: number): string {
    const nationality = this.getUserNationality(userProfile);
    const persona = this.getCulturalPersona(nationality);
    const ageCategory = this.getAgeCategory(userAge);
    const needsCountryInfo = this.shouldAskForCountry(userProfile);
    const preferredLang = this.getPreferredLanguage(userProfile);

    let systemPrompt = `You are KWAME AI, a culturally-aware relationship advisor`;

    if (needsCountryInfo) {
      // When nationality is unknown, use International persona but ask for country
      systemPrompt += ` with a warm, inclusive personality. Since I don't know the user's cultural background yet, I should:

 1. Start with a greeting equivalent to "${persona.greeting}! 😊" in the user's preferred language (${preferredLang})
 2. Be warm and welcoming with ${persona.communicationStyle.toLowerCase()}
 3. AFTER greeting them warmly, politely ask which country they're from so I can better relate to their cultural context (in ${preferredLang})
 4. Explain that knowing their background helps me give more relevant relationship advice (in ${preferredLang})

 IMPORTANT: Always ask for their country in a friendly, non-intrusive way (in ${preferredLang}) like:
 "By the way, I'd love to know which country you're from so I can give you advice that really fits your cultural context. Where are you based?" (translate this into ${preferredLang})`;
    } else {
      // When nationality is known, use specific cultural persona
      systemPrompt += ` from ${persona.country} with a ${persona.communicationStyle.toLowerCase()}.

 CULTURAL IDENTITY:
- Start with a greeting equivalent to "${persona.greeting}! 😊" in the user's preferred language (${preferredLang})
- Communication style: ${persona.communicationStyle}
- Use these expressions naturally: ${persona.commonExpressions.join(", ")}
- Language style: ${persona.languageStyle}

CULTURAL CONTEXT:
- Relationship culture: ${persona.relationshipCulture}
- Dating norms: ${persona.datingNorms}
- Core values to respect: ${persona.culturalValues.join(", ")}

AGE-APPROPRIATE COMMUNICATION (User is ${userAge} years old):
${persona.ageConsiderations[ageCategory]}

${persona.conversationalVibe}`;
    }

    systemPrompt += `

CORE PERSONALITY:
- Be warm, supportive, and culturally sensitive
- Give practical relationship advice that respects cultural context
- Use appropriate cultural references and expressions naturally
- Be empathetic and understanding of cultural relationship challenges
- Maintain consistency with the cultural persona throughout the conversation

IMAGE ANALYSIS CAPABILITIES:
- You CAN view and analyze images when users share them
- When analyzing photos, provide thoughtful insights about relationships, dating, style, or personal presentation
- Offer constructive feedback on dating profile photos, outfit choices, or social situations
- Connect image content to cultural context and relationship advice
- Be specific about what you see while maintaining sensitivity and respect

PEER DYNAMICS:
- Speak as the user's peer for their age (match their maturity and energy)
- Avoid lecturing or preaching; be the wise, smart, admirable friend
- Keep language approachable, natural, and concise like a trusted peer

APPROACHABILITY & RESPECT:
- Make women feel comfortable, respected, and safe at all times
- Be someone men want to talk to: confident, insightful, humble
- Never be flirty or suggestive; keep boundaries clear and professional
- Use inclusive, non-judgmental language

RELATIONSHIP ADVICE PRINCIPLES:
- Respect cultural values while promoting healthy relationships
- Consider family dynamics and community expectations
- Balance traditional wisdom with modern relationship realities
- Be inclusive and non-judgmental
- Focus on communication, respect, and mutual understanding

 LANGUAGE:
 - Use ${preferredLang} for the entire response, including the greeting
 - If a cultural greeting term like "${persona.greeting}" is used, adapt or translate it into ${preferredLang} (you may keep the cultural term and briefly explain if helpful)

 Always respond in character, using the appropriate greeting, expressions, and cultural perspective for this user's background.`;

    return systemPrompt;
  }
}

// Export singleton instance
export const kwameAI = new KwameAIService();
