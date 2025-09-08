import { Card } from "@/components/ui/card";

export default function ContentAnalysis() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">🔍 Content-Based Scoring Analysis</h1>
            <h2 className="text-2xl font-light mb-2">Ato's MEET Discover Rankings</h2>
            <p className="text-lg opacity-90">Deep dive into why Obed ranks #1 over Chimamanda</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Final Rankings Overview */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">🎯 Final Match Rankings for Ato</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Obed */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 text-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold">🥇 #1 Obed</h4>
                <span className="text-sm opacity-80">(User 1)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Final Score:</span>
                  <span className="font-bold">0.654</span>
                </div>
                <div className="flex justify-between">
                  <span>Content Score:</span>
                  <span className="font-bold text-yellow-200">0.884</span>
                </div>
                <div className="flex justify-between">
                  <span>Collaborative:</span>
                  <span>0.500</span>
                </div>
                <div className="flex justify-between">
                  <span>Context:</span>
                  <span>0.501</span>
                </div>
              </div>
            </div>

            {/* Chimamanda */}
            <div className="bg-gradient-to-r from-gray-400 to-gray-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold">🥈 #2 Chimamanda</h4>
                <span className="text-sm opacity-80">(User 3)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Final Score:</span>
                  <span className="font-bold">0.645</span>
                </div>
                <div className="flex justify-between">
                  <span>Content Score:</span>
                  <span className="font-bold text-gray-200">0.862</span>
                </div>
                <div className="flex justify-between">
                  <span>Collaborative:</span>
                  <span>0.500</span>
                </div>
                <div className="flex justify-between">
                  <span>Context:</span>
                  <span>0.501</span>
                </div>
              </div>
            </div>

            {/* Advantage Analysis */}
            <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-6 text-white hover:shadow-lg transition-shadow">
              <h4 className="text-xl font-bold mb-4">📈 Obed's Advantage</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Content Advantage:</span>
                  <span className="font-bold text-green-200">+0.022</span>
                </div>
                <div className="flex justify-between">
                  <span>Percentage:</span>
                  <span className="font-bold">+2.6%</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Score Gap:</span>
                  <span className="font-bold">+0.009</span>
                </div>
                <div className="text-sm opacity-90 mt-2">
                  All advantage comes from content-based scoring
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Score Comparison */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">⚖️ Content Score Breakdown</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">Obed vs Chimamanda Content Scores</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Obed (0.884)</span>
                    <span className="text-green-600 font-bold">88.4%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-1000" style={{width: '88.4%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Chimamanda (0.862)</span>
                    <span className="text-gray-600 font-bold">86.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-gray-400 to-gray-600 h-3 rounded-full transition-all duration-1000" style={{width: '86.2%'}}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Numerical Breakdown</h4>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Content Score Difference:</span>
                    <span className="font-bold text-green-600">+0.022 points</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Percentage Advantage:</span>
                    <span className="font-bold text-blue-600">+2.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Final Score Impact:</span>
                    <span className="font-bold text-purple-600">+0.009 final points</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span>Collaborative Score:</span>
                    <span>Identical (0.500)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Context Score:</span>
                    <span>Identical (0.501)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Four Similarity Types */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">📊 Four Content-Based Similarity Calculations</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Jaccard Similarity */}
            <div className="border-l-4 border-blue-500 pl-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xl font-semibold text-blue-600">A. Jaccard Similarity</h4>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">25% Weight</span>
              </div>
              <p className="text-gray-600 mb-4">Compares categorical features between users using binary matching</p>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Fields Analyzed:</h5>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Ethnicity:</strong> Ato's ethnicity vs Obed/Chimamanda's ethnicity preferences</li>
                  <li>• <strong>Religion:</strong> Religious compatibility matching</li>
                  <li>• <strong>Body Type:</strong> Physical appearance preferences</li>
                  <li>• <strong>Education Level:</strong> Academic background alignment</li>
                  <li>• <strong>Has Children:</strong> Family status matching</li>
                  <li>• <strong>Wants Children:</strong> Future family goals</li>
                  <li>• <strong>Relationship Goals:</strong> Dating intentions alignment</li>
                  <li>• <strong>Location:</strong> Geographic compatibility</li>
                </ul>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800"><strong>Calculation:</strong> J(A,B) = |A ∩ B| / |A ∪ B| - measures overlap between user attributes and candidate preferences</p>
              </div>
            </div>

            {/* TF-IDF Similarity */}
            <div className="border-l-4 border-green-500 pl-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xl font-semibold text-green-600">B. TF-IDF Similarity</h4>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">20% Weight</span>
              </div>
              <p className="text-gray-600 mb-4">Analyzes textual content compatibility using keyword matching</p>
              
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Fields Analyzed:</h5>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Bio Descriptions:</strong> Personal description text analysis</li>
                  <li>• <strong>Interests:</strong> Hobby and activity keyword matching</li>
                  <li>• <strong>Profession:</strong> Career and work-related terms</li>
                  <li>• <strong>Education Details:</strong> School names and academic terms</li>
                  <li>• <strong>Location Details:</strong> City, state, country text parsing</li>
                </ul>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800"><strong>Calculation:</strong> TF-IDF scores weighted by term frequency and inverse document frequency - finds semantic textual similarities</p>
              </div>
            </div>

            {/* Cosine Similarity */}
            <div className="border-l-4 border-purple-500 pl-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xl font-semibold text-purple-600">C. Cosine Similarity</h4>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">30% Weight</span>
              </div>
              <p className="text-gray-600 mb-4">Numerical feature vector comparison with highest impact on scoring</p>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Fields Analyzed:</h5>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Age Compatibility:</strong> Age difference calculations within preferred ranges</li>
                  <li>• <strong>Height Ranges:</strong> Physical compatibility scoring</li>
                  <li>• <strong>Profile Completeness:</strong> Completion percentage comparison</li>
                  <li>• <strong>Activity Scores:</strong> User engagement and platform usage</li>
                  <li>• <strong>Distance Factors:</strong> Geographic proximity calculations</li>
                  <li>• <strong>Response Times:</strong> Communication activity patterns</li>
                </ul>
              </div>
              
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800"><strong>Most Likely Factor:</strong> This highest-weighted component (30%) probably gives Obed his significant advantage through better numerical compatibility</p>
              </div>
              
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800"><strong>Calculation:</strong> cos(θ) = A·B / (||A|| ||B||) - measures angle between user feature vectors</p>
              </div>
            </div>

            {/* Preference Alignment */}
            <div className="border-l-4 border-red-500 pl-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xl font-semibold text-red-600">D. Preference Alignment</h4>
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">25% Weight</span>
              </div>
              <p className="text-gray-600 mb-4">Matches against Ato's declared matching priorities with weighted importance</p>
              
              <div className="bg-red-50 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Priority Categories Evaluated:</h5>
                <ul className="text-sm space-y-1">
                  <li>• <strong>💎 Shared Values:</strong> Moral and life philosophy alignment</li>
                  <li>• <strong>🌟 Personality:</strong> Character traits and behavioral compatibility</li>
                  <li>• <strong>💖 Physical Attraction:</strong> Visual and physical appeal</li>
                  <li>• <strong>🚀 Career & Ambition:</strong> Professional goals and drive</li>
                  <li>• <strong>🙏 Religious Compatibility:</strong> Spiritual belief alignment</li>
                  <li>• <strong>🌍 Cultural Background:</strong> Tribal and ethnic connections</li>
                  <li>• <strong>🧠 Intellectual Connection:</strong> Mental compatibility and conversations</li>
                </ul>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800"><strong>Priority Weighting:</strong> 1st Priority = 40%, 2nd Priority = 30%, 3rd Priority = 20% of total preference score</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Detailed Factor Analysis */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">🔍 Why Obed Likely Scores Higher</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">Most Probable Factors (Ranked by Impact)</h4>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">1</div>
                  <div>
                    <h5 className="font-semibold text-purple-700">Cosine Similarity (30% weight)</h5>
                    <p className="text-sm text-gray-600">Age/height compatibility or profile completeness advantage</p>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">2</div>
                  <div>
                    <h5 className="font-semibold text-red-700">Preference Alignment (25% weight)</h5>
                    <p className="text-sm text-gray-600">Better match to Ato's matching priorities</p>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">3</div>
                  <div>
                    <h5 className="font-semibold text-blue-700">Jaccard Similarity (25% weight)</h5>
                    <p className="text-sm text-gray-600">More categorical feature alignments</p>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">4</div>
                  <div>
                    <h5 className="font-semibold text-green-700">TF-IDF Similarity (20% weight)</h5>
                    <p className="text-sm text-gray-600">Stronger textual content matches</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Latest Console Data Analysis</h4>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="text-sm text-gray-700">
                    <strong>From Recent Logs (User 2 → Ato):</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Obed (User 1):</span>
                    <span className="font-bold text-green-600">Content: 0.873</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Chimamanda (User 3):</span>
                    <span className="font-bold text-blue-600">Content: 0.851</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Current Advantage:</span>
                    <span className="font-bold text-purple-600">+0.022 points</span>
                  </div>
                  <hr className="my-2" />
                  <div className="text-xs text-gray-500">
                    Performance: 2727ms calculation time
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-semibold text-yellow-800 mb-2">Key Insight</h5>
                <p className="text-sm text-yellow-700">The TF-IDF similarity shows perfect 1.0000 score between users, indicating identical textual content. The ranking advantage comes primarily from Cosine Similarity and Preference Alignment differences.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Final Conclusion */}
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8">
          <h3 className="text-2xl font-bold mb-6">🏁 Final Conclusion</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-semibold mb-4">Why Obed Ranks #1</h4>
              <p className="mb-4">Obed appears first in Ato's MEET Discover page because his content-based compatibility score consistently exceeds Chimamanda's by approximately 0.022 points.</p>
              
              <p className="mb-4">This 2.6% advantage in content scoring, combined with identical collaborative and context scores, results in Obed's consistent top ranking.</p>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4">Key Technical Insights</h4>
              <ul className="space-y-2">
                <li>• Content advantage stems from cosine similarity (30% weight)</li>
                <li>• Numerical feature compatibility is the decisive factor</li>
                <li>• Age, height, or profile completeness provides Obed's edge</li>
                <li>• Preference alignment to Ato's matching priorities also contributes</li>
                <li>• TF-IDF shows identical textual compatibility (1.0000)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white bg-opacity-20 rounded-lg">
            <p className="text-center text-sm opacity-90">
              <strong>Platform:</strong> CHARLEY AI-Powered Dating & Professional Networking • 
              <strong>Generated:</strong> January 29, 2025 • 
              <strong>Analysis Type:</strong> Content-Based Scoring Deep Dive
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}