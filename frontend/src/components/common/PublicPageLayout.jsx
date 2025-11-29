import { useRef, useEffect, useState } from 'react'
import { Bus } from 'lucide-react'

const PublicPageLayout = ({ children }) => {
  const busRef = useRef(null)
  const [currentBus, setCurrentBus] = useState(0)

  // Bus animation data with different colors and sizes
  const buses = [
    { type: 'deluxe', color: 'text-purple-500', size: 'h-16 w-16', shadow: 'drop-shadow-lg' },
    { type: 'premium', color: 'text-indigo-500', size: 'h-20 w-20', shadow: 'drop-shadow-xl' },
    { type: 'standard', color: 'text-blue-500', size: 'h-14 w-14', shadow: 'drop-shadow-md' },
    { type: 'express', color: 'text-indigo-600', size: 'h-18 w-18', shadow: 'drop-shadow-lg' }
  ]

  // Bus animation effect
  useEffect(() => {
    const animateBus = () => {
      if (busRef.current) {
        busRef.current.style.transition = 'none'
        busRef.current.style.transform = 'translateX(-100px)'
        
        setTimeout(() => {
          if (busRef.current) {
            busRef.current.style.transition = 'transform 15s linear'
            busRef.current.style.transform = 'translateX(calc(100vw + 100px))'
          }
        }, 100)
      }
    }

    const busInterval = setInterval(() => {
      setCurrentBus(prev => (prev + 1) % buses.length)
      setTimeout(animateBus, 500)
    }, 16000)

    // Initial animation
    setTimeout(animateBus, 1000)

    return () => clearInterval(busInterval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Ticket Pattern Background */}
      <div 
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='60' viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Crect x='10' y='15' width='80' height='30' rx='3' stroke='%236366f1' stroke-width='2' fill='none'/%3E%3Ccircle cx='10' cy='30' r='4' fill='%236366f1'/%3E%3Ccircle cx='90' cy='30' r='4' fill='%236366f1'/%3E%3Cline x1='20' y1='22' x2='40' y2='22' stroke='%236366f1' stroke-width='2'/%3E%3Cline x1='20' y1='30' x2='50' y2='30' stroke='%236366f1' stroke-width='2'/%3E%3Cline x1='20' y1='38' x2='35' y2='38' stroke='%236366f1' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '120px 80px'
        }}
      ></div>

      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 animate-pulse" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)`,
          backgroundSize: '50% 50%',
          animationDuration: '8s'
        }}></div>
      </div>

      {/* Floating shapes for depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
      </div>

      {/* Moving Bus Animation */}
      <div className="fixed bottom-20 left-0 right-0 h-24 z-10 pointer-events-none">
        <div
          ref={busRef}
          className={`absolute ${buses[currentBus].color} ${buses[currentBus].size} ${buses[currentBus].shadow} transform -translate-x-32 transition-all duration-500`}
          style={{ transition: 'transform 15s linear' }}
        >
          <Bus className="w-full h-full" fill="currentColor" />
          {/* Bus windows effect */}
          <div className="absolute inset-0 flex justify-between px-2 pt-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-3 h-2 bg-indigo-100/60 rounded-sm"></div>
            ))}
          </div>
          {/* Bus wheels */}
          <div className="absolute bottom-0 left-2 w-2 h-2 bg-indigo-900 rounded-full"></div>
          <div className="absolute bottom-0 right-2 w-2 h-2 bg-indigo-900 rounded-full"></div>
        </div>
      </div>

      {/* Road for the bus */}
      <div className="fixed bottom-16 left-0 right-0 h-3 bg-gradient-to-b from-indigo-300/30 to-indigo-400/40 z-0 pointer-events-none shadow-inner">
        {/* Road markings with animation */}
        <div className="absolute inset-0 flex space-x-8 items-center overflow-hidden animate-road-scroll">
          {[...Array(40)].map((_, i) => (
            <div key={i} className="w-16 h-1 bg-indigo-300/70 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(-15px); }
        }
        @keyframes road-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-128px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-road-scroll {
          animation: road-scroll 2s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default PublicPageLayout
