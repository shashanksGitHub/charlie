import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { big5ScoringService } from "./services/big5-scoring-service";

function loadStatements(): string[] {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.resolve(
      __dirname,
      "..",
      "client",
      "public",
      "personality_statements.txt",
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    // Use first 100 non-empty lines
    return lines.slice(0, 100);
  } catch (e) {
    console.error("[GODMODEL] Failed to load statements:", e);
    return [];
  }
}

export function registerGodmodelAPI(app: Express) {
  const statements = loadStatements();

  // Retrieve statements
  app.get("/api/godmodel/statements", (_req: Request, res: Response) => {
    res.json({ count: statements.length, statements });
  });

  // Get progress for current user
  app.get("/api/godmodel/progress", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userId = (req as any).user?.id as number;
    try {
      const result: any = await db.execute(
        sql`SELECT personality_records FROM users WHERE id = ${userId} LIMIT 1;`,
      );
      const value = result?.rows?.[0]?.personality_records || null;
      res.json({ records: value ? JSON.parse(value) : null });
    } catch (e) {
      console.error("[GODMODEL] Failed to get progress:", e);
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  // Save progress draft (index and partial responses)
  app.post("/api/godmodel/progress", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userId = (req as any).user?.id as number;
    const { progress } = req.body || {};
    try {
      await db.execute(
        sql`UPDATE users SET personality_records = ${JSON.stringify(progress)} WHERE id = ${userId};`,
      );
      res.json({ success: true });
    } catch (e) {
      console.error("[GODMODEL] Failed to save progress:", e);
      res.status(500).json({ error: "Failed to save progress" });
    }
  });

  // Complete test (final JSON)
  app.post("/api/godmodel/complete", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userId = (req as any).user?.id as number;
    const { final } = req.body || {};

    console.log(`[GODMODEL] Completing test for user ${userId}:`, final);

    try {
      const finalData = JSON.stringify(final);
      console.log(
        `[GODMODEL] Saving personality records to database for user ${userId}`,
      );

      // Save the godmodel data first
      await db.execute(sql`
        UPDATE users 
        SET personality_records = ${finalData}, 
            personality_test_completed = TRUE 
        WHERE id = ${userId};
      `);

      console.log(
        `[GODMODEL] ✅ Successfully saved personality records and marked test as completed for user ${userId}`,
      );

      // Now compute and save Big 5 results
      try {
        console.log(`[GODMODEL-BIG5] Computing Big 5 scores for user ${userId}...`);
        
        // Convert godmodel responses to Big 5 format
        const responses = final.responses || [];
        const big5Responses = responses.map((response: any) => {
          // Map answer text to response level (Big 5 expects PascalCase format)
          const answerMap: { [key: string]: string } = {
            "Strongly Disagree": "StronglyDisagree",
            "Disagree": "Disagree", 
            "Neutral": "Neutral",
            "Agree": "Agree",
            "Strongly Agree": "StronglyAgree"
          };
          
          return answerMap[response.answer] || "Neutral"; // default to neutral if unknown
        });

        // Validate we have 100 responses
        if (big5Responses.length !== 100) {
          console.warn(`[GODMODEL-BIG5] Expected 100 responses, got ${big5Responses.length}. Padding with neutral responses.`);
          // Pad with neutral responses if needed
          while (big5Responses.length < 100) {
            big5Responses.push("Neutral");
          }
        }

        // Debug: Log a sample of the mapped responses
        console.log(`[GODMODEL-BIG5] Sample mapped responses:`, big5Responses.slice(0, 5));
        console.log(`[GODMODEL-BIG5] Total responses for Big 5:`, big5Responses.length);

        // Generate Big 5 profile
        const big5Profile = big5ScoringService.generateBig5Profile(big5Responses);
        
        // Save Big 5 results to database
        await db.execute(sql`
          UPDATE users 
          SET big5_profile = ${JSON.stringify(big5Profile)},
              big5_computed_at = ${new Date()},
              personality_model_version = 'v1.0'
          WHERE id = ${userId};
        `);

        console.log(`[GODMODEL-BIG5] ✅ Successfully computed and saved Big 5 profile for user ${userId}`);
      } catch (big5Error) {
        console.error(`[GODMODEL-BIG5] Failed to compute Big 5 scores for user ${userId}:`, big5Error);
        // Don't fail the entire request if Big 5 computation fails
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[GODMODEL] Failed to complete test:", e);
      res.status(500).json({ error: "Failed to complete test" });
    }
  });
}
