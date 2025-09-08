import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { safeStorageGet, safeStorageSet } from "@/lib/storage-utils";

type SharedHighSchoolContextValue = {
  value: string;
  setValue: (next: string) => void;
  initialize: (initial: string) => void;
};

const SharedHighSchoolContext = createContext<SharedHighSchoolContextValue | null>(null);

function getStorageKey(userId?: string | number | null) {
  const uid = userId ?? safeStorageGet("userId") ?? "anon";
  return `shared_high_school_${uid}`;
}

export function SharedHighSchoolProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<string>("");
  const isInitializedRef = useRef(false);

  // Persist to localStorage for cross-route stability during a session
  useEffect(() => {
    try {
      const key = getStorageKey(null);
      safeStorageSet(key, value || "");
    } catch {
      // no-op
    }
  }, [value]);

  const api = useMemo<SharedHighSchoolContextValue>(
    () => ({
      value,
      setValue: (next: string) => {
        setValue(next || "");
      },
      initialize: (initial: string) => {
        if (!isInitializedRef.current) {
          // Load from storage first; fallback to provided initial
          try {
            const key = getStorageKey(null);
            const stored = safeStorageGet(key);
            if (stored && typeof stored === "string") {
              setValue(stored);
            } else if (initial) {
              setValue(initial);
            }
          } catch {
            if (initial) setValue(initial);
          }
          isInitializedRef.current = true;
        }
      },
    }),
    [value],
  );

  return (
    <SharedHighSchoolContext.Provider value={api}>
      {children}
    </SharedHighSchoolContext.Provider>
  );
}

export function useSharedHighSchool(): SharedHighSchoolContextValue {
  const ctx = useContext(SharedHighSchoolContext);
  if (!ctx) {
    throw new Error("useSharedHighSchool must be used within SharedHighSchoolProvider");
  }
  return ctx;
}


