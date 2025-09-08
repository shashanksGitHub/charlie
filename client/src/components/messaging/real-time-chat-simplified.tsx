import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  Smile,
  Send,
  Loader2,
  Heart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPicture } from "@/components/ui/user-picture";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";

// Helper function to format message time
const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

interface Message {
  id: number;
  matchId: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

interface User {
  id: number;
  fullName: string;
  photoUrl?: string;
  showProfilePhoto?: boolean;
}

interface Match {
  id: number;
  userId1: number;
  userId2: number;
  matched: boolean;
  createdAt: string;
  user: User;
}

interface MessageGroup {
  sender: number;
  messages: Message[];
}

export function RealTimeChatSimplified({ matchId }: { matchId: number }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { isDarkMode } = useDarkMode();
  const { socket, socketReady } = useWebSocket();

  // Fetch match details to get the other user
  const { data: match, isLoading: isLoadingMatch } = useQuery<Match>({
    queryKey: [`/api/matches/${matchId}`],
  });

  // Fetch messages for this match
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/matches/${matchId}/messages`],
  });

  const handleBack = () => {
    setLocation("/messages");
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !socket) return;

    try {
      // Emit message through WebSocket
      socket.send(
        JSON.stringify({
          type: "chat_message",
          matchId,
          senderId: user.id,
          receiverId: match?.user.id,
          content: newMessage.trim(),
        }),
      );

      // Reset the input
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by sender for better UI presentation
  const groupedMessages = useMemo(() => {
    if (!messages || !user) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    messages.forEach((message) => {
      // If no current group or sender changed, start a new group
      if (!currentGroup || currentGroup.sender !== message.senderId) {
        currentGroup = {
          sender: message.senderId,
          messages: [message],
        };
        groups.push(currentGroup);
      } else {
        // Add message to current group
        currentGroup.messages.push(message);
      }
    });

    return groups;
  }, [messages, user]);

  if (isLoadingMatch || isLoadingMessages || !user) {
    return (
      <div className="h-[calc(100vh-132px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="h-[calc(100vh-132px)] flex flex-col items-center justify-center p-4 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Match not found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This conversation may have been deleted or is no longer available.
        </p>
        <Button onClick={handleBack}>Back to Messages</Button>
      </div>
    );
  }

  const otherUser = match.user;

  return (
    <div
      className={`h-[calc(100vh-132px)] flex flex-col ${isDarkMode ? "bg-gray-900" : "bg-white"}`}
    >
      {/* Header */}
      <div
        className={`py-3 px-4 border-b ${isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"} flex items-center sticky top-0 z-10`}
      >
        <div className="flex items-center flex-1">
          <button
            className="mr-3 text-gray-600 dark:text-gray-300"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 mr-2">
            <UserPicture
              imageUrl={
                otherUser.photoUrl && otherUser.showProfilePhoto !== false
                  ? otherUser.photoUrl
                  : undefined
              }
              fallbackInitials={otherUser.fullName.charAt(0)}
              className="h-8 w-8"
            />
          </div>
          <h2 className="font-medium text-gray-800 dark:text-gray-200">
            {otherUser.fullName}
          </h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {messages && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="absolute inset-0 z-0">
              <FloatingIconsBackground
                icons={[Heart, MessageSquare]}
                iconClassName="text-pink-200 dark:text-pink-900"
                count={12}
              />
            </div>
            <div className="relative z-10 bg-white/50 dark:bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Say hello to {otherUser.fullName}!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, groupIndex) => {
              const isCurrentUser = group.sender === user?.id;

              return (
                <div
                  key={groupIndex}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  {!isCurrentUser && (
                    <div className="h-8 w-8 mr-2 self-end mb-1">
                      <UserPicture
                        imageUrl={
                          otherUser.photoUrl &&
                          otherUser.showProfilePhoto !== false
                            ? otherUser.photoUrl
                            : undefined
                        }
                        fallbackInitials={otherUser.fullName.charAt(0)}
                        className="h-8 w-8"
                      />
                    </div>
                  )}

                  <div
                    className={`flex flex-col space-y-1 max-w-[70%] ${
                      isCurrentUser ? "items-end" : "items-start"
                    }`}
                  >
                    {group.messages.map((message, messageIndex) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`px-4 py-3 rounded-2xl shadow-lg ${
                          isCurrentUser
                            ? "bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white shadow-purple-500/25"
                            : isDarkMode
                              ? "bg-gradient-to-r from-gray-700 via-slate-700 to-gray-600 text-gray-100 shadow-gray-900/30 border border-gray-600/30"
                              : "bg-gradient-to-r from-white via-purple-50/30 to-pink-50/30 text-gray-900 shadow-purple-200/20 border border-purple-200/40 backdrop-blur-sm"
                        }`}
                      >
                        <div>{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${isCurrentUser ? "text-purple-100" : "text-gray-500"}`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className={`p-4 border-t backdrop-blur-xl ${
          isDarkMode
            ? "bg-gradient-to-r from-gray-800/95 via-slate-800/95 to-gray-700/95 border-gray-600/30 shadow-xl shadow-purple-500/5"
            : "bg-gradient-to-r from-white/95 via-purple-50/80 to-pink-50/80 border-purple-200/30 shadow-xl shadow-purple-500/10"
        } sticky bottom-0`}
      >
        <div className="flex items-center space-x-3">
          <Input
            type="text"
            className={`flex-1 rounded-full px-4 py-3 shadow-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 ${
              isDarkMode
                ? "bg-gradient-to-r from-gray-700/80 via-slate-700/80 to-gray-600/80 text-white placeholder-gray-400 focus:ring-purple-500/50 backdrop-blur-sm border border-gray-600/30"
                : "bg-gradient-to-r from-white/80 via-purple-50/50 to-pink-50/50 text-gray-900 placeholder-gray-500 focus:ring-purple-400/50 backdrop-blur-sm border border-purple-200/40 shadow-purple-200/20"
            }`}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button
            className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:via-purple-700 hover:to-pink-600 text-white rounded-full shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            onClick={handleSendMessage}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
