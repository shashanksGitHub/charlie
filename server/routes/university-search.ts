import { Request, Response } from "express";
import fs from "fs";
import path from "path";

interface University {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  alpha_two_code: string;
  "state-province": string | null;
}

let universitiesCache: University[] | null = null;

function loadUniversities(): University[] {
  if (universitiesCache) {
    return universitiesCache;
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "client/src/data/universities.json",
    );
    const fileContent = fs.readFileSync(filePath, "utf-8");
    universitiesCache = JSON.parse(fileContent);
    return universitiesCache || [];
  } catch (error) {
    console.error("Error loading universities data:", error);
    return [];
  }
}

function formatUniversityName(name: string): string {
  // Convert to title case for better readability
  return (
    name
      .toLowerCase()
      .split(" ")
      .map((word) => {
        // Keep certain words lowercase (articles, prepositions, etc.)
        if (
          ["of", "and", "the", "at", "in", "on", "for", "with", "by"].includes(
            word,
          )
        ) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ")
      // Ensure first word is always capitalized
      .replace(/^./, (firstChar) => firstChar.toUpperCase())
  );
}

export function searchUniversities(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const universities = loadUniversities();
    const searchQuery = query.toLowerCase().trim();

    // Search through university names
    const matchingUniversities = universities
      .filter((university) => {
        const universityName = university.name.toLowerCase();
        const country = university.country.toLowerCase();
        const stateProvince = university["state-province"]?.toLowerCase() || "";

        return (
          universityName.includes(searchQuery) ||
          country.includes(searchQuery) ||
          stateProvince.includes(searchQuery) ||
          // Also search by common abbreviations and keywords
          universityName.includes(
            searchQuery
              .replace(/university|college|institute|school/g, "")
              .trim(),
          )
        );
      })
      .slice(0, 20) // Limit results to 20 for performance
      .map((university) => {
        const name = formatUniversityName(university.name);
        const country = university.country?.trim();
        const state = university["state-province"]?.trim() || null;
        // Append ", State, Country" or ", Country" to the name for display convenience
        const display = state
          ? `${name}, ${state}, ${country}`
          : `${name}, ${country}`;
        return {
          name: display,
          country,
          "state-province": state,
        };
      });

    res.json(matchingUniversities);
  } catch (error) {
    console.error("University search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
