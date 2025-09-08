import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Users, TrendingUp, Settings, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MatchingEngineStats {
  totalMatches: number;
  hasPreferences: boolean;
  preferenceCompleteness: number;
  lastMatchDate: number | null;
  matchingEngineStatus: string;
  algorithmVersion: string;
}

interface DiscoveryMode {
  mode: 'enhanced' | 'original';
  userId: number;
  message: string;
}

export default function MatchingEngineTest() {
  const [discoveryMode, setDiscoveryMode] = useState<'enhanced' | 'original'>('enhanced');
  const [refreshCount, setRefreshCount] = useState(0);

  // Get matching engine stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/matching-engine/stats'],
    queryFn: async () => {
      const response = await apiRequest('/api/matching-engine/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json() as Promise<MatchingEngineStats>;
    },
    staleTime: 30000,
  });

  // Get enhanced discovery results
  const { data: enhancedUsers, isLoading: enhancedLoading, refetch: refetchEnhanced } = useQuery({
    queryKey: ['/api/discovery/enhanced', refreshCount],
    queryFn: async () => {
      const response = await apiRequest('/api/discovery/enhanced?limit=10');
      if (!response.ok) throw new Error('Failed to fetch enhanced discovery');
      return response.json();
    },
    enabled: discoveryMode === 'enhanced',
    staleTime: 15000,
  });

  // Get original discovery results for comparison
  const { data: originalUsers, isLoading: originalLoading, refetch: refetchOriginal } = useQuery({
    queryKey: ['/api/discover', refreshCount],
    queryFn: async () => {
      const response = await apiRequest('/api/discover?limit=10');
      if (!response.ok) throw new Error('Failed to fetch original discovery');
      return response.json();
    },
    enabled: discoveryMode === 'original',
    staleTime: 15000,
  });

  // Set discovery mode mutation
  const setModeMutation = useMutation({
    mutationFn: async (mode: 'enhanced' | 'original') => {
      const response = await apiRequest('/api/discovery/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) throw new Error('Failed to set discovery mode');
      return response.json() as Promise<DiscoveryMode>;
    },
    onSuccess: (data) => {
      setDiscoveryMode(data.mode);
      // Invalidate and refetch discovery queries
      queryClient.invalidateQueries({ queryKey: ['/api/discovery/enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discover'] });
    },
  });

  // Manual refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/matching-engine/refresh', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to refresh matching engine');
      return response.json();
    },
    onSuccess: () => {
      setRefreshCount(prev => prev + 1);
      refetchStats();
      refetchEnhanced();
      refetchOriginal();
    },
  });

  const currentUsers = discoveryMode === 'enhanced' ? enhancedUsers : originalUsers;
  const currentLoading = discoveryMode === 'enhanced' ? enhancedLoading : originalLoading;

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'loading': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Matching Engine Test Lab</h1>
          <p className="text-muted-foreground">
            Monitor and test the CHARLEY Hybrid Matching Algorithm
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Engine
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engine Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(stats?.matchingEngineStatus || 'loading')}`} />
              <span className="text-2xl font-bold">
                {stats?.matchingEngineStatus || 'Loading...'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Algorithm: {stats?.algorithmVersion || 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMatches || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last match: {formatDate(stats?.lastMatchDate || null)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preference Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${Math.round(stats.preferenceCompleteness * 100)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.hasPreferences ? 'Preferences set' : 'No preferences'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discovery Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Discovery Mode Comparison
          </CardTitle>
          <CardDescription>
            Compare results between enhanced matching engine and original discovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={discoveryMode === 'enhanced' ? 'default' : 'outline'}
              onClick={() => setModeMutation.mutate('enhanced')}
              disabled={setModeMutation.isPending}
            >
              Enhanced Matching
            </Button>
            <Button
              variant={discoveryMode === 'original' ? 'default' : 'outline'}
              onClick={() => setModeMutation.mutate('original')}
              disabled={setModeMutation.isPending}
            >
              Original Discovery
            </Button>
          </div>
          <div className="mt-4">
            <Badge variant={discoveryMode === 'enhanced' ? 'default' : 'secondary'}>
              Current Mode: {discoveryMode === 'enhanced' ? 'Enhanced Matching Algorithm' : 'Original Discovery'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Discovery Results */}
      <Card>
        <CardHeader>
          <CardTitle>Discovery Results</CardTitle>
          <CardDescription>
            {discoveryMode === 'enhanced' 
              ? 'AI-ranked matches using hybrid algorithm (content + collaborative + context)'
              : 'Standard discovery results using basic filtering'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading {discoveryMode} discovery...
            </div>
          ) : currentUsers && currentUsers.length > 0 ? (
            <div className="space-y-4">
              {currentUsers.slice(0, 5).map((user: any, index: number) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{user.fullName}</h4>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{user.profession || 'No profession'}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>{user.location}</span>
                        {user.ethnicity && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <span>{user.ethnicity}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user.isOnline && <Badge variant="secondary">Online</Badge>}
                    {discoveryMode === 'enhanced' && (
                      <Badge variant="outline">AI Ranked</Badge>
                    )}
                  </div>
                </div>
              ))}
              {currentUsers.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  ... and {currentUsers.length - 5} more results
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No discovery results available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Algorithm Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How the Enhanced Algorithm Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">🎯 Content-Based Filtering (40% weight)</h4>
            <p className="text-sm text-muted-foreground">
              Matches based on profile compatibility: age, location, religion, ethnicity, interests, and education
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">🤝 Collaborative Filtering (35% weight)</h4>
            <p className="text-sm text-muted-foreground">
              Analyzes patterns from users with similar preferences and recommends profiles they liked
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">⚡ Context-Aware Re-ranking (25% weight)</h4>
            <p className="text-sm text-muted-foreground">
              Real-time adjustments based on recent activity, online status, and profile completeness
            </p>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Result:</strong> Instead of random matches, users see their most compatible potential connections first,
              dramatically improving match quality and reducing swipe fatigue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}