import { createContext, useContext, useState, ReactNode } from "react";

interface MatchCountContextType {
  matchCount: number;
  likeCount: number;
  totalCount: number;
  setMatchCount: (count: number | ((prev: number) => number)) => void;
  setLikeCount: (count: number | ((prev: number) => number)) => void;
}

const MatchCountContext = createContext<MatchCountContextType | undefined>(undefined);

export function MatchCountProvider({ children }: { children: ReactNode }) {
  const [matchCount, setMatchCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);

  return (
    <MatchCountContext.Provider 
      value={{ 
        matchCount, 
        likeCount, 
        totalCount: matchCount + likeCount,
        setMatchCount, 
        setLikeCount
      }}
    >
      {children}
    </MatchCountContext.Provider>
  );
}

export function useMatchCount() {
  const context = useContext(MatchCountContext);
  if (context === undefined) {
    throw new Error("useMatchCount must be used within a MatchCountProvider");
  }
  return context;
}