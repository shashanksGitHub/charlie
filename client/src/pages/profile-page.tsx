import { useAuth } from "@/hooks/use-auth";
import { useAppMode } from "@/hooks/use-app-mode";
import { useLocation } from "wouter";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { AppHeader } from "@/components/ui/app-header";
import { Loader2 } from "lucide-react";

// Import app-specific profile components
import MeetProfile from "@/components/profile/meet-profile-updated";
import HeatProfile from "@/components/profile/heat-profile";
import SuiteProfile from "@/components/profile/suite-profile";

export default function ProfilePage() {
  const { user } = useAuth();
  const { currentMode } = useAppMode();
  const [, setLocation] = useLocation();
  
  if (!user) {
    return (
      <>
        <AppHeader />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNavigation />
      </>
    );
  }
  
  // Render the appropriate profile component based on app mode
  const renderProfileContent = () => {
    switch(currentMode) {
      case 'MEET':
        return <MeetProfile user={user} />;
      case 'HEAT':
        return <HeatProfile user={user} />;
      case 'SUITE':
        return <SuiteProfile user={user} />;
      default:
        // Fallback to MEET profile if no mode is selected
        return <MeetProfile user={user} />;
    }
  };
  
  return (
    <>
      <AppHeader />
      <div className="h-[calc(100vh-132px)] overflow-auto pt-0">
        {renderProfileContent()}
      </div>
      <BottomNavigation />
    </>
  );
}
