import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Loader2, Briefcase, Search, MessageCircle, Building, UserCheck, Filter, CalendarDays } from "lucide-react";
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
  company?: string | null;
  jobTitle?: string | null;
}

interface MatchWithUser extends Match {
  user: SimpleUser;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  isCompany?: boolean;
  isProfessional?: boolean;
  isRecruiter?: boolean;
  isOpportunity?: boolean;
  matchType?: "confirmed" | "pending";
}

export function SuiteMessages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { translate } = useLanguage();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("professionals");
  
  // Fetch matches
  const { data: matches, isLoading, isError } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
  });
  
  // First filter: Only show confirmed matches (exclude pending matches) in Messages page
  const confirmedMatches = matches?.filter(match => 
    (match as any).matchType === "confirmed" || match.matched === true
  ) || [];

  // Separate professionals and companies from confirmed matches only
  const professionals = confirmedMatches.filter(match => !match.isCompany);
  const companies = confirmedMatches.filter(match => match.isCompany);
  const opportunities = confirmedMatches.filter(match => match.isOpportunity);
  
  // Filter conversations based on search query
  const filteredProfessionals = professionals.filter(match => 
    match.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (match.user.jobTitle && match.user.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (match.user.company && match.user.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const filteredCompanies = companies.filter(match => 
    match.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredOpportunities = opportunities.filter(match => 
    match.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (match.user.jobTitle && match.user.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
      {/* Header with blue/indigo theme for SUITE */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-600 border-b px-4 py-4 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-white">
            {translate('messages.professionalNetwork')}
          </h1>
          <div className="flex space-x-2">
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Input 
            type="text" 
            className="w-full bg-white/20 border-none focus:ring-2 focus:ring-white/30 rounded-full py-2 px-4 pl-10 text-sm text-white placeholder:text-white/70" 
            placeholder={translate('messages.searchProfessionals')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" />
        </div>
      </div>
      
      <Tabs defaultValue="professionals" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start p-1 mx-0 rounded-none border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <TabsTrigger 
            value="professionals"
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full"
            onClick={() => setActiveTab("professionals")}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            {translate('messages.professionals')}
          </TabsTrigger>
          <TabsTrigger 
            value="companies"
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full"
            onClick={() => setActiveTab("companies")}
          >
            <Building className="h-4 w-4 mr-1" />
            {translate('messages.companies')}
          </TabsTrigger>
          <TabsTrigger 
            value="opportunities"
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full"
            onClick={() => setActiveTab("opportunities")}
          >
            <Briefcase className="h-4 w-4 mr-1" />
            {translate('messages.opportunities')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="professionals" className="flex-1 overflow-y-auto m-0 p-0 data-[state=active]:mt-0">
          <div ref={messagesContainerRef} className="h-full overflow-y-auto px-4 py-2">
            <AnimatePresence initial={false}>
              {filteredProfessionals.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center h-full py-10 text-center"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <UserCheck className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? translate('messages.noProfessionalsMatching') 
                      : translate('messages.noProfessionalsYet')
                    }
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setLocation("/suite/network")}
                      className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                    >
                      {translate('messages.buildNetwork')}
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filteredProfessionals.map((match) => (
                    <motion.div 
                      key={match.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3 rounded-xl ${match.unreadCount ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-100'} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => handleMatchClick(match.id)}
                    >
                      <div className="flex items-center">
                        <div className="relative mr-3">
                          <div className="border border-blue-100 rounded-full overflow-hidden">
                            <UserPicture
                              imageUrl={match.user.photoUrl || undefined}
                              fallbackInitials={match.user.fullName.charAt(0)}
                              className="h-12 w-12"
                            />
                          </div>
                          {match.user.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 truncate pr-2">
                                {match.user.fullName}
                              </h3>
                              <p className="text-xs text-blue-600 truncate">
                                {match.user.jobTitle || ''} {match.user.company ? `at ${match.user.company}` : ''}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {match.lastMessageTime || ''}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-gray-600 truncate pr-2">
                              {match.lastMessage || translate('messages.connectProfessionally')}
                            </p>
                            
                            {match.unreadCount && match.unreadCount > 0 && (
                              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-1.5 py-0.5 text-[10px] rounded-full">
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
        
        <TabsContent value="companies" className="flex-1 overflow-y-auto m-0 p-0 data-[state=active]:mt-0">
          <div ref={messagesContainerRef} className="h-full overflow-y-auto px-4 py-2">
            <AnimatePresence initial={false}>
              {filteredCompanies.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center h-full py-10 text-center"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Building className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? translate('messages.noCompaniesMatching') 
                      : translate('messages.noCompaniesYet')
                    }
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setLocation("/suite/companies")}
                      className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                    >
                      {translate('messages.discoverCompanies')}
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filteredCompanies.map((match) => (
                    <motion.div 
                      key={match.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3 rounded-xl ${match.unreadCount ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-100'} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => handleMatchClick(match.id)}
                    >
                      <div className="flex items-center">
                        <div className="relative mr-3">
                          <div className="border border-blue-100 rounded-full overflow-hidden">
                            <UserPicture
                              imageUrl={match.user.photoUrl || undefined}
                              fallbackInitials={match.user.fullName.charAt(0)}
                              className="h-12 w-12"
                            />
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-100 rounded-full border border-blue-200 flex items-center justify-center">
                            <Building className="h-2.5 w-2.5 text-blue-700" />
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 truncate pr-2">
                                {match.user.fullName}
                              </h3>
                              <p className="text-xs text-blue-600 truncate">
                                {match.user.location || ''}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {match.lastMessageTime || ''}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-gray-600 truncate pr-2">
                              {match.lastMessage || translate('messages.companyInformation')}
                            </p>
                            
                            {match.unreadCount && match.unreadCount > 0 && (
                              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-1.5 py-0.5 text-[10px] rounded-full">
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
        
        <TabsContent value="opportunities" className="flex-1 overflow-y-auto m-0 p-0 data-[state=active]:mt-0">
          <div ref={messagesContainerRef} className="h-full overflow-y-auto px-4 py-2">
            <AnimatePresence initial={false}>
              {filteredOpportunities.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center h-full py-10 text-center"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? translate('messages.noOpportunitiesMatching') 
                      : translate('messages.noOpportunitiesYet')
                    }
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setLocation("/suite/opportunities")}
                      className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                    >
                      {translate('messages.exploreOpportunities')}
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filteredOpportunities.map((match) => (
                    <motion.div 
                      key={match.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3 rounded-xl ${match.unreadCount ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-100'} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => handleMatchClick(match.id)}
                    >
                      <div className="flex items-center">
                        <div className="relative mr-3">
                          <div className="border border-blue-200 rounded-full overflow-hidden">
                            <UserPicture
                              imageUrl={match.user.photoUrl || undefined}
                              fallbackInitials={match.user.fullName.charAt(0)}
                              className="h-12 w-12"
                            />
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-100 rounded-full border border-blue-200 flex items-center justify-center">
                            <Briefcase className="h-2.5 w-2.5 text-blue-700" />
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 truncate pr-2">
                                {match.user.fullName}
                              </h3>
                              <p className="text-xs text-blue-600 truncate">
                                {match.user.jobTitle || ''}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {match.lastMessageTime || ''}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-gray-600 truncate pr-2">
                              {match.lastMessage || translate('messages.jobOpportunity')}
                            </p>
                            
                            {match.unreadCount && match.unreadCount > 0 && (
                              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-1.5 py-0.5 text-[10px] rounded-full">
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
      </Tabs>
    </div>
  );
}