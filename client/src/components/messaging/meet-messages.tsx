import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Heart, Search, MessageCircle, UserPlus, 
  Filter, ChevronDown, Star, ArrowRightCircle,
  Clock, Calendar, X, Info, ChevronRight
} from "lucide-react";
import { Match } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { motion, AnimatePresence } from "framer-motion";
import { UserPicture } from "@/components/ui/user-picture";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// A simplified user type that matches what we receive in the match data
interface SimpleUser {
  id: number;
  username: string;
  fullName: string;
  photoUrl?: string;
  profession?: string | null;
  location?: string | null;
  ethnicity?: string | null;
  isOnline?: boolean;
}

interface MatchWithUser extends Match {
  user: SimpleUser;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  compatibility?: number;
  matchType?: "confirmed" | "pending";
}

export function MeetMessages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { translate } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'new'>('all');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useDarkMode();
  const [infoMode, setInfoMode] = useState(false);
  
  // Fetch matches
  const { data: matches, isLoading, isError } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
  });
  
  // Sample data for new matches. In a real app, this would come from the API
  const newMatches = matches?.slice(0, 5) || [];
  
  // Filter conversations based on search query and active tab
  // Only show confirmed matches (not pending matches) in Messages page
  const filteredMatches = matches?.filter(match => {
    // Debug logging to see what we're filtering
    console.log(`[MESSAGES-FILTER] Match ID: ${match.id}, matchType: ${(match as any).matchType}, matched: ${match.matched}, user: ${match.user?.fullName}`);
    
    // First filter: Only show confirmed matches (exclude pending matches)
    const isConfirmed = (match as any).matchType === "confirmed" || match.matched === true;
    console.log(`[MESSAGES-FILTER] isConfirmed: ${isConfirmed}`);
    if (!isConfirmed) return false;
    
    const nameMatch = match.user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'unread') {
      return nameMatch && (match.unreadCount && match.unreadCount > 0);
    } else if (activeTab === 'new') {
      return nameMatch && !match.lastMessage;
    }
    
    return nameMatch;
  }) || [];
  
  const handleMatchClick = (matchId: number) => {
    setLocation(`/chat/${matchId}`);
  };
  
  // Scroll to top when tab changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);
  
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-132px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="h-[calc(100vh-132px)] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">
            {translate('errors.loadingMessages')}
          </p>
          <p className="text-gray-500 text-sm">
            {translate('errors.tryAgainLater')}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`h-[calc(100vh-132px)] flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Custom header for MEET messages with romantic theme */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              {translate('messages.yourConnections')}
            </h1>
            <div className="flex space-x-2">
              <button 
                className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  isDarkMode ? 'bg-gray-700 text-purple-400 hover:bg-gray-600' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                } transition-colors`}
                onClick={() => setInfoMode(!infoMode)}
              >
                <Info className="w-4 h-4" />
              </button>
              <button 
                className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  isDarkMode ? 'bg-gray-700 text-purple-400 hover:bg-gray-600' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                } transition-colors`}
                onClick={() => setLocation("/matches")}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Input 
              type="text" 
              className={`w-full ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500 placeholder:text-gray-400' 
                  : 'bg-purple-50 border-purple-200 focus:border-purple-300 placeholder:text-purple-300'
              } rounded-full py-2 px-4 pl-10 text-sm`} 
              placeholder={translate('messages.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className={`h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-purple-400'}`} />
          </div>
        </div>
        
        {/* Message filters */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} py-2 px-4 border-b overflow-x-auto`}>
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                activeTab === 'all' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('all')}
            >
              {translate('messages.allMessages')}
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                activeTab === 'unread' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('unread')}
            >
              {translate('messages.unread')}
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                activeTab === 'new' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('new')}
            >
              {translate('messages.newMatches')}
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap flex items-center ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="h-3 w-3 mr-1" />
                  {translate('common.filter')}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </button>
              </PopoverTrigger>
              <PopoverContent className={`w-48 p-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                <div className="space-y-1">
                  <button className={`w-full text-left px-3 py-2 text-xs rounded-md ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    {translate('common.newest')}
                  </button>
                  <button className={`w-full text-left px-3 py-2 text-xs rounded-md ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    {translate('common.oldest')}
                  </button>
                  <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />
                  <button className={`w-full text-left px-3 py-2 text-xs rounded-md ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    {translate('common.favoriteFirst')}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      
      {/* New matches horizontal scroll with romantic styled cards */}
      {newMatches.length > 0 && (
        <div className={`px-4 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-2 shadow-sm border-b`}>
          <h2 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3 flex items-center`}>
            <Heart className="h-3.5 w-3.5 text-pink-500 mr-1.5" fill={isDarkMode ? "#ec4899" : "#ec4899"} />
            {translate('messages.newConnections')}
          </h2>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {newMatches.map((match) => (
              <div 
                key={`new-${match.id}`} 
                className="flex-shrink-0"
                onClick={() => handleMatchClick(match.id)}
              >
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="relative w-20 h-20 mb-1 rounded-full overflow-hidden border-2 border-pink-400 p-0.5"
                >
                  <div className="w-full h-full overflow-hidden rounded-full">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-full h-full"
                    >
                      {match.user.photoUrl ? (
                        <img 
                          src={match.user.photoUrl} 
                          alt={match.user.fullName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-500 text-white text-lg font-medium">
                          {match.user.fullName.charAt(0)}
                        </div>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Compatibility badge */}
                  {match.compatibility && (
                    <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border border-white">
                      {match.compatibility}%
                    </div>
                  )}
                  
                  {match.user.isOnline && (
                    <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </motion.div>
                <p className={`text-xs text-center font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate max-w-[80px]`}>
                  {match.user.fullName.split(' ')[0]}
                </p>
                <div className="flex justify-center">
                  <span className="text-[9px] text-pink-500 flex items-center">
                    <Heart className="h-2 w-2 mr-0.5" fill="#ec4899" />
                    New match
                  </span>
                </div>
              </div>
            ))}
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 flex flex-col items-center justify-center"
              onClick={() => setLocation("/matches")}
            >
              <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'} flex items-center justify-center mb-1`}>
                <ArrowRightCircle className={`h-6 w-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              </div>
              <p className={`text-xs text-center font-medium ${isDarkMode ? 'text-gray-400' : 'text-purple-500'}`}>
                {translate('common.viewAll')}
              </p>
            </motion.div>
          </div>
        </div>
      )}
      
      {/* Messages list with romantic theme */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        <AnimatePresence initial={false}>
          {filteredMatches.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center h-full py-10 text-center"
            >
              <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-700' : 'bg-purple-100'} rounded-full flex items-center justify-center mb-4`}>
                <MessageCircle className={`h-8 w-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              </div>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {searchQuery 
                  ? translate('messages.noConversationsMatching') 
                  : activeTab === 'unread'
                    ? translate('messages.noUnreadMessages')
                    : activeTab === 'new'
                      ? translate('messages.noNewMatches')
                      : translate('messages.noConversationsYet')
                }
              </p>
              {!searchQuery && activeTab === 'all' && (
                <button 
                  onClick={() => setLocation("/matches")}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {translate('messages.findMatches')}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((match, index) => (
                <motion.div 
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`p-3 rounded-xl ${
                    isDarkMode 
                      ? match.unreadCount ? 'bg-gray-800/90 border-purple-900/60' : 'bg-gray-800/70 border-gray-700' 
                      : match.unreadCount ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100'
                  } border shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}
                  onClick={() => handleMatchClick(match.id)}
                >
                  {/* Subtle heart pattern background */}
                  {match.unreadCount && match.unreadCount > 0 && (
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Heart 
                          key={`bg-heart-${i}`} 
                          className="absolute text-pink-500" 
                          style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 10 + 10}px`,
                            height: `${Math.random() * 10 + 10}px`,
                            transform: `rotate(${Math.random() * 45}deg)`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <div className="relative mr-3">
                      <div className={`border-2 rounded-full overflow-hidden ${match.unreadCount ? 'border-pink-400' : isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <UserPicture
                          imageUrl={match.user.photoUrl || undefined}
                          fallbackInitials={match.user.fullName.charAt(0)}
                          className="h-14 w-14"
                        />
                      </div>
                      
                      {/* Online indicator */}
                      {match.user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                      )}
                      
                      {/* Favorite star - only appears on hover */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute -top-1 -left-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star className="h-3 w-3 text-gray-400 hover:text-yellow-400 cursor-pointer" />
                      </motion.div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate pr-2`}>
                          {match.user.fullName}
                        </h3>
                        <div className="flex items-center">
                          {match.compatibility && (
                            <span className={`text-xs ${isDarkMode ? 'text-pink-400' : 'text-pink-500'} mr-2 whitespace-nowrap`}>
                              {match.compatibility}% match
                            </span>
                          )}
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} whitespace-nowrap flex items-center`}>
                            <Clock className="h-3 w-3 mr-0.5" />
                            {match.lastMessageTime || 'New'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate pr-2`}>
                          {match.lastMessage || translate('messages.sayHello')}
                        </p>
                        
                        {match.unreadCount && match.unreadCount > 0 && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-1.5 py-0.5 text-[10px] rounded-full">
                            {match.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      {infoMode && match.user.location && (
                        <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} italic`}>
                          {match.user.location}
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}