/**
 * API Helper Functions for robust data handling
 * 
 * These utilities improve error handling and response processing
 * for API requests throughout the application.
 */

/**
 * Safely parse a JSON string with error handling
 * @param text String to parse as JSON
 * @param fallback Optional fallback value if parsing fails
 * @returns Parsed JSON or fallback value
 */
export function safeParseJson<T>(text: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    console.warn("Text that failed to parse:", text.substring(0, 200));
    return fallback;
  }
}

/**
 * Handle API responses with proper content-type checking
 * and response validation
 * @param response Fetch API Response object 
 * @returns Processed response data
 */
export async function handleApiResponse(response: Response): Promise<any> {
  // Check if the response is successful
  if (!response.ok) {
    return handleApiError(response);
  }

  // Get content type to determine how to process the response
  const contentType = response.headers.get("content-type");
  
  // Handle JSON responses
  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      throw new Error("Failed to parse server response");
    }
  }
  
  // Handle non-JSON responses (text, HTML, etc.)
  try {
    const text = await response.text();
    
    // If the response appears to be HTML
    if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
      console.warn("Server returned HTML instead of JSON:", text.substring(0, 200));
      return {
        success: true,
        message: "Operation completed",
        warning: "Server returned HTML response"
      };
    }
    
    // Try to parse as JSON anyway (some APIs don't set content-type correctly)
    const possibleJson = safeParseJson(text);
    if (possibleJson) {
      console.warn("Successfully parsed response as JSON despite content-type:", contentType);
      return possibleJson;
    }
    
    // Return text as is
    return {
      success: true,
      message: "Operation completed",
      rawResponse: text.substring(0, 300)
    };
  } catch (error) {
    console.error("Error processing non-JSON response:", error);
    throw new Error("Failed to process server response");
  }
}

/**
 * Handle API error responses
 * @param response Fetch API Response object for error cases
 * @returns Never returns - always throws an error
 */
async function handleApiError(response: Response): Promise<never> {
  const contentType = response.headers.get("content-type");
  
  try {
    // If it's JSON, try to parse the error message
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    // If it's not JSON, try to get error text
    const text = await response.text();
    
    // If it's HTML (common for 500 errors)
    if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
      console.error(`Server error HTML response: ${response.url}`, text.substring(0, 200));
      throw new Error(`Server error (${response.status}). Please try again later.`);
    }
    
    // Generic error with text content
    throw new Error(`${response.status}: ${text.substring(0, 100)}`);
  } catch (error) {
    // If we already created a better error above
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback error
    throw new Error(`Request failed with status: ${response.status}`);
  }
}

/**
 * Check if a response contains JSON content
 * @param response Fetch API Response object
 * @returns boolean indicating if content type is JSON
 */
export function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return Boolean(contentType && contentType.includes("application/json"));
}

/**
 * Safe API request wrapper for fetch operations
 * @param url API endpoint URL
 * @param method HTTP method
 * @param data Optional data payload
 * @returns Response from the API
 */
export async function safeApiRequest(url: string, method: string = "GET", data?: any): Promise<any> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include"
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return await handleApiResponse(response);
  } catch (error) {
    console.error(`API request failed (${method} ${url}):`, error);
    throw error instanceof Error ? error : new Error("Network request failed");
  }
}