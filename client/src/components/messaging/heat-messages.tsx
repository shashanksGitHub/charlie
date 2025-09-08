import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Loader2, Flame, Search, MessageCircle, Users, TrendingUp, Bell } from "lucide-react";
import { Match } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { UserPicture } from "@/components/ui/user-picture";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  isCommunity?: boolean;
}

export function HeatMessages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { translate } = useLanguage();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("direct");
  
  // Fetch matches (would include communities in a real app)
  const { data: matches, isLoading, isError } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
  });
  
  // First filter: Only show confirmed matches (exclude pending matches) in Messages page
  const confirmedMatches = matches?.filter(match => 
    (match as any).matchType === "confirmed" || match.matched === true
  ) || [];

  // Separate direct messages and communities from confirmed matches only
  const directMessages = confirmedMatches.filter(match => !match.isCommunity);
  const communities = confirmedMatches.filter(match => match.isCommunity);
  
  // Trending communities (would come from API in a real app)
  const trendingCommunities = communities?.slice(0, 4) || [];
  
  // Filter conversations based on search query
  const filteredDirectMessages = directMessages.filter(match => 
    match.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredCommunities = communities.filter(match => 
    match.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
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
    <div className="h-[calc(100vh-132px)] flex flex-col bg-gray-50">
      {/* Header with orange/yellow theme for HEAT */}
      <div className="bg-gradient-to-r from-orange-600 to-yellow-500 border-b px-4 py-4 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-white">
            {translate('messages.yourChats')}
          </h1>
          <div className="flex space-x-2">
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setLocation("/heat/explore")}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Input 
            type="text" 
            className="w-full bg-white/20 border-none focus:ring-2 focus:ring-white/30 rounded-full py-2 px-4 pl-10 text-sm text-white placeholder:text-white/70" 
            placeholder={translate('messages.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" />
        </div>
      </div>
      
      <Tabs defaultValue="direct" className="flex-1 flex flex-col">
        <TabsList className="w-full bg-orange-50 justify-start p-1 mx-0 rounded-none border-b">
          <TabsTrigger 
            value="direct"
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full"
            onClick={() => setActiveTab("direct")}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {translate('messages.directMessages')}
          </TabsTrigger>
          <TabsTrigger 
            value="communities"
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full"
            onClick={() => setActiveTab("communities")}
          >
            <Users className="h-4 w-4 mr-1" />
            {translate('messages.communities')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="direct" className="flex-1 overflow-y-auto m-0 p-0 data-[state=active]:mt-0">
          <div ref={messagesContainerRef} className="h-full overflow-y-auto px-4 py-2">
            <AnimatePresence initial={false}>
              {filteredDirectMessages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center h-full py-10 text-center"
                >
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-orange-400" />
                  </div>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? translate('messages.noConversationsMatching') 
                      : translate('messages.noDirectMessagesYet')
                    }
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setLocation("/heat/explore")}
                      className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full text-sm font-medium hover:from-orange-600 hover:to-yellow-600 transition-colors"
                    >
                      {translate('messages.exploreUsers')}
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filteredDirectMessages.map((match) => (
                    <motion.div 
                      key={match.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3 rounded-xl ${match.unreadCount ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100'} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => handleMatchClick(match.id)}
                    >
                      <div className="flex items-center">
                        <div className="relative mr-3">
                          <UserPicture
                            imageUrl={match.user.photoUrl || undefined}
                            fallbackInitials={match.user.fullName.charAt(0)}
                            className="h-12 w-12"
                          />
                          {match.user.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <h3 className="font-medium text-gray-900 truncate pr-2">
                              {match.user.fullName}
                            </h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {match.lastMessageTime || ''}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 truncate pr-2">
                              {match.lastMessage || translate('messages.sayHello')}
                            </p>
                            
                            {match.unreadCount && match.unreadCount > 0 && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-1.5 py-0.5 text-[10px] rounded-full">
                                {match.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
        
        <TabsContent value="communities" className="flex-1 overflow-y-auto m-0 p-0 data-[state=active]:mt-0">
          <div className="flex flex-col h-full">
            {/* Trending communities */}
            <div className="px-4 py-3 bg-white border-b">
              <h2 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <TrendingUp className="h-3.5 w-3.5 text-orange-500 mr-1.5" />
                {translate('messages.trendingCommunities')}
              </h2>
              
              <div className="grid grid-cols-2 gap-2">
                {trendingCommunities.length > 0 ? (
                  trendingCommunities.map((community) => (
                    <motion.div 
                      key={`trending-${community.id}`}
                      whileHover={{ scale: 1.02 }}
                      className="bg-orange-50 rounded-lg p-2 shadow-sm border border-orange-100 cursor-pointer"
                      onClick={() => handleMatchClick(community.id)}
                    >
                      <div className="flex items-center">
                        <UserPicture
                          imageUrl={community.user.photoUrl || undefined}
                          fallbackInitials={community.user.fullName.charAt(0)}
                          className="h-8 w-8 mr-2"
                        />
                        <div>
                          <h3 className="text-xs font-medium text-gray-900 truncate" style={{ maxWidth: '120px' }}>
                            {community.user.fullName}
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            145 members
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-2 text-sm text-gray-500">
                    {translate('messages.noTrendingCommunities')}
                  </div>
                )}
              </div>
            </div>
            
            {/* Community messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-2">
              <AnimatePresence initial={false}>
                {filteredCommunities.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center h-full py-10 text-center"
                  >
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-orange-400" />
                    </div>
                    <p className="text-gray-500">
                      {searchQuery 
                        ? translate('messages.noCommunitiesMatching') 
                        : translate('messages.noCommunitiesYet')
                      }
                    </p>
                    {!searchQuery && (
                      <button 
                        onClick={() => setLocation("/heat/discover")}
                        className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full text-sm font-medium hover:from-orange-600 hover:to-yellow-600 transition-colors"
                      >
                        {translate('messages.discoverCommunities')}
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {filteredCommunities.map((community) => (
                      <motion.div 
                        key={community.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`p-3 rounded-xl ${community.unreadCount ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100'} shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden`}
                        onClick={() => handleMatchClick(community.id)}
                      >
                        {/* Animated flames in the background for HEAT */}
                        <div className="absolute inset-0 pointer-events-none opacity-5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <motion.div
                              key={`flame-${community.id}-${i}`}
                              className="absolute w-6 h-8 rounded-full bg-orange-500"
                              style={{
                                bottom: '-4px',
                                left: `${15 + i * 20}%`,
                                transformOrigin: 'center bottom'
                              }}
                              animate={{
                                scaleY: [1, 1.2, 0.9, 1.1, 1],
                                scaleX: [1, 0.9, 1.1, 0.9, 1],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 2 + i * 0.2,
                                ease: "easeInOut"
                              }}
                            />
                          ))}
                        </div>
                        
                        <div className="flex items-center relative z-10">
                          <div className="relative mr-3">
                            <UserPicture
                              imageUrl={community.user.photoUrl || undefined}
                              className="h-12 w-12"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full border border-orange-200 px-1.5 py-0.5">
                              <span className="text-[10px] font-medium text-orange-600">145</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <h3 className="font-medium text-gray-900 truncate pr-2">
                                {community.user.fullName}
                              </h3>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {community.lastMessageTime || ''}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-600 truncate pr-2">
                                <span className="font-medium text-orange-600 mr-1">User123:</span>
                                {community.lastMessage || translate('messages.joinConversation')}
                              </p>
                              
                              {community.unreadCount && community.unreadCount > 0 && (
                                <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-1.5 py-0.5 text-[10px] rounded-full">
                                  {community.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}