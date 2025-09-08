import { useLocation } from "wouter";
import { useAppMode } from "@/hooks/use-app-mode";
import { useDarkMode } from "@/hooks/use-dark-mode";
import {
  Home,
  MessageCircle,
  Heart,
  User,
  Flame,
  Briefcase,
  Search,
  Bell,
  Users,
  Bookmark,
} from "lucide-react";
import { t } from "@/hooks/use-language";
import { useMatchCount } from "@/hooks/use-match-count";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useSuiteConnectionCount } from "@/hooks/use-suite-connection-count";
import { NotificationBadge } from "@/components/ui/notification-badge";

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { currentMode, startTransition } = useAppMode();
  // Use t function directly from import
  const { darkMode } = useDarkMode();
  const { likeCount } = useMatchCount();
  const { unreadCount, refetch: refetchUnreadCount } = useUnreadMessages();
  const { totalCount: suiteConnectionCount } = useSuiteConnectionCount();

  // Determine which nav items to show based on the current app mode
  const renderNavItems = () => {
    switch (currentMode) {
      case "MEET":
        return (
          <>
            <button
              className={`flex flex-col items-center py-0.5 px-2 ${location === "/" ? "text-purple-600" : "text-gray-400"}`}
              onClick={() => setLocation("/")}
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">
                {t("navigation.discover")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/messages" ? "text-purple-600" : "text-gray-400"}`}
              onClick={() => {
                setLocation("/messages");
                // Refresh unread count when navigating to messages
                refetchUnreadCount();
              }}
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                <NotificationBadge count={unreadCount} variant="attention" />
              </div>
              <span className="text-[9px] mt-0.5">
                {t("navigation.messages")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location.startsWith("/matches") ? "text-purple-600" : "text-gray-400"}`}
              onClick={() => setLocation("/matches")}
            >
              <div className="relative">
                <Heart className="w-5 h-5" />
                {likeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1">
                    {likeCount > 99 ? "99+" : likeCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] mt-0.5">
                {t("navigation.matches")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/profile" ? "text-purple-600" : "text-gray-400"}`}
              onClick={() => setLocation("/profile")}
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">
                {t("navigation.profile")}
              </span>
            </button>
          </>
        );

      case "HEAT":
        return (
          <>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/heat" ? "text-orange-500" : "text-gray-400"}`}
              onClick={() => setLocation("/heat")}
            >
              <Flame className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">{t("navigation.feed")}</span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/heat/explore" ? "text-orange-500" : "text-gray-400"}`}
              onClick={() => setLocation("/heat/explore")}
            >
              <Search className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">
                {t("navigation.explore")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/messages" ? "text-orange-500" : "text-gray-400"}`}
              onClick={() => {
                setLocation("/messages");
                // Refresh unread count when navigating to messages
                refetchUnreadCount();
              }}
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                <NotificationBadge count={unreadCount} variant="attention" />
              </div>
              <span className="text-[9px] mt-0.5">
                {t("navigation.messages")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/profile" ? "text-orange-500" : "text-gray-400"}`}
              onClick={() => setLocation("/profile")}
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">
                {t("navigation.profile")}
              </span>
            </button>
          </>
        );

      case "SUITE":
        return (
          <>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/suite/network" ? "text-blue-600" : "text-gray-400"}`}
              onClick={() => setLocation("/suite/network")}
            >
              <Search className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">
                {t("navigation.discover")}
              </span>
            </button>

            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/suite/connections" ? "text-blue-600" : "text-gray-400"}`}
              onClick={() => setLocation("/suite/connections")}
            >
              <div className="relative">
                <Users className="w-5 h-5" />
                <NotificationBadge count={suiteConnectionCount} />
              </div>
              <span className="text-[9px] mt-0.5">
                {t("navigation.connections")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/messages" ? "text-blue-600" : "text-gray-400"}`}
              onClick={() => {
                setLocation("/messages");
                // Refresh unread count when navigating to messages
                refetchUnreadCount();
              }}
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                <NotificationBadge count={unreadCount} variant="attention" />
              </div>
              <span className="text-[9px] mt-0.5">
                {t("navigation.messages")}
              </span>
            </button>
            <button
              className={`flex flex-col items-center py-1 px-2 ${location === "/profile" ? "text-blue-600" : "text-gray-400"}`}
              onClick={() => setLocation("/profile")}
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] mt-0.5">
                {t("navigation.profile")}
              </span>
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <nav
      id="bottom-navigation"
      className={`fixed bottom-0 left-0 right-0 py-0.5 px-2 shadow-lg z-50 ${darkMode ? "bg-gray-900" : "border-t border-white bg-white"}`}
    >
      <div className="flex justify-around">{renderNavItems()}</div>
    </nav>
  );
}
