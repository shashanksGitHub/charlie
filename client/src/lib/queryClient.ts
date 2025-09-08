import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  safeStorageSet,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSetObject,
  safeStorageGetObject,
} from "@/lib/storage-utils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Check content type to determine how to handle the response
    const contentType = res.headers.get("content-type");

    try {
      // If it's JSON, try to parse it properly
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        throw new Error(errorData.message || `API error: ${res.status}`);
      }

      // If it's not JSON (like HTML from a server error page)
      const text = await res.text();

      // If it's an HTML response (likely 500 server error)
      if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
        console.error(
          `Server returned HTML instead of JSON: ${res.url} status: ${res.status}`,
          text.substring(0, 200),
        );
        throw new Error(
          `Server error (${res.status}). Please try again later.`,
        );
      }

      // Default error message for other text responses
      throw new Error(
        `${res.status}: ${text.substring(0, 100) || res.statusText}`,
      );
    } catch (parseError) {
      if (parseError instanceof Error) {
        throw parseError; // Rethrow if we already created a better error
      }
      throw new Error(`${res.status}: Failed to parse error response`);
    }
  }
}

// API Base URL configuration for both development and production
// In production deployments, we serve both frontend and backend from same origin
const API_BASE =
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  ""; // Empty string for same-origin requests (correct for our setup)

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: unknown | undefined;
  },
): Promise<Response> {
  const method = options?.method || "GET";
  // Track auth failures for session refresh logic
  let attemptCount = 0;
  const maxAttempts = 2;

  async function attemptRequest(): Promise<Response> {
    // Remove excessive pre-emptive session checking that causes API flooding

    // Now proceed with the actual request
    const requestData = options?.data;

    // Log outgoing data for debugging
    if (
      requestData &&
      (url.includes("/messages") ||
        url.includes("/interests") ||
        url.includes("/global-interests"))
    ) {
      console.log(`Sending data to ${url}:`, {
        type: typeof requestData,
        dataPreview: JSON.stringify(requestData).substring(0, 100) + "...",
      });
    }

    // Extra validations for specific endpoints
    if (url.includes("/messages")) {
      // Make sure content isn't undefined or null for messages
      if (
        requestData &&
        typeof requestData === "object" &&
        "content" in requestData &&
        (requestData.content === undefined || requestData.content === null)
      ) {
        console.error(
          "Warning: content field is null or undefined:",
          requestData,
        );
        throw new Error("Message content cannot be empty");
      }
    } else if (
      url.includes("/interests") ||
      url.includes("/global-interests")
    ) {
      // Extra validation for interest requests
      if (
        requestData &&
        typeof requestData === "object" &&
        "interest" in requestData &&
        (!requestData.interest || typeof requestData.interest !== "string")
      ) {
        console.error("Warning: invalid interest data:", requestData);
        throw new Error("Interest data is invalid");
      }
    }

    try {
      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      const res = await fetch(fullUrl, {
        method,
        headers: {
          // Always include content-type for consistency, even on GET requests
          "Content-Type": "application/json",
          Accept: "application/json",
          // Add cache control headers to prevent caching of auth-required endpoints
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: requestData ? JSON.stringify(requestData) : undefined,
        credentials: "include",
      });

      // Log request result for debugging
      console.log(
        `${method} request to ${fullUrl} completed with status: ${res.status}`,
      );

      // If we get a 401 and haven't exhausted our retry attempts
      if (res.status === 401 && attemptCount < maxAttempts) {
        attemptCount++;
        console.log(
          `Auth failed for ${url}, attempt ${attemptCount} - trying to refresh session`,
        );

        try {
          // Try to refresh the session using a more aggressive approach
          const refreshRes = await fetch(`${API_BASE}/api/user`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          });

          // If refresh was successful, retry the original request
          if (refreshRes.ok) {
            console.log(
              "Session refreshed successfully, retrying original request",
            );
            // Small delay to ensure session propagation
            await new Promise((resolve) => setTimeout(resolve, 100));
            return attemptRequest();
          } else {
            console.error("Session refresh failed:", await refreshRes.text());
          }
        } catch (refreshError) {
          console.error("Error refreshing session:", refreshError);
        }
      }

      // Check for common HTTP errors
      if (!res.ok) {
        const statusText = res.statusText;
        try {
          const errorBody = await res.clone().text();
          console.error(
            `API Error: ${method} ${url} returned ${res.status} ${statusText}, body: ${errorBody}`,
          );
        } catch (e) {
          console.error(
            `API Error: ${method} ${url} returned ${res.status} ${statusText}`,
          );
        }
      }

      await throwIfResNotOk(res);
      return res;
    } catch (fetchError) {
      console.error(
        `Network error during ${method} request to ${url}:`,
        fetchError,
      );

      // Check if it's a network connectivity issue
      if (
        fetchError instanceof TypeError &&
        fetchError.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Network connection issue. Please check your internet connection and try again.",
        );
      }

      // Check if it's a timeout or CORS issue
      if (
        fetchError instanceof TypeError &&
        fetchError.message.includes("NetworkError")
      ) {
        throw new Error(
          "Network error occurred. Please try again in a moment.",
        );
      }

      throw new Error(
        `${fetchError instanceof Error ? fetchError.message : "Failed to connect to server"}`,
      );
    }
  }

  return attemptRequest();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let attemptCount = 0;
    const maxAttempts = 2;
    const url = queryKey[0] as string;

    async function attemptFetch(): Promise<Response> {
      // Remove excessive pre-emptive session checking for queries

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      // If we get a 401 and should retry and haven't exhausted our retry attempts
      if (
        res.status === 401 &&
        unauthorizedBehavior === "throw" &&
        attemptCount < maxAttempts
      ) {
        attemptCount++;
        console.log(
          `Auth failed for ${url}, attempt ${attemptCount} - trying to refresh session`,
        );

        try {
          // Attempt more aggressive session refresh
          const refreshRes = await fetch("/api/user", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          });

          // If refresh was successful, retry the original request
          if (refreshRes.ok) {
            console.log(
              "Session refreshed successfully, retrying original request",
            );
            // Small delay to ensure session propagation
            await new Promise((resolve) => setTimeout(resolve, 100));
            return attemptFetch();
          } else {
            console.error(
              "Failed to refresh session:",
              await refreshRes.text(),
            );
          }
        } catch (refreshError) {
          console.error("Error refreshing session:", refreshError);
        }
      }

      // Log additional information for troubleshooting
      if (!res.ok) {
        try {
          const errorBody = await res.clone().text();
          console.error(
            `Query Error: GET ${url} returned ${res.status} ${res.statusText}, body: ${errorBody}`,
          );
        } catch (e) {
          console.error(
            `Query Error: GET ${url} returned ${res.status} ${res.statusText}`,
          );
        }
      }

      return res;
    }

    const res = await attemptFetch();

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Returning null for unauthorized query: ${url}`);
      return null;
    }

    await throwIfResNotOk(res);

    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      } else {
        // If not JSON but successful, log and return a generic success object
        const text = await res.text();
        console.warn(
          `Expected JSON but got non-JSON successful response from ${url}:`,
          text.substring(0, 200),
        );
        return {
          success: true,
          message: "Operation completed successfully",
          warning: "Server returned non-JSON response",
        };
      }
    } catch (e: any) {
      console.error(`Error parsing JSON response from ${url}:`, e);

      // Try to get the raw text as fallback
      try {
        const rawText = await res.clone().text();
        console.error(
          `Raw response that failed to parse: ${rawText.substring(0, 300)}`,
        );

        // If HTML was returned, provide a clearer error
        if (rawText.includes("<!DOCTYPE html>") || rawText.includes("<html>")) {
          throw new Error(
            `Server returned HTML instead of JSON. This usually indicates a server error.`,
          );
        }
      } catch (textError) {
        console.error(`Failed to get raw text:`, textError);
      }

      throw new Error(
        `Failed to parse response from ${url}: ${e?.message || "Unknown error"}`,
      );
    }
  };

// CRITICAL FIX FOR DISAPPEARING MESSAGES
// Custom persister for React Query cache to prevent message loss during navigation
function createPersister() {
  console.log("[PERSISTER] Creating message persistence layer");
  return {
    persistQuery: (key: string, value: unknown) => {
      // Only persist message queries for now
      if (key.includes("/api/messages") && value) {
        try {
          // Create a special key for this query data
          const persistKey = `rq_persist_${key.replace(/[\[\],:"]/g, "_")}`;

          // Store data wrapper with timestamp
          const dataWrapper = {
            data: value,
            timestamp: Date.now(),
          };

          // Store in storage with fallback mechanisms
          // This ensures messages persist even when a user logs out and logs back in
          try {
            safeStorageSetObject(persistKey, dataWrapper);
            console.log(
              `[PERSIST-CACHE] Saved query data to storage for: ${key}`,
            );
          } catch (storageError) {
            console.error(
              `[PERSIST-CACHE] Failed to save to storage:`,
              storageError,
            );
          }
        } catch (e) {
          console.error(`[PERSIST-CACHE] Failed to persist query data:`, e);
        }
      }
      return Promise.resolve();
    },

    restoreQuery: (key: string) => {
      // Only restore message queries
      if (key.includes("/api/messages")) {
        try {
          // Get the persisted data using the special key format
          const persistKey = `rq_persist_${key.replace(/[\[\],:"]/g, "_")}`;

          // Use safe storage get to handle both localStorage and sessionStorage with fallbacks
          const dataWrapper = safeStorageGetObject<{
            data: unknown;
            timestamp: number;
          }>(persistKey);

          if (dataWrapper) {
            console.log(
              `[PERSIST-CACHE] Restored query data from storage for: ${key}`,
            );
            return Promise.resolve(dataWrapper.data);
          }
        } catch (e) {
          console.error(`[PERSIST-CACHE] Failed to restore query data:`, e);
        }
      }
      return Promise.resolve(undefined);
    },

    removeQuery: (key: string) => {
      if (key.includes("/api/messages")) {
        try {
          const persistKey = `rq_persist_${key.replace(/[\[\],:"]/g, "_")}`;
          safeStorageRemove(persistKey);
        } catch (e) {
          console.error(`[PERSIST-CACHE] Failed to remove query data:`, e);
        }
      }
      return Promise.resolve();
    },
  };
}

// Monitor cache changes to persist them
function createPersistenceObserver(client: QueryClient) {
  const persister = createPersister();

  return client.getQueryCache().subscribe((event) => {
    // When a query is added or updated with data
    if (event.type === "added" || event.type === "updated") {
      // In TanStack Query v5, it's queryKey not getQueryKey()
      const queryKey = event.query.queryKey;

      if (
        queryKey &&
        Array.isArray(queryKey) &&
        queryKey.length > 0 &&
        queryKey[0].toString().includes("/api/messages") &&
        event.query.state.data
      ) {
        // Persist this query's data
        const key = JSON.stringify(queryKey);
        persister.persistQuery(key, event.query.state.data);
      }
    }
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Use cached data first
      staleTime: 60 * 1000, // 1 minute - aggressive caching for performance
      gcTime: 5 * 60 * 1000, // 5 minutes - shorter retention for memory efficiency
      retry: (failureCount, error) => {
        // Don't retry on network connectivity issues to prevent overlay spam
        if (
          error instanceof Error &&
          error.message.includes("Failed to fetch")
        ) {
          console.log(
            "[QUERY-CLIENT] Network issue detected, not retrying to prevent overlay spam",
          );
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 300, // Quick retries
      throwOnError: false, // Prevent errors from bubbling up to error boundary/overlay
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on network issues
        if (
          error instanceof Error &&
          error.message.includes("Failed to fetch")
        ) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 300,
      throwOnError: false, // Prevent mutation errors from showing in overlay
    },
  },
});

// Setup persistence on client initialization
// This will restore persisted queries when the client is first created
const persister = createPersister();

// Automatically restore persisted queries when the app loads
setTimeout(() => {
  try {
    // Use our safe storage utils to find persisted queries in storage
    let sessionKeys: string[] = [];
    let localKeys: string[] = [];

    try {
      sessionKeys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith("rq_persist_"),
      );
    } catch (e) {
      console.warn("[PERSIST-CACHE] Error accessing sessionStorage:", e);
    }

    try {
      localKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("rq_persist_"),
      );
    } catch (e) {
      console.warn("[PERSIST-CACHE] Error accessing localStorage:", e);
    }

    // Combine keys from both storage types, removing duplicates
    const keys = Array.from(new Set([...localKeys, ...sessionKeys]));

    console.log(
      `[PERSIST-CACHE] Found ${localKeys.length} keys in localStorage and ${sessionKeys.length} keys in sessionStorage`,
    );

    // Process each persisted query
    keys.forEach((persistKey) => {
      try {
        // Extract the original query key from the storage key
        const originalKeyStr = persistKey
          .replace("rq_persist_", "")
          .replace(/_/g, "");
        let queryKey;

        // Try to parse it back into the original format
        try {
          // For simpler keys that can be directly parsed
          queryKey = JSON.parse(originalKeyStr.replace(/'/g, '"'));
        } catch {
          // For more complex keys, try to extract key components
          const matches = originalKeyStr.match(/apimessages(\d+)/);
          if (matches && matches[1]) {
            queryKey = ["/api/messages", parseInt(matches[1], 10)];
          }
        }

        if (queryKey) {
          // Use safe storage utilities to get data
          const dataWrapper = safeStorageGetObject<{
            data: unknown;
            timestamp: number;
          }>(persistKey);

          if (dataWrapper) {
            // Set the data back into the query cache
            queryClient.setQueryData(queryKey, dataWrapper.data);
            console.log(
              `[PERSIST-CACHE] Restored query from storage for:`,
              queryKey,
            );
          }
        }
      } catch (e) {
        console.error(`[PERSIST-CACHE] Error restoring from ${persistKey}:`, e);
      }
    });

    // Setup the observer to persist future changes
    createPersistenceObserver(queryClient);
    console.log("[PERSIST-CACHE] Cache persistence system initialized");
  } catch (e) {
    console.error(
      "[PERSIST-CACHE] Failed to initialize persistence system:",
      e,
    );
  }
}, 100);
