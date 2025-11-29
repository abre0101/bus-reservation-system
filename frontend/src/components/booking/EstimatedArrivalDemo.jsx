import React from 'react'
import { Clock, Navigation, CheckCircle, Bus } from 'lucide-react'

/**
 * Demo component showing all three journey states
 * This is for demonstration purposes only
 */
const EstimatedArrivalDemo = () => {
  const states = [
    {
      status: 'not_started',
      title: 'Estimated Arrival Time',
      color: 'from-blue-500 to-indigo-600',
      icon: Clock,
      progress: 0,
      description: 'Journey has not started yet'
    },
    {
      status: 'in_progress',
      title: 'Journey In Progress',
      color: 'from-orange-500 to-red-600',
      icon: Navigation,
      progress: 45,
      description: '3h 15m remaining',
      showBus: true
    },
    {
      status: 'completed',
      title: 'Journey Completed!',
      color: 'from-green-500 to-emerald-600',
      icon: CheckCircle,
      progress: 100,
      description: 'Arrived at destination'
    }
  ]

  return (
    <div className="space-y-8 p-8 bg-gray-50 rounded-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Journey Status States Demo
      </h2>
      
      {states.map((state, index) => {
        const Icon = state.icon
        
        return (
          <div key={index} className={`bg-gradient-to-r ${state.color} rounded-xl p-6 text-white shadow-lg`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Icon className={`h-8 w-8 ${state.status === 'in_progress' ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{state.title}</h3>
                  <p className="text-white/80 text-sm">
                    450 km journey {state.description && `• ${state.description}`}
                  </p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-4xl font-bold mb-1">15:30</div>
                <div className="text-white/80 text-sm">Travel time: 7h 30m</div>
                <div className="text-white/70 text-xs mt-1">Average speed: 60 km/h</div>
              </div>
            </div>
            
            {state.status !== 'not_started' && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/80 mb-2">
                  <span>Addis Ababa</span>
                  <span className="font-semibold">{Math.round(state.progress)}% Complete</span>
                  <span>Bahir Dar</span>
                </div>
                <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-white/90 transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${state.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                  </div>
                  {state.showBus && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000"
                      style={{ left: `${state.progress}%`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="bg-white p-1 rounded-full shadow-lg">
                        <Bus className="h-3 w-3 text-orange-600" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
      
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Features:</h3>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Real-time progress updates every minute</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-orange-600 font-bold">•</span>
            <span>Animated bus icon showing current position</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600 font-bold">•</span>
            <span>Color-coded status for easy recognition</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-purple-600 font-bold">•</span>
            <span>Shimmer effect on progress bar</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-indigo-600 font-bold">•</span>
            <span>Remaining time calculation during journey</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default EstimatedArrivalDemo
