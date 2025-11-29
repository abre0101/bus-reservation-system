// src/components/common/BusBackground.jsx
import React from 'react';

const BusBackground = ({ variant = 'default', children }) => {
  const backgrounds = {
    default: {
      gradient: 'from-slate-900 via-blue-900 to-indigo-900',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069',
      alt: 'Modern bus on highway'
    },
    light: {
      gradient: 'from-blue-50 via-indigo-50 to-purple-50',
      image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=2070',
      alt: 'Bus station with modern buses'
    },
    travel: {
      gradient: 'from-slate-900 via-purple-900 to-indigo-900',
      image: 'https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?q=80&w=2070',
      alt: 'Scenic highway travel route'
    },
    city: {
      gradient: 'from-gray-900 via-blue-900 to-slate-900',
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2071',
      alt: 'City bus transportation'
    }
  };

  const bg = backgrounds[variant] || backgrounds.default;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0">
        <img 
          src={bg.image}
          alt={bg.alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Dark overlay for better text readability */}
        <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient} opacity-85`}></div>
      </div>

      {/* Animated mesh gradient overlay */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30"></div>
      </div>
      
      {/* Pattern overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      ></div>

      {/* Floating orbs for depth */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-float-delayed" style={{ animationDelay: '6s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BusBackground;
