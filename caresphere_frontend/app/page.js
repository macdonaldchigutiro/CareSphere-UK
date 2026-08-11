'use client'

import { useState } from 'react'
import { Search, Filter, MapPin, PoundSterling, Star, ChevronRight, Shield, Users, Clock } from 'lucide-react'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleMatch = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Find Perfect Care with CareSphere UK
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Our intelligent matching engine connects you with verified care providers 
          that match your exact needs, budget, and preferences.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Panel - Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Quick Match
            </h3>
            
            <div className="space-y-3 mb-6">
              {[
                { id: 'quality', label: 'Quality First', icon: Star, description: 'Best CQC ratings' },
                { id: 'budget', label: 'Budget Friendly', icon: PoundSterling, description: 'Within your budget' },
                { id: 'distance', label: 'Nearest First', icon: MapPin, description: 'Closest to you' },
                { id: 'trust', label: 'Trust First', icon: Shield, description: 'Highest verified' },
                { id: 'family', label: 'Family Choice', icon: Users, description: 'Family recommended' },
                { id: 'emergency', label: 'Emergency Care', icon: Clock, description: 'Immediate help' },
              ].map((strategy) => (
                <button
                  key={strategy.id}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 flex items-center gap-3"
                >
                  <div className="p-2 rounded-lg bg-blue-100">
                    <strategy.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{strategy.label}</div>
                    <div className="text-sm text-gray-500">{strategy.description}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Distance: 25 miles
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  defaultValue="25"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Budget: £500/week
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  defaultValue="500"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600"
                />
              </div>
              
              <button
                onClick={handleMatch}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow duration-200 mt-6"
              >
                Find Best Matches
              </button>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Main Content */}
        <div className="lg:col-span-3">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="What type of care do you need? (e.g., dementia care, mobility support, overnight care, live-in care)..."
                className="w-full p-4 pl-12 text-lg rounded-2xl border-2 border-gray-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                {isLoading ? 'Finding Best Matches...' : 'Top Care Providers Near You'}
              </h2>
              <p className="text-gray-600">
                Sorted by relevance to your needs
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Showing 8 of 127 providers
            </div>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 rounded"></div>
                    <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Results Grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provider Card 1 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">ExcelCare Services</h3>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Outstanding CQC
                      </div>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        DBS Verified
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">98%</div>
                    <div className="text-sm text-gray-500">Match Score</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">London • 2.5 miles away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PoundSterling className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">£25/hour • Accepts NHS funding</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Specializations:</div>
                  <div className="flex flex-wrap gap-2">
                    {['Dementia Care', 'Mobility Support', 'Personal Care', 'Medication Management'].map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow duration-200">
                  View Profile & Book
                </button>
              </div>
              
              {/* Provider Card 2 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">ComfortCare Homes</h3>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Good CQC
                      </div>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Insurance Verified
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">92%</div>
                    <div className="text-sm text-gray-500">Match Score</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Manchester • 5 miles away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PoundSterling className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">£22/hour • Local authority funding</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Specializations:</div>
                  <div className="flex flex-wrap gap-2">
                    {['Live-in Care', 'Respite Care', 'Alzheimer\'s Care', 'Companionship'].map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow duration-200">
                  View Profile & Book
                </button>
              </div>
              
              {/* Provider Card 3 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Golden Years Care</h3>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Outstanding CQC
                      </div>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Training Certified
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">95%</div>
                    <div className="text-sm text-gray-500">Match Score</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Birmingham • 3 miles away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PoundSterling className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">£28/hour • Private pay only</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Specializations:</div>
                  <div className="flex flex-wrap gap-2">
                    {['Palliative Care', 'Stroke Recovery', 'Diabetes Care', 'Night Care'].map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow duration-200">
                  View Profile & Book
                </button>
              </div>
              
              {/* Provider Card 4 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Family First Care</h3>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Good CQC
                      </div>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        24/7 Emergency
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">90%</div>
                    <div className="text-sm text-gray-500">Match Score</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Leeds • 4 miles away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PoundSterling className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">£20/hour • All funding accepted</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Specializations:</div>
                  <div className="flex flex-wrap gap-2">
                    {['Emergency Care', 'Weekend Care', 'Holiday Cover', 'Transport'].map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow duration-200">
                  View Profile & Book
                </button>
              </div>
            </div>
          )}
          
          {/* Stats Section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-gray-200">
            <h3 className="text-2xl font-bold mb-6 text-center">Why Choose CareSphere UK?</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
                <div className="text-lg font-semibold mb-2">Match Accuracy</div>
                <p className="text-gray-600">AI-powered perfect matches</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">500+</div>
                <div className="text-lg font-semibold mb-2">Verified Providers</div>
                <p className="text-gray-600">CQC registered & DBS checked</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">24/7</div>
                <div className="text-lg font-semibold mb-2">Emergency Support</div>
                <p className="text-gray-600">Immediate care when needed</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">£0</div>
                <div className="text-lg font-semibold mb-2">No Booking Fees</div>
                <p className="text-gray-600">Free to use platform</p>
              </div>
            </div>
          </div>
          
          {/* Family Collaboration Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold">Family Collaboration Feature</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Care decisions are family decisions. Invite family members to review providers, 
              vote on options, and make decisions together.
            </p>
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                Invite Family Members
              </button>
              <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50">
                Create Family Circle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}