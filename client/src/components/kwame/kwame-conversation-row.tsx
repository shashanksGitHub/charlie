import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCheck, Check, Clock } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { useAppMode } from "@/hooks/use-app-mode";

type KwameConversationRowProps = {
  isDarkMode: boolean;
  onClick: () => void;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};

function formatMessagePreview(message: string): string {
  if (!message) return "";
  if (message.startsWith("_!_IMAGE_!_")) return "📷 Photo";
  if (message.startsWith("_!_VIDEO_!_")) return "🎥 Video";
  if (message.startsWith("Audio message")) return "🎵 Audio message";
  return message;
}

export default function KwameConversationRow({
  isDarkMode,
  onClick,
  lastMessage = "",
  lastMessageTime,
  unreadCount = 0,
}: KwameConversationRowProps) {
  const { currentMode } = useAppMode();

  // Theme palettes per app mode (static class lists for Tailwind)
  const isHEAT = currentMode === "HEAT";
  const isSUITE = currentMode === "SUITE";
  const isMEET = !isHEAT && !isSUITE;

  const containerGradient = isDarkMode
    ? isHEAT
      ? "bg-gradient-to-r from-orange-900/80 via-rose-900/60 to-fuchsia-900/80 hover:from-orange-800/90 hover:via-rose-800/70 hover:to-fuchsia-800/90 shadow-2xl shadow-orange-500/20 border border-orange-500/30"
      : isSUITE
        ? "bg-gradient-to-r from-blue-900/80 via-cyan-900/60 to-emerald-900/80 hover:from-blue-800/90 hover:via-cyan-800/70 hover:to-emerald-800/90 shadow-2xl shadow-blue-500/20 border border-blue-500/30"
        : "bg-gradient-to-r from-purple-900/80 via-pink-900/60 to-purple-900/80 hover:from-purple-800/90 hover:via-pink-800/70 hover:to-purple-800/90 shadow-2xl shadow-purple-500/20 border border-purple-500/30"
    : isHEAT
      ? "bg-gradient-to-r from-orange-50 via-rose-50 to-fuchsia-50 hover:from-orange-100 hover:via-rose-100 hover:to-fuchsia-100 shadow-2xl shadow-orange-500/20 border border-orange-200/50"
      : isSUITE
        ? "bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50 hover:from-blue-100 hover:via-cyan-100 hover:to-emerald-100 shadow-2xl shadow-blue-500/20 border border-blue-200/50"
        : "bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 hover:from-purple-100 hover:via-pink-100 hover:to-purple-100 shadow-2xl shadow-purple-500/20 border border-purple-200/50";

  const textureGradient = isHEAT
    ? "bg-gradient-to-br from-amber-400 via-rose-400 to-fuchsia-400"
    : isSUITE
      ? "bg-gradient-to-br from-blue-400 via-cyan-400 to-emerald-400"
      : "bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-400";

  const avatarRingGradient = isHEAT
    ? "bg-gradient-to-br from-orange-500 to-fuchsia-500"
    : isSUITE
      ? "bg-gradient-to-br from-blue-500 to-emerald-500"
      : "bg-gradient-to-br from-purple-500 to-pink-500";

  const avatarHaloGradient = isHEAT
    ? "bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-500"
    : isSUITE
      ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
      : "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500";

  const nameGradient = isMEET
    ? "from-purple-600 via-pink-600 to-purple-600"
    : isHEAT
      ? "from-orange-600 via-rose-600 to-fuchsia-600"
      : "from-blue-600 via-cyan-600 to-emerald-600";

  const nameGradientDark = isMEET
    ? "from-purple-300 via-pink-300 to-purple-300"
    : isHEAT
      ? "from-amber-300 via-rose-300 to-fuchsia-300"
      : "from-blue-300 via-cyan-300 to-emerald-300";

  const timeTextColor = isDarkMode
    ? isHEAT
      ? "text-amber-300"
      : isSUITE
        ? "text-blue-300"
        : "text-purple-300"
    : isHEAT
      ? "text-amber-700"
      : isSUITE
        ? "text-blue-600"
        : "text-purple-600";

  const messageTextColor = isDarkMode
    ? isHEAT
      ? "text-amber-200"
      : isSUITE
        ? "text-blue-200"
        : "text-purple-200"
    : isHEAT
      ? "text-amber-700"
      : isSUITE
        ? "text-blue-700"
        : "text-purple-700";

  const badgeGradient = isHEAT
    ? "bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-500"
    : isSUITE
      ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
      : "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`p-3 rounded-2xl flex items-center space-x-3 mb-2 cursor-pointer transition-all duration-300 relative overflow-hidden ${containerGradient} transform hover:scale-[1.02] hover:shadow-3xl backdrop-blur-sm`}
    >
      {/* Animated background texture */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`w-full h-full ${textureGradient}`}
          style={{ backgroundSize: "400% 400%" }}
        />
      </div>

      {/* Avatar with glow */}
      <motion.div
        className="relative cursor-pointer z-10"
        whileHover={{ scale: 1.1, rotateY: 10 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-full ${avatarHaloGradient} opacity-75 animate-pulse`}
          ></div>
          <div
            className={`relative h-12 w-12 rounded-full overflow-hidden shadow-2xl border-2 border-white/20 ${avatarRingGradient} p-0.5`}
          >
            <div className="w-full h-full rounded-full overflow-hidden">
              <img
                src="/kwame-ai-avatar.png"
                alt="KWAME AI"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const sibling = e.currentTarget
                    .nextElementSibling as HTMLElement as HTMLElement;
                  if (sibling) sibling.style.display = "flex";
                }}
              />
              <div
                className={`w-full h-full ${avatarRingGradient} flex items-center justify-center text-white`}
                style={{ display: "none" }}
              >
                <Sparkles className="h-6 w-6 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
          <motion.span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-white dark:border-gray-900 shadow-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></span>
          </motion.span>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center space-x-2 min-w-0">
            <h3
              className={`font-medium text-sm truncate bg-gradient-to-r ${nameGradient} bg-clip-text text-transparent font-bold ${
                isDarkMode ? nameGradientDark : ""
              }`}
            >
              KWAME AI
            </h3>
          </div>
          {lastMessageTime && (
            <span className={`${timeTextColor} text-xs`}>
              {formatTimeAgo(new Date(lastMessageTime))}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-0.5">
          <div className="flex items-center space-x-1 flex-grow overflow-hidden">
            <div className="overflow-hidden flex-grow">
              {lastMessage ? (
                <p
                  className={`${messageTextColor} text-[11px] truncate max-w-full leading-tight font-medium`}
                >
                  {formatMessagePreview(lastMessage)}
                </p>
              ) : (
                <p className={`${timeTextColor} text-xs font-light italic`}></p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 ml-2">
            {unreadCount && unreadCount > 0 ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge
                  className={`${badgeGradient} text-white text-[10px] min-w-[22px] h-[22px] flex items-center justify-center rounded-full shadow-lg border border-white/10`}
                >
                  <span className="relative z-10">{unreadCount}</span>
                  <div className="absolute inset-0 rounded-full bg-white/10 opacity-50 animate-pulse"></div>
                </Badge>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
