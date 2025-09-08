import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Convert text to title case (First Letter Of Each Word Uppercase)
function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// Build a unified dataset (Ghana + USA) in one place and cache it in-memory
let unifiedHighSchools: string[] = [];

function loadGhanaHighSchools(): string[] {
  try {
    const dataPath = path.join(
      process.cwd(),
      "client/src/data/highschool.json",
    );
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    const list: string[] = Array.isArray(data.ghanaian_high_schools)
      ? data.ghanaian_high_schools
      : [];
    // Apply title case formatting and append ", Ghana"
    return list
      .map((name) => toTitleCase(name))
      .map((name) => `${name}, Ghana`);
  } catch (error) {
    console.error("Error loading Ghana high school data:", error);
    return [];
  }
}

function loadUSAHighSchools(): string[] {
  const results: string[] = [];
  try {
    const dirPath = path.join(process.cwd(), "data", "schools");
    if (!fs.existsSync(dirPath)) {
      return results;
    }

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));

    for (const fileName of files) {
      try {
        const filePath = path.join(dirPath, fileName);
        const content = fs.readFileSync(filePath, "utf8");
        const entries = JSON.parse(content) as Array<any>;

        for (const entry of entries) {
          const level = (entry?.level ?? "").toString().toLowerCase();
          // Only include high schools
          if (level === "high" || level.includes("high")) {
            const name = (entry?.name ?? "").toString().trim();
            const stateName = (entry?.location?.state?.name ?? "")
              .toString()
              .trim();
            const stateAbbrRaw = (entry?.location?.state?.abbr ?? "")
              .toString()
              .trim();
            const stateAbbr = stateAbbrRaw.replace(/\s+/g, "");

            if (name) {
              const suffix =
                stateAbbr || stateName ? `, ${stateAbbr || stateName}` : "";
              results.push(`${name}${suffix}`);
            }
          }
        }
      } catch (innerErr) {
        // Skip problematic files but continue processing others
        console.error(
          `Error processing US schools file ${fileName}:`,
          innerErr,
        );
      }
    }
  } catch (error) {
    console.error("Error loading USA high school data:", error);
  }

  return results;
}

function buildUnifiedHighSchoolsDataset(): string[] {
  const gh = loadGhanaHighSchools();
  const us = loadUSAHighSchools();

  // Deduplicate case-insensitively while preserving original casing
  const seen = new Set<string>();
  const combined: string[] = [];

  for (const name of [...gh, ...us]) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(name);
    }
  }

  // Debug: log counts for verification during development
  console.log(
    `[HIGH-SCHOOL] GH count: ${gh.length}, US count: ${us.length}, combined: ${combined.length}`,
  );
  return combined;
}

// Load once at module import
try {
  unifiedHighSchools = buildUnifiedHighSchoolsDataset();
  // Optional lightweight log to confirm counts
  // console.log(`[HIGH-SCHOOL] Loaded ${unifiedHighSchools.length} total high schools (GH + US)`);
  const accraSamples = unifiedHighSchools
    .filter((n) => n.toLowerCase().includes("accra"))
    .slice(0, 3);
  const youngstownSamples = unifiedHighSchools
    .filter((n) => n.toLowerCase().includes("youngstown"))
    .slice(0, 3);
  console.log("[HIGH-SCHOOL] Sample Accra entries:", accraSamples);
  console.log("[HIGH-SCHOOL] Sample Youngstown entries:", youngstownSamples);
} catch (e) {
  console.error("Failed to build unified high school dataset:", e);
  unifiedHighSchools = [];
}

// Search high schools endpoint
router.get("/search", (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || typeof query !== "string") {
      return res.json({ schools: [] });
    }

    const searchTerm = query.toLowerCase().trim();

    // Filter schools that match the search term from unified dataset
    const filteredSchools = unifiedHighSchools.filter((school) =>
      school.toLowerCase().includes(searchTerm),
    );

    // Limit results and apply title case formatting
    const limitedResults = filteredSchools.slice(0, parseInt(limit as string));

    res.json({
      schools: limitedResults,
      total: filteredSchools.length,
    });
  } catch (error) {
    console.error("Error searching high schools:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
