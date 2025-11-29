import React from 'react'
import { MapPin, Navigation } from 'lucide-react'

const JourneyProgressBar = ({ 
  departureCity, 
  arrivalCity, 
  departureTime, 
  estimatedArrivalTime,
  currentProgress = 0 
}) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Journey Progress</h3>
      
      {/* Route visualization */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
        
        {/* Moving bus icon */}
        {currentProgress > 0 && currentProgress < 100 && (
          <div 
            className="absolute -top-6 transform -translate-x-1/2 transition-all duration-500"
            style={{ left: `${currentProgress}%` }}
          >
            <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-bounce">
              <Navigation className="h-4 w-4" />
            </div>
          </div>
        )}
        
        {/* Start and end markers */}
        <div className="flex justify-between mt-4">
          <div className="flex flex-col items-start">
            <div className="flex items-center space-x-2 mb-1">
              <div className="bg-green-500 p-1.5 rounded-full">
                <MapPin className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-gray-900">{departureCity}</span>
            </div>
            <span className="text-sm text-gray-600 ml-7">{departureTime}</span>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900">{arrivalCity}</span>
              <div className="bg-red-500 p-1.5 rounded-full">
                <MapPin className="h-3 w-3 text-white" />
              </div>
            </div>
            <span className="text-sm text-gray-600 mr-7">{estimatedArrivalTime}</span>
          </div>
        </div>
      </div>
      
      {/* Progress percentage */}
      <div className="mt-4 text-center">
        <span className="text-2xl font-bold text-blue-600">{Math.round(currentProgress)}%</span>
        <span className="text-gray-600 ml-2">Complete</span>
      </div>
    </div>
  )
}

export default JourneyProgressBar
