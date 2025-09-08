export interface KwameResponse {
  message: string;
  suggestions?: string[];
  actionButtons?: KwameActionButton[];
  confidence?: number;
  responseType?:
    | "advice"
    | "suggestion"
    | "analysis"
    | "encouragement"
    | "safety";
  culturalNote?: string;
  imageStored?: boolean;
  rateLimitInfo?: {
    remaining: number;
    resetTime: number;
    isPremium: boolean;
  };
}

export interface KwameActionButton {
  label: string;
  action: string;
  data?: any;
}

export interface KwameRequest {
  message: string;
  context?: {
    currentScreen?: string;
    matchProfile?: any;
    recentActivity?: string;
  };
  appMode?: "MEET" | "SUITE" | "HEAT";
}

export interface KwameConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  context?: any;
  appMode?: string;
  timestamp: string;
}

export interface KwameConversationHistory {
  conversations: KwameConversationMessage[];
  total: number;
}

export interface KwameStatus {
  status: "online" | "offline" | "error";
  available: boolean;
  rateLimitInfo: {
    remaining: number;
    resetTime: number;
    isPremium: boolean;
    limits: {
      free: number;
      premium: number;
    };
  };
  features: {
    chat: boolean;
    suggestions: boolean;
    profileAnalysis: boolean;
    conversationHistory: boolean;
    culturalContext: boolean;
  };
}

export interface ConversationHistory {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    context?: string;
  }>;
  total: number;
  hasMore: boolean;
}

export class KwameAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public rateLimitInfo?: any,
  ) {
    super(message);
    this.name = "KwameAPIError";
  }
}

class KwameAPIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = "/api/kwame";
  }

  /**
   * Send a chat message to KWAME AI
   */
  async chat(request: KwameRequest): Promise<KwameResponse> {
    try {
      const response = await fetch(`${this.baseURL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include session cookies
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new KwameAPIError(
          data.error || "Failed to chat with KWAME",
          response.status,
          data.code,
          data.rateLimitInfo,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof KwameAPIError) {
        throw error;
      }

      console.error("KWAME chat error:", error);
      throw new KwameAPIError(
        "Network error - please check your connection and try again",
      );
    }
  }

  /**
   * Get contextual suggestions for specific scenarios
   */
  async getSuggestions(
    context?: any,
    appMode?: string,
    scenario?: string,
  ): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          context,
          appMode,
          scenario,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new KwameAPIError(
          data.error || "Failed to get suggestions",
          response.status,
          data.code,
        );
      }

      return data.suggestions || [];
    } catch (error) {
      if (error instanceof KwameAPIError) {
        throw error;
      }

      console.error("KWAME suggestions error:", error);
      // Return fallback suggestions
      return [
        "Ask about their interests",
        "Share something about yourself",
        "Be genuine and authentic",
      ];
    }
  }

  /**
   * Analyze user profile and get improvement suggestions
   */
  async analyzeProfile(): Promise<KwameResponse> {
    try {
      const response = await fetch(`${this.baseURL}/analyze-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new KwameAPIError(
          data.error || "Failed to analyze profile",
          response.status,
          data.code,
          data.rateLimitInfo,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof KwameAPIError) {
        throw error;
      }

      console.error("KWAME profile analysis error:", error);
      throw new KwameAPIError(
        "Unable to analyze profile right now - please try again later",
      );
    }
  }

  /**
   * Get conversation history with KWAME AI from database
   */
  async getConversationHistory(limit = 500): Promise<KwameConversationHistory> {
    try {
      const url = `/api/kwame/history?limit=${limit}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new KwameAPIError(
          errorData.error || "Failed to get conversation history",
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof KwameAPIError) {
        throw error;
      }

      console.error("KWAME history error:", error);
      return {
        conversations: [],
        total: 0,
      };
    }
  }

  /**
   * Clear conversation history with KWAME AI
   */
  async clearConversationHistory(): Promise<boolean> {
    try {
      const response = await fetch("/api/kwame/history", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new KwameAPIError(
          errorData.error || "Failed to clear conversation history",
          response.status,
        );
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("KWAME clear history error:", error);
      return false;
    }
  }

  /**
   * Get KWAME AI service status and user limits
   */
  async getStatus(): Promise<KwameStatus> {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new KwameAPIError(
          data.error || "Failed to get KWAME status",
          response.status,
        );
      }

      return data;
    } catch (error) {
      console.error("KWAME status error:", error);
      // Return offline status as fallback
      return {
        status: "offline",
        available: false,
        rateLimitInfo: {
          remaining: 0,
          resetTime: Date.now() + 3600000,
          isPremium: false,
          limits: { free: 20, premium: 100 },
        },
        features: {
          chat: false,
          suggestions: false,
          profileAnalysis: false,
          conversationHistory: false,
          culturalContext: false,
        },
      };
    }
  }

  /**
   * Submit feedback on KWAME responses
   */
  async submitFeedback(
    messageId: string,
    rating: number,
    feedback?: string,
    responseType?: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          messageId,
          rating,
          feedback,
          responseType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to submit feedback:", data.error);
        return false;
      }

      return data.success;
    } catch (error) {
      console.error("KWAME feedback error:", error);
      return false;
    }
  }

  /**
   * Handle rate limiting errors with user-friendly messages
   */
  handleRateLimitError(error: KwameAPIError): string {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      const resetTime = new Date(
        error.rateLimitInfo?.resetTime || Date.now() + 3600000,
      );
      const timeUntilReset = Math.ceil(
        (resetTime.getTime() - Date.now()) / 60000,
      ); // minutes

      if (error.rateLimitInfo?.isPremium) {
        return `You've reached your premium limit. Try again in ${timeUntilReset} minutes.`;
      } else {
        return `You've reached your free limit (20 messages/hour). Upgrade to Premium for 100 messages/hour, or try again in ${timeUntilReset} minutes.`;
      }
    }

    return error.message;
  }

  /**
   * Get current app mode for context
   */
  getCurrentAppMode(): "MEET" | "SUITE" | "HEAT" {
    // This should integrate with your existing app mode detection logic
    const path = window.location.pathname;

    if (path.includes("/suite")) return "SUITE";
    if (path.includes("/heat")) return "HEAT";
    return "MEET";
  }

  /**
   * Get current screen context for better AI responses
   */
  getCurrentContext(): any {
    const path = window.location.pathname;
    let currentScreen = "unknown";

    if (path.includes("/profile")) currentScreen = "profile";
    else if (path.includes("/discover")) currentScreen = "discover";
    else if (path.includes("/matches")) currentScreen = "matches";
    else if (path.includes("/messages")) currentScreen = "messages";
    else if (path.includes("/settings")) currentScreen = "settings";
    else if (path === "/") currentScreen = "home";

    return {
      currentScreen,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      appMode: this.getCurrentAppMode(),
    };
  }

  /**
   * Smart chat method that includes automatic context detection
   */
  async smartChat(
    message: string,
    additionalContext?: any,
  ): Promise<KwameResponse> {
    const context = {
      ...this.getCurrentContext(),
      ...additionalContext,
    };

    const request: KwameRequest = {
      message,
      context,
      appMode: this.getCurrentAppMode(),
    };

    return this.chat(request);
  }

  /**
   * Get smart suggestions based on current context
   */
  async getSmartSuggestions(scenario?: string): Promise<string[]> {
    const context = this.getCurrentContext();
    const appMode = this.getCurrentAppMode();

    return this.getSuggestions(context, appMode, scenario);
  }

  /**
   * Get personality assessment status
   */
  async getPersonalityStatus(): Promise<{
    completed: boolean;
    progress: number;
    totalQuestions: number;
    hasBig5Profile: boolean;
    big5ComputedAt?: string;
    personalityModelVersion?: string;
  }> {
    const response = await fetch(`${this.baseURL}/personality/status`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new KwameAPIError(
        "Failed to get personality status",
        response.status,
      );
    }

    return response.json();
  }

  /**
   * Start or continue personality assessment
   */
  async startPersonalityAssessment(): Promise<{
    currentProgress: number;
    totalQuestions: number;
    nextQuestion?: {
      index: number;
      statement: string;
      options: string[];
    };
    completed: boolean;
  }> {
    const response = await fetch(`${this.baseURL}/personality/start`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new KwameAPIError(
        "Failed to start personality assessment",
        response.status,
      );
    }

    return response.json();
  }

  /**
   * Submit personality assessment answer
   */
  async submitPersonalityAnswer(
    questionIndex: number,
    answer: string,
  ): Promise<{
    success: boolean;
    progress: number;
    totalQuestions: number;
    completed: boolean;
    nextQuestion?: {
      index: number;
      statement: string;
      options: string[];
    };
  }> {
    const response = await fetch(`${this.baseURL}/personality/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ questionIndex, answer }),
    });

    if (!response.ok) {
      throw new KwameAPIError(
        "Failed to submit personality answer",
        response.status,
      );
    }

    return response.json();
  }

  /**
   * Complete personality assessment and compute Big 5 profile
   */
  async completePersonalityAssessment(): Promise<{
    success: boolean;
    message: string;
    big5Profile: any;
  }> {
    const response = await fetch(`${this.baseURL}/personality/complete`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new KwameAPIError(
        data.message || "Failed to complete personality assessment",
        response.status,
      );
    }

    return response.json();
  }

  /**
   * Get Big 5 personality results
   */
  async getPersonalityResults(): Promise<{
    big5Profile: any;
    computedAt?: string;
    modelVersion?: string;
  }> {
    const response = await fetch(`${this.baseURL}/personality/results`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new KwameAPIError(
        data.message || "Failed to get personality results",
        response.status,
      );
    }

    return response.json();
  }

  /**
   * Personalize a personality test statement based on user profile
   */
  async personalizeStatement(
    statement: string,
    index: number,
    languageCode: string = "en",
  ): Promise<{
    personalizedStatement: string;
    originalStatement: string;
  }> {
    // Create cache key based on statement content, user, and language (to avoid cross-user contamination)
    // Added version suffix to invalidate old question-format cache
    const cacheKey = `kwame_personalized_v3_${languageCode}_${index}_${statement.slice(0, 50)}`;

    // Check session storage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log(
          `Using cached personalized statement for index ${index} in language ${languageCode}`,
        );
        return parsed;
      }
    } catch (e) {
      // Ignore cache errors
    }

    const response = await fetch("/api/kwame/personalize-statement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ statement, index, languageCode }),
    });

    if (!response.ok) {
      // If personalization fails, return original statement
      console.warn("Statement personalization failed, using original");
      return { personalizedStatement: statement, originalStatement: statement };
    }

    const result = await response.json();

    // Cache the result for this session
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      // Ignore cache storage errors (storage might be full)
    }

    return result;
  }
}

// Export singleton instance
export const kwameAPI = new KwameAPIClient();

// Export hook for React components
export function useKwameAPI() {
  return kwameAPI;
}
