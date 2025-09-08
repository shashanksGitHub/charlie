import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { useAppMode } from "@/hooks/use-app-mode";
import { MeetMessagesNew } from "@/components/messaging/meet-messages-new";
import { HeatMessages } from "@/components/messaging/heat-messages-new";
import { SuiteMessages } from "@/components/messaging/suite-messages-new";
import { motion } from "framer-motion";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useEffect } from "react";

export default function MessagesPage() {
  const { user } = useAuth();
  const { currentMode } = useAppMode();
  const { refetch: refetchUnreadCount } = useUnreadMessages();

  // Refetch unread count when the messages page is loaded
  useEffect(() => {
    if (user) {
      // Reset the unread count when the messages page is viewed
      refetchUnreadCount();
      
      // Dispatch a custom event to notify other components - mode-specific
      const eventName = `messages-viewed-${currentMode}`;
      window.dispatchEvent(new Event(eventName));
      console.log(`Dispatched ${eventName} event`);
      
      // Also trigger localStorage event for cross-tab notifications - mode-specific
      const storageKey = `messages_viewed_at_${currentMode}`;
      localStorage.setItem(storageKey, Date.now().toString());
      console.log(`Updated localStorage key ${storageKey}`);
    }
  }, [user, refetchUnreadCount, currentMode]);
  
  // Render the appropriate messaging component based on the current app mode
  const renderMessagesComponent = () => {
    switch(currentMode) {
      case 'MEET':
        return <MeetMessagesNew />;
      case 'HEAT':
        return <HeatMessages />;
      case 'SUITE':
        return <SuiteMessages />;
      default:
        return <MeetMessagesNew />; // Default to MEET if no mode is set
    }
  };
  
  return (
    <>
      <AppHeader />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderMessagesComponent()}
      </motion.div>
      
      <BottomNavigation />
    </>
  );
}
