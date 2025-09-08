import { useParams } from "wouter";
import { RealTimeChatSimplified } from "@/components/messaging/real-time-chat-simplified";
import { Loader2, Heart } from "lucide-react";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import { useDarkMode } from "@/hooks/use-dark-mode";

export default function RealTimeChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { isDarkMode } = useDarkMode();
  
  // Validate matchId
  if (!matchId || isNaN(parseInt(matchId))) {
    return (
      <div className="h-screen flex items-center justify-center relative overflow-hidden">
        <FloatingIconsBackground 
          count={24}
          opacityRange={[0.05, 0.1]}
          sizeRange={[16, 28]}
          speedRange={[25, 45]}
          color={isDarkMode ? 'rgba(139, 92, 246, 0.5)' : 'rgba(124, 58, 237, 0.5)'}
          className="absolute inset-0 z-0 pointer-events-none"
        />
        <div className="text-center z-10 relative">
          <p className="text-red-500 font-medium">Invalid match ID</p>
        </div>
      </div>
    );
  }
  
  return <RealTimeChatSimplified matchId={parseInt(matchId)} />;
}