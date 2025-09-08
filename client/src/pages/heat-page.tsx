import { useAppMode } from "@/hooks/use-app-mode";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Flame } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/hooks/use-language";
import { motion } from "framer-motion";

export default function HeatPage() {
  const { currentMode, setAppMode } = useAppMode();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // We no longer need to set app mode here
  // The app-selection page handles setting the initial app mode
  // and the protected route prevents direct access to this page

  // Track this page as last app page and update origin for navigation chain
  useEffect(() => {
    // Track this as the last app page visited
    localStorage.setItem("last_app_page", "/heat");

    // Always update origin page when visiting app pages (this is the new source for navigation chains)
    localStorage.setItem("origin_app_page", "/heat");
    console.log("[HEAT-PAGE] Set origin page to /heat");

    console.log(
      "[HEAT-PAGE] Setting app mode to HEAT, current mode:",
      currentMode,
    );
    setAppMode("HEAT");
  }, [setAppMode, currentMode]);

  useEffect(() => {
    if (user?.id) {
      try {
        // Store the user ID for app mode selection features
        sessionStorage.setItem("userId", user.id.toString());

        // Try to use localStorage but fall back to sessionStorage if quota is exceeded
        try {
          localStorage.setItem("userId", user.id.toString());
          localStorage.setItem(`last_used_app_${user.id}`, "heat");
        } catch (error) {
          console.warn(
            "[STORAGE] localStorage quota exceeded, using sessionStorage fallback",
          );
          sessionStorage.setItem(`last_used_app_${user.id}`, "heat");
        }

        // Ensure app mode is selected (prevents redirect loops)
        sessionStorage.setItem("appModeSelected", "true");
      } catch (error) {
        console.error("[STORAGE] Error setting storage values:", error);
        // App continues to work even if storage fails
      }
    }
  }, [user]);

  // Live countdown to September 19 (rolls over to next year when passed)
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      let year = now.getFullYear();
      let target = new Date(`${year}-09-19T00:00:00`);
      if (now > target) {
        target = new Date(`${year + 1}-09-19T00:00:00`);
      }
      const diff = Math.max(0, target.getTime() - now.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <AppHeader />

      <div
        className="relative min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6 overflow-hidden"
        onMouseMove={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) / rect.width;
          const dy = (e.clientY - cy) / rect.height;
          // Subtle parallax rotation
          (el.style as any).setProperty(
            "--tiltX",
            `${(-dy * 8).toFixed(2)}deg`,
          );
          (el.style as any).setProperty(
            "--tiltY",
            `${(dx * 10).toFixed(2)}deg`,
          );
          // Move highlight across the sphere (in % coordinates)
          const lx = 50 + dx * 18; // center around 50%
          const ly = 40 - dy * 18; // slightly above center
          (el.style as any).setProperty("--lx", `${lx.toFixed(1)}%`);
          (el.style as any).setProperty("--ly", `${ly.toFixed(1)}%`);
          // Angle for directional shading (terminator)
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          (el.style as any).setProperty("--theta", `${angleDeg.toFixed(1)}deg`);
        }}
        style={
          {
            perspective: "1200px",
            // Defaults for SSR
            // @ts-ignore - CSS var at runtime
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // handled above
            //
            // Provide initial vars
            //
            // @ts-ignore
            "--tiltX": "0deg",
            // @ts-ignore
            "--tiltY": "0deg",
            // @ts-ignore
            "--lx": "38%",
            // @ts-ignore
            "--ly": "34%",
            // @ts-ignore
            "--theta": "135deg",
          } as any
        }
      >
        {/* Ambient glow field */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* Aurora ribbons for light mode */}
          <div className="absolute inset-0 aurora opacity-70 dark:opacity-40" />
          {/* Subtle film grain for texture */}
          <div className="absolute inset-0 grain opacity-[0.06]" />
          <div
            className="absolute -inset-32 opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(60rem 30rem at 10% -10%, rgba(249,115,22,.12), transparent 60%)," +
                "radial-gradient(52rem 28rem at 90% 110%, rgba(250,204,21,.12), transparent 60%)," +
                "radial-gradient(45rem 22rem at 50% 50%, rgba(217,70,239,.08), transparent 60%)",
            }}
          />
          {/* 3D grid plane */}
          <motion.div
            className="absolute left-1/2 top-[65%] w-[160vw] h-[80vh] -translate-x-1/2 origin-center grid-plane opacity-40"
            style={{ transform: "translateZ(-300px) rotateX(60deg)" }}
            animate={{
              backgroundPosition: ["0px 0px, 0px 0px", "0px 120px, 120px 0px"],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
          {/* Floating orbs removed */}
        </div>

        {/* Emblem */}
        <motion.div
          className="relative mb-7"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="absolute inset-0 rounded-full blur-3xl opacity-50 bg-gradient-to-tr from-fuchsia-400 via-orange-400 to-amber-300 dark:from-fuchsia-500 dark:via-orange-500 dark:to-amber-400 animate-pulse" />
          <motion.div
            className="relative flex items-center justify-center w-36 h-36 rounded-full shadow-[0_25px_80px_rgba(249,115,22,.35)] ring-4 ring-white/10"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(var(--tiltX)) rotateY(var(--tiltY))",
            }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Spherical layers */}
            <div className="absolute inset-0 rounded-full sphere-surface" />
            <div className="absolute inset-0 rounded-full sphere-depth" />
            <div className="absolute inset-0 rounded-full sphere-shade" />
            <motion.div
              className="absolute inset-0 rounded-full sphere-sweep"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 rounded-full sphere-spec" />
            <div className="absolute inset-0 rounded-full sphere-reflect" />
            <div className="absolute inset-0 rounded-full sphere-gloss" />
            <div className="absolute inset-0 rounded-full sphere-rim" />
            <div className="absolute inset-0 rounded-full sphere-fresnel" />
            {/* Central icon with subtle wobble */}
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Flame
                className="h-12 w-12 text-white drop-shadow-[0_4px_12px_rgba(255,255,255,.35)]"
                fill="rgba(255,255,255,0.35)"
              />
            </motion.div>
          </motion.div>
          {/* Elliptical occlusion shadow below the sphere */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 mt-3 w-40 h-8 rounded-full sphere-shadow" />
        </motion.div>

        {/* Title */}
        <motion.div
          className="relative mb-3 heat-3d"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          style={{
            transformStyle: "preserve-3d",
            transform: "rotateX(var(--tiltX)) rotateY(var(--tiltY))",
          }}
        >
          {/* Fire aura behind text */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-x-24 -top-8 h-28 rounded-[999px] fire-aura"
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.02, 0.98] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Back extrude */}
          <span
            aria-hidden
            className="absolute inset-0 font-extrabold select-none pointer-events-none bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-300 bg-clip-text text-transparent opacity-35"
            style={{
              transform: "translateZ(-40px) scale(0.985)",
              filter: "blur(1.5px)",
            }}
          >
            HEAT
          </span>
          {/* Front face */}
          <h2 className="relative text-5xl sm:text-6xl font-extrabold text-center tracking-tight fire-text front">
            HEAT
          </h2>
          {/* Embers */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 4 + (i % 3),
                  height: 4 + (i % 3),
                  left: `${8 + ((i * 6) % 84)}%`,
                  top: `${40 + ((i * 7) % 40)}%`,
                  background:
                    i % 2 === 0
                      ? "radial-gradient(circle, rgba(251,146,60,1) 0%, rgba(251,146,60,0) 70%)"
                      : "radial-gradient(circle, rgba(244,63,94,1) 0%, rgba(244,63,94,0) 70%)",
                  filter: "blur(0.5px)",
                  opacity: 0.7,
                }}
                initial={{ y: 6, opacity: 0.6 }}
                animate={{ y: -10 - (i % 8), opacity: [0.4, 0.9, 0.4] }}
                transition={{
                  duration: 2 + (i % 4),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Countdown */}
        <motion.div
          className="relative mb-6"
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mx-auto w-full max-w-xl chrono px-4 py-4">
            <div className="pointer-events-none absolute -inset-[1px] rounded-[18px] borderGlow" />
            <p className="text-center text-xs tracking-[0.2em] text-white/80 mb-3">
              Countdown to September 19
            </p>
            <div className="relative grid grid-cols-4 gap-3 text-center">
              {[
                { label: "DAYS", value: countdown.days },
                { label: "HRS", value: countdown.hours },
                { label: "MIN", value: countdown.minutes },
                { label: "SEC", value: countdown.seconds },
              ].map((b) => (
                <div key={b.label} className="chrono-tile">
                  <div className="tile-ring" />
                  <div className="chrono-scanlines" />
                  <motion.div
                    key={`${b.label}-${b.value}`}
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="text-3xl font-extrabold text-white drop-shadow-sm leading-none tracking-wider"
                  >
                    {String(b.value).padStart(2, "0")}
                  </motion.div>
                  <div className="text-[10px] tracking-widest text-white/70 mt-1">
                    {b.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Spinning cuboid widget */}
        <div
          className="relative w-full max-w-2xl mx-auto"
          style={{ perspective: 1200 }}
        >
          <motion.div
            className="heat-cube mx-auto"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: 360, rotateX: [5, -5, 5] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Front face with content */}
            <div className="heat-face heat-front rounded-[20px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-2xl p-6 sm:p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,.12)] relative overflow-hidden">
              {/* animated gradient border glow */}
              <div className="pointer-events-none absolute -inset-[1px] rounded-[22px] borderGlow" />
              <p className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-fuchsia-600 via-orange-600 to-amber-600 dark:from-white dark:via-amber-200 dark:to-amber-200 bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,.12)]">
                The next‑gen social spark is charging up
              </p>
              <p className="mt-3 text-sm sm:text-base text-gray-700 dark:text-white/80">
                Expect something bold, electric, and completely new. Stay
                close—your feed is about to glow.
              </p>
              <p className="mt-5 text-xs text-gray-600 dark:text-white/60">
                Use the app switcher above to explore other apps while we finish
                the drop.
              </p>
              {/* sheen sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-[20px] sheen"
                initial={{ x: "-150%" }}
                animate={{ x: ["-150%", "150%"] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* scanlines */}
              <div className="absolute inset-0 pointer-events-none rounded-[20px] scanlines opacity-10" />
            </div>

            {/* Right face */}
            <div className="heat-face heat-right rounded-[20px] bg-gradient-to-b from-amber-400/35 to-fuchsia-400/35 dark:from-amber-500/25 dark:to-fuchsia-500/25 border border-black/10 dark:border-white/10">
              <div className="absolute inset-0 flex items-center justify-center select-none">
                <span
                  aria-hidden
                  className="face-word from-amber-400 via-orange-500 to-fuchsia-500"
                >
                  SPARK
                </span>
              </div>
            </div>
            {/* Left face */}
            <div className="heat-face heat-left rounded-[20px] bg-gradient-to-b from-fuchsia-400/35 to-amber-400/35 dark:from-fuchsia-500/25 dark:to-amber-500/25 border border-black/10 dark:border-white/10">
              <div className="absolute inset-0 flex items-center justify-center select-none">
                <span
                  aria-hidden
                  className="face-word from-fuchsia-400 via-pink-500 to-amber-400"
                >
                  CONNECT
                </span>
              </div>
            </div>
            {/* Back face */}
            <div className="heat-face heat-back rounded-[20px] bg-black/10 dark:bg-black/20 border border-black/10 dark:border-white/10">
              <div className="absolute inset-0 flex items-center justify-center select-none">
                <span
                  aria-hidden
                  className="face-word from-orange-400 via-rose-500 to-fuchsia-500"
                >
                  ENGAGE
                </span>
              </div>
            </div>
            {/* Top face */}
            <div className="heat-face heat-top rounded-[20px] bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10" />
            {/* Bottom face */}
            <div className="heat-face heat-bottom rounded-[20px] bg-black/10 dark:bg-black/30 border border-black/10 dark:border-white/10" />
          </motion.div>
        </div>
      </div>

      <BottomNavigation />
      {/* Page-local animations */}
      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:1; transform:scale(1.05)} }
        .animate-pulse-slow { animation: glowPulse 2.4s ease-in-out infinite; }
        @keyframes iconWave { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(6deg)} }
        .animate-icon-wave { animation: iconWave 2.2s ease-in-out infinite; }
        .grid-plane { background-image:
          linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
          background-size: 60px 60px, 60px 60px;
          background-position: 0 0, 0 0; }
        /* Aurora ribbons (light mode emphasis) */
        .aurora { background:
          radial-gradient(60rem 30rem at 20% 10%, rgba(255,182,72,.20), transparent 60%),
          radial-gradient(40rem 22rem at 80% 20%, rgba(168,85,247,.18), transparent 60%),
          radial-gradient(50rem 28rem at 50% 80%, rgba(99,102,241,.16), transparent 60%);
          filter: blur(20px);
        }
        /* Film grain for texture */
        .grain { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/feGaussianBlur%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E"); mix-blend-mode: multiply; opacity:.05; }
        .ring-conic { background:
          conic-gradient(from 0deg,
            rgba(251,191,36,.0) 0deg,
            rgba(251,191,36,.6) 60deg,
            rgba(249,115,22,.9) 120deg,
            rgba(217,70,239,.7) 180deg,
            rgba(251,191,36,.6) 240deg,
            rgba(249,115,22,.9) 300deg,
            rgba(251,191,36,.0) 360deg);
          filter: blur(1px); box-shadow: 0 0 35px rgba(249,115,22,.35) inset; }
        .heat-3d .front { text-shadow:
          0 2px 0 rgba(0,0,0,.15),
          0 6px 14px rgba(249,115,22,.25),
          0 10px 24px rgba(217,70,239,.25);
        }
        /* Fire title styles */
        .fire-text { background: linear-gradient(90deg, #f59e0b 0%, #fb923c 35%, #f43f5e 65%, #e879f9 100%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 12px rgba(251,146,60,.45), 0 8px 24px rgba(244,63,94,.25); filter: saturate(1.15); }
        .fire-aura { background: radial-gradient(160% 1120% at 20% 100%, rgba(251,146,60,.28), rgba(244,63,94,.18) 60%, rgba(168,85,247,.12) 100%); filter: blur(18px); }
        /* Sphere styling */
        .sphere-surface { background:
          radial-gradient(circle at var(--lx,38%) var(--ly,34%), rgba(255,255,255,.30), rgba(255,255,255,0) 26%),
          conic-gradient(from 10deg, #f59e0b, #fb923c 25%, #f43f5e 52%, #e879f9 78%, #f59e0b);
          filter: saturate(1.15);
        }
        .sphere-depth { background:
          radial-gradient(120% 100% at 50% 65%, rgba(0,0,0,.45), rgba(0,0,0,0) 55%);
          mix-blend-mode: multiply;
        }
        /* Terminator shade aligned to light angle */
        .sphere-shade { mask:
          conic-gradient(from calc(var(--theta,135deg) - 90deg), black 0deg, black 180deg, transparent 180deg, transparent 360deg);
          background: radial-gradient(90% 85% at 50% 50%, rgba(0,0,0,.65), rgba(0,0,0,0) 55%);
          opacity: .45;
          mix-blend-mode: multiply;
          filter: blur(1px);
        }
        .sphere-sweep { background: conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,.18) 26deg, transparent 60deg); mix-blend-mode: screen; }
        .sphere-spec { background: radial-gradient(36% 28% at var(--lx,38%) calc(var(--ly,34%) - 6%), rgba(255,255,255,.65), rgba(255,255,255,0) 60%); mix-blend-mode: screen; }
        .sphere-reflect { background:
          radial-gradient(70% 40% at 55% 85%, rgba(255,255,255,.12), rgba(255,255,255,0) 70%),
          radial-gradient(60% 30% at 30% 80%, rgba(255,255,255,.08), rgba(255,255,255,0) 70%);
          mix-blend-mode: screen;
        }
        .sphere-gloss { background: radial-gradient(55% 40% at var(--lx,38%) var(--ly,34%), rgba(255,255,255,.22), rgba(255,255,255,0) 70%); mix-blend-mode: screen; }
        .sphere-rim { box-shadow: inset 0 0 24px rgba(255,255,255,.10), inset 0 0 60px rgba(253,186,116,.18), 0 10px 30px rgba(249,115,22,.35); }
        .sphere-fresnel { box-shadow: inset 0 0 0 2px rgba(255,255,255,.06), inset 0 0 28px rgba(255,255,255,.10); mix-blend-mode: screen; }
        .sphere-shadow { background: radial-gradient(60% 50% at 50% 50%, rgba(0,0,0,.35), rgba(0,0,0,0) 70%); filter: blur(6px); opacity:.55; }
        /* Cuboid faces (200x140 default) */
        .heat-cube { position: relative; width: 100%; max-width: 640px; height: 220px; margin-top: 8px; }
        .heat-face { position: absolute; inset: 0; transform-style: preserve-3d; }
        .heat-front { transform: translateZ(140px); }
        .heat-back { transform: rotateY(180deg) translateZ(140px); }
        .heat-right { width: 280px; left: calc(50% - 140px); transform: rotateY(90deg) translateZ(320px); height: 220px; }
        .heat-left { width: 280px; left: calc(50% - 140px); transform: rotateY(-90deg) translateZ(320px); height: 220px; }
        .heat-top { transform: rotateX(90deg) translateZ(110px); }
        .heat-bottom { transform: rotateX(-90deg) translateZ(110px); }
        /* Futuristic overlays */
        .sheen { background: linear-gradient(100deg, transparent 10%, rgba(255,255,255,.18) 45%, rgba(255,255,255,.04) 60%, transparent 90%); mix-blend-mode: screen; }
        .scanlines { background-image: repeating-linear-gradient(to bottom, rgba(0,0,0,.08) 0px, rgba(0,0,0,.08) 1px, transparent 1px, transparent 3px); }
        /* Animated border glow for card */
        @keyframes pulseBorder { 0%,100% { opacity:.35; filter:hue-rotate(0deg) } 50% { opacity:.9; filter:hue-rotate(30deg) } }
        .borderGlow { background: linear-gradient(120deg, rgba(236,72,153,.35), rgba(251,146,60,.45), rgba(168,85,247,.45)); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; padding:1px; border-radius:22px; animation:pulseBorder 5s ease-in-out infinite; }
        /* Futuristic chronometer styling */
        .chrono { position: relative; border-radius: 18px; background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.06), rgba(255,255,255,.02) 60%), linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.15)); border: 1px solid rgba(255,255,255,.08); box-shadow: 0 12px 50px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.04); backdrop-filter: blur(10px); }
        .chrono-tile { position: relative; border-radius: 14px; padding: 14px 8px; background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.08); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 6px 20px rgba(0,0,0,.25); overflow: hidden; }
        .tile-ring { position:absolute; inset:-1px; border-radius:14px; background: conic-gradient(from 0deg, rgba(255,255,255,.12), rgba(255,255,255,0) 30%, rgba(255,255,255,.12) 60%, rgba(255,255,255,0) 90%); filter: blur(8px); opacity:.4; pointer-events:none; animation: spin 8s linear infinite; }
        .chrono-scanlines { position:absolute; inset:0; background-image: repeating-linear-gradient(to bottom, rgba(255,255,255,.06) 0px, rgba(255,255,255,.06) 1px, transparent 1px, transparent 3px); opacity:.25; pointer-events:none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Face words */
        .face-word { font-weight: 900; font-size: clamp(18px, 3.2vw, 28px); letter-spacing: .12em; background: linear-gradient(90deg, var(--c1,#f59e0b), var(--c2,#fb923c), var(--c3,#e879f9)); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 2px 10px rgba(0,0,0,.35), 0 0 20px rgba(255,255,255,.12); }
      `}</style>
    </>
  );
}
