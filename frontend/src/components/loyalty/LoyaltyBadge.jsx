import { Star } from 'lucide-react';

const LoyaltyBadge = ({ tier, points, size = 'md' }) => {
  const tierConfig = {
    member: {
      name: 'Member',
      icon: '👤',
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800'
    },
    bronze: {
      name: 'Bronze',
      icon: '🥉',
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800'
    },
    silver: {
      name: 'Silver',
      icon: '🥈',
      color: 'from-gray-300 to-gray-500',
      bgColor: 'bg-gray-200',
      textColor: 'text-gray-800'
    },
    gold: {
      name: 'Gold',
      icon: '🥇',
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    }
  };

  const config = tierConfig[tier] || tierConfig.member;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${config.bgColor} ${config.textColor} ${sizeClasses[size]} font-semibold shadow-sm`}>
      <span className="text-lg">{config.icon}</span>
      <span>{config.name}</span>
      {points !== undefined && (
        <span className="ml-1 opacity-75">• {points.toLocaleString()} pts</span>
      )}
    </div>
  );
};

export default LoyaltyBadge;
