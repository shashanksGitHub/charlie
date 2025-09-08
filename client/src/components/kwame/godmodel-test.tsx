import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { godmodelAPI, GodmodelProgress } from "@/services/godmodel-api-client";
import { kwameAPI } from "@/services/kwame-api-client";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLanguage } from "@/hooks/use-language";

type Mode = "prompt" | "testing" | "done";

export function GodmodelTest({
  onClose,
  onMinimize,
  onComplete,
}: {
  onClose?: (hasProgress?: boolean) => void;
  onMinimize?: (hasProgress?: boolean) => void;
  onComplete?: () => void;
}) {
  const { isDarkMode } = useDarkMode();
  const { translate, currentLanguage } = useLanguage();

  // Answer options mapping: English (for database) -> Translation key
  const answerOptions = [
    {
      value: "Strongly Disagree",
      labelKey: "personalityTest.answers.stronglyDisagree",
    },
    { value: "Disagree", labelKey: "personalityTest.answers.disagree" },
    { value: "Neutral", labelKey: "personalityTest.answers.neutral" },
    { value: "Agree", labelKey: "personalityTest.answers.agree" },
    {
      value: "Strongly Agree",
      labelKey: "personalityTest.answers.stronglyAgree",
    },
  ];
  const [mode, setMode] = useState<Mode>("prompt");
  const [statements, setStatements] = useState<string[]>([]);
  const [personalizedStatements, setPersonalizedStatements] = useState<{
    [key: number]: string;
  }>({});
  const [progress, setProgress] = useState<GodmodelProgress | null>(null);
  const [index, setIndex] = useState<number>(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [personalizingStatement, setPersonalizingStatement] = useState(false);

  useEffect(() => {
    (async () => {
      const { statements } = await godmodelAPI.getStatements();
      setStatements(statements);
      const saved = await godmodelAPI.getProgress();
      if (saved && saved.responses) {
        setProgress(saved);
        const nextIndex = Math.min(
          saved.currentIndex ?? saved.responses.length,
          statements.length - 1,
        );
        setIndex(nextIndex);
        const existing = saved.responses.find((r) => r.index === nextIndex);
        setAnswer(existing?.answer ?? null);
        // Don't automatically start testing mode - stay in prompt mode to show the 3 buttons
        // User must explicitly click "Yes, take it now" to continue
      }
    })().catch(console.error);
  }, []);

  // Helper function to clean statements by removing surrounding quotes
  const cleanStatement = (statement: string): string => {
    return statement.replace(/^["']|["']$/g, "").trim();
  };

  const current = useMemo(() => {
    // Only show statement if personalization is complete or failed
    if (personalizedStatements[index]) {
      return personalizedStatements[index]; // Use personalized version
    }

    // If we're currently personalizing this statement, don't show original yet
    if (personalizingStatement && !personalizedStatements[index]) {
      return ""; // Empty while personalizing
    }

    // Use original statement as fallback (when personalization is not happening or failed)
    return statements[index] ? cleanStatement(statements[index]) : "";
  }, [statements, personalizedStatements, index, personalizingStatement]);
  // Completion color shifts from red (0%) to green (100%)
  const completionPercent = useMemo(() => {
    const total = statements.length || 1;
    return Math.max(0, Math.min(1, (index + 1) / total));
  }, [index, statements.length]);
  const completionHue = Math.round(120 * completionPercent); // 0=red → 120=green
  const completionColor = `hsl(${completionHue}, 85%, 52%)`;
  const progressFillStyle: React.CSSProperties = {
    width: `${completionPercent * 100}%`,
    backgroundColor: completionColor,
  };
  const progressDotStyle: React.CSSProperties = {
    left: `calc(${completionPercent * 100}% - 6px)`,
    backgroundColor: completionColor,
  };

  // Function to personalize a statement
  const personalizeCurrentStatement = async (statementIndex: number) => {
    if (personalizedStatements[statementIndex] || !statements[statementIndex]) {
      return; // Already personalized or no statement available
    }

    try {
      setPersonalizingStatement(true);

      // Add a timeout to prevent infinite loading
      const personalizationPromise = kwameAPI.personalizeStatement(
        cleanStatement(statements[statementIndex]),
        statementIndex,
        currentLanguage?.code || "en",
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Personalization timeout")), 10000),
      );

      const result = (await Promise.race([
        personalizationPromise,
        timeoutPromise,
      ])) as any;

      setPersonalizedStatements((prev) => ({
        ...prev,
        [statementIndex]: result.personalizedStatement,
      }));
    } catch (error) {
      console.error("Failed to personalize statement:", error);
      // On failure, set the original statement so it shows up
      setPersonalizedStatements((prev) => ({
        ...prev,
        [statementIndex]: cleanStatement(statements[statementIndex]),
      }));
    } finally {
      setPersonalizingStatement(false);
    }
  };

  // Effect to personalize statement when index changes
  useEffect(() => {
    if (mode === "testing" && statements.length > 0) {
      personalizeCurrentStatement(index);
    }
  }, [index, mode, statements.length]);

  const startNow = () => {
    setMode("testing");
    if (!progress) {
      const empty: GodmodelProgress = {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentIndex: 0,
        responses: [],
      };
      setProgress(empty);
      setIndex(0);
      setAnswer(null);
    } else {
      const existing = progress.responses.find(
        (r) => r.index === (progress.currentIndex ?? 0),
      );
      setAnswer(existing?.answer ?? null);
    }
  };

  const handleSelect = async (value: string) => {
    // Toggle selection: clicking the same option again will deselect
    const newValue = answer === value ? null : value;
    setAnswer(newValue);
    // Persist selection/deselection immediately
    const base: GodmodelProgress = progress || {
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentIndex: 0,
      responses: [],
    };
    const updatedResponses = [...(base.responses || [])];
    const existingIdx = updatedResponses.findIndex((r) => r.index === index);
    if (newValue === null) {
      if (existingIdx >= 0) updatedResponses.splice(existingIdx, 1);
    } else {
      const payload = { index, statement: statements[index], answer: newValue };
      if (existingIdx >= 0) updatedResponses[existingIdx] = payload;
      else updatedResponses.push(payload);
    }
    const updated: GodmodelProgress = {
      ...base,
      responses: updatedResponses,
      currentIndex: index,
      updatedAt: new Date().toISOString(),
    };
    setProgress(updated);
    try {
      await godmodelAPI.saveProgress(updated);
    } catch (e) {
      console.error("[GODMODEL] Failed to save selection:", e);
    }
  };

  const handleContinue = async () => {
    if (!answer) return;
    setLoading(true);
    try {
      const base: GodmodelProgress = progress || {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentIndex: 0,
        responses: [],
      };
      // Upsert the current response
      const updatedResponses = [...(base.responses || [])];
      const existingIdx = updatedResponses.findIndex((r) => r.index === index);
      const payload = { index, statement: statements[index], answer };
      if (existingIdx >= 0) updatedResponses[existingIdx] = payload;
      else updatedResponses.push(payload);
      const next: GodmodelProgress = {
        ...base,
        responses: updatedResponses,
        currentIndex: index + 1,
        updatedAt: new Date().toISOString(),
      };
      setProgress(next);
      await godmodelAPI.saveProgress(next);
      const nextIndex = index + 1;
      if (nextIndex >= statements.length) {
        console.log(
          "[GODMODEL] Test completed! Saving final results to database...",
          next,
        );
        await godmodelAPI.complete(next);
        console.log("[GODMODEL] Final results saved successfully!");
        setMode("done");
        try {
          onComplete?.();
        } catch {}
      } else {
        setIndex(nextIndex);
        // Preload selection for next index if it exists
        const nextSaved = next.responses.find((r) => r.index === nextIndex);
        setAnswer(nextSaved?.answer ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    if (index === 0) return;
    const prevIndex = index - 1;
    setIndex(prevIndex);
    // Load previous saved selection
    const existing = (progress?.responses || []).find(
      (r) => r.index === prevIndex,
    );
    setAnswer(existing?.answer ?? null);
    if (progress) {
      const updated: GodmodelProgress = {
        ...progress,
        currentIndex: prevIndex,
        updatedAt: new Date().toISOString(),
      };
      setProgress(updated);
      await godmodelAPI.saveProgress(updated);
    }
  };

  if (mode === "prompt") {
    // Inline prompt (sits under chat text). No full-screen takeover until user taps Yes.
    return (
      <motion.div
        layoutId="godmodelPrompt"
        className={`relative p-6 rounded-3xl border overflow-hidden shadow-xl backdrop-blur-xl ${
          isDarkMode
            ? "bg-gradient-to-br from-[#0b0b24]/70 via-[#111133]/70 to-[#1a0b2e]/70 border-white/10"
            : "bg-gradient-to-br from-white via-purple-50/70 to-pink-50/70 border-purple-200/40"
        }`}
      >
        <div className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-pink-500/10 blur-2xl"></div>
        <p
          className={`relative text-2xl font-extrabold tracking-tight mb-5 ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          {progress?.responses?.length
            ? translate("personalityTest.continueTest")
            : translate("personalityTest.readyForTest")}
        </p>

        <div className="relative flex flex-col gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startNow();
            }}
            className={`w-full rounded-full px-6 py-3 text-base font-semibold transition-all duration-300 shadow-lg bg-[length:200%_200%] hover:scale-[1.02] active:scale-[0.99] ${
              isDarkMode
                ? "text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 hover:shadow-[0_12px_40px_-10px_rgba(168,85,247,0.65)]"
                : "text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 hover:shadow-[0_12px_40px_-10px_rgba(168,85,247,0.5)]"
            }`}
          >
            {progress?.responses?.length
              ? translate("personalityTest.yesContinueNow")
              : translate("personalityTest.yesTakeItNow")}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMinimize?.(Boolean(progress?.responses?.length));
            }}
            className={`w-full rounded-full px-6 py-3 text-base font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
              isDarkMode
                ? "bg-white/10 text-white border border-white/20 hover:bg-white/15"
                : "bg-white text-gray-900 border border-purple-200 hover:bg-purple-50"
            }`}
          >
            {translate("personalityTest.noTakeLater")}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMinimize?.(Boolean(progress?.responses?.length));
            }}
            className={`w-full rounded-full px-6 py-3 text-base font-medium transition-all duration-300 hover:scale-[1.01] ${
              isDarkMode
                ? "text-fuchsia-300 hover:text-fuchsia-200"
                : "text-fuchsia-700 hover:text-fuchsia-800"
            }`}
          >
            {translate("personalityTest.otherQuestions")}
          </button>
        </div>
      </motion.div>
    );
  }

  if (mode === "done") {
    return (
      <div className="absolute inset-0 z-40">
        <div
          className={`absolute inset-0 ${isDarkMode ? "bg-[#0a0b18]" : "bg-white"} overflow-hidden`}
        ></div>
        <div className="relative h-full w-full flex items-stretch">
          <div
            className={`m-4 flex-1 rounded-3xl border shadow-2xl backdrop-blur-xl p-8 overflow-hidden relative ${isDarkMode ? "bg-gradient-to-br from-emerald-400/10 via-violet-400/10 to-fuchsia-400/10 border-white/10" : "bg-gradient-to-br from-emerald-100 via-violet-100 to-fuchsia-100 border-purple-200/40"}`}
          >
            <div className="pointer-events-none absolute -inset-1 rounded-[28px] bg-[radial-gradient(800px_300px_at_10%_0%,rgba(34,197,94,0.18),transparent_50%),radial-gradient(900px_300px_at_90%_10%,rgba(168,85,247,0.18),transparent_50%),radial-gradient(600px_300px_at_50%_100%,rgba(236,72,153,0.18),transparent_55%)]" />
            <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-4">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-5 max-w-3xl mx-auto"
              >
                <h2
                  className={`text-2xl md:text-4xl font-extrabold leading-snug tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  Congratulations! You’ve completed your personality test.
                </h2>
                <p
                  className={`${isDarkMode ? "text-gray-300" : "text-gray-700"} text-sm md:text-base leading-relaxed`}
                >
                  Your answers have been securely saved. You can explore your
                  detailed results any time.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    type="button"
                    className="h-9 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white px-4 text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose?.(true);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // testing mode
  return (
    <div className="absolute inset-0 z-40">
      {/* Animated background */}
      <div
        className={`absolute inset-0 ${isDarkMode ? "bg-[#0a0b18]" : "bg-white"} overflow-hidden`}
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[680px] bg-gradient-to-tr from-fuchsia-500/20 via-violet-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-16 right-1/3 w-[520px] h-[520px] bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-[spin_22s_linear_infinite]"></div>
      </div>
      <div className="relative h-full w-full flex items-stretch">
        <div
          className={`m-4 flex-1 rounded-3xl border shadow-2xl backdrop-blur-xl p-6 overflow-auto relative ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-purple-200/40"}`}
        >
          {/* Decorative ambient gradient lights */}
          <div className="pointer-events-none absolute -inset-1 rounded-[28px] bg-[radial-gradient(1200px_400px_at_0%_0%,rgba(168,85,247,0.12),transparent_50%),radial-gradient(800px_300px_at_100%_30%,rgba(236,72,153,0.10),transparent_50%),radial-gradient(600px_300px_at_50%_100%,rgba(14,165,233,0.10),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/20" />
          <button
            type="button"
            aria-label="Close test"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose?.(Boolean(progress?.responses?.length));
            }}
            className={`absolute top-5 right-6 h-9 w-9 rounded-full flex items-center justify-center transition shadow ${isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-gray-800 border border-gray-200 hover:bg-purple-50"}`}
          >
            ✕
          </button>
          <div className="mt-8 md:mt-12">
            <div className="flex items-center justify-between mb-5">
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm`}
              >
                Question {index + 1} of {statements.length}
              </p>
              <div className="relative h-2 flex-1 ml-3 rounded-full overflow-hidden shadow-inner">
                {/* Full gradient track revealed progressively */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #84cc16 100%)",
                  }}
                />
                {/* Right-side mask that shrinks as progress increases */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-gray-200/90 transition-all duration-500"
                  style={{ width: `${(1 - completionPercent) * 100}%` }}
                />
                {/* Progress dot */}
                <span
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full shadow transition-colors"
                  style={progressDotStyle}
                />
              </div>
            </div>
            <div
              className={`text-xl md:text-2xl font-extrabold mb-6 leading-snug ${isDarkMode ? "bg-gradient-to-r from-white to-violet-200 text-transparent bg-clip-text" : "bg-gradient-to-r from-slate-900 to-slate-700 text-transparent bg-clip-text"}`}
            >
              {personalizingStatement && !current ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                    <span className="text-lg">
                      {translate("personalityTest.loading.nextQuestion")}
                    </span>
                  </div>
                  <div
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"} text-center max-w-md`}
                  >
                    {translate("personalityTest.loading.pleaseWait")}
                  </div>
                </div>
              ) : (
                current
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {answerOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  disabled={personalizingStatement && !current}
                  className={`group relative px-6 py-4 rounded-2xl border transition-transform duration-200 shadow focus:outline-none focus:ring-2 focus:ring-violet-400/50 ${
                    personalizingStatement && !current
                      ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                      : answer === option.value
                        ? "bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-[0_12px_40px_-10px_rgba(168,85,247,0.6)] scale-[1.01]"
                        : `${isDarkMode ? "bg-white/90 text-gray-900" : "bg-white text-gray-900"} hover:scale-[1.01] hover:shadow-lg`
                  }`}
                >
                  {translate(option.labelKey)}
                  {answer === option.value && (
                    <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/30" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-full hover:shadow"
                onClick={handleBack}
                disabled={index === 0 || loading}
              >
                {translate("personalityTest.navigation.back")}
              </Button>
              <Button
                className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:brightness-110 text-white shadow-md"
                onClick={handleContinue}
                disabled={!answer || loading}
              >
                {index + 1 >= statements.length
                  ? translate("personalityTest.navigation.finish")
                  : translate("personalityTest.navigation.continue")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
