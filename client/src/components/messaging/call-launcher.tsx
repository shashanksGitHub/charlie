import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { VideoCall } from "@/components/ui/video-call";

interface CallLauncherProps {
  matchId: number;
  userId: number;
  receiverId: number;
  isDarkMode: boolean;
}

export function CallLauncher({
  matchId,
  userId,
  receiverId,
  isDarkMode,
}: CallLauncherProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <VideoCall
        matchId={matchId}
        userId={userId}
        receiverId={receiverId}
        open={open}
        onClose={() => setOpen(false)}
        isIncoming={false}
      />
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full h-9 w-9 sm:h-11 sm:w-11 transition-all duration-200 ${
          isDarkMode
            ? "text-gray-300 hover:text-white hover:bg-gradient-to-br from-blue-500/20 to-blue-600/30 hover:shadow-lg hover:shadow-blue-500/20"
            : "text-gray-600 hover:text-gray-900 hover:bg-gradient-to-br from-blue-500/10 to-blue-600/20 hover:shadow-lg hover:shadow-blue-500/20"
        } hover:scale-105 group`}
        onClick={() => {
          console.log("🎥 [CallLauncher] Video call button clicked!");
          setOpen(true);
        }}
      >
        <Video className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
      </Button>
    </>
  );
}
