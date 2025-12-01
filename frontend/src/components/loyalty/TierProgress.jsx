import { TrendingUp } from 'lucide-react';

const TierProgress = ({ currentPoints, currentTier, nextTier, nextTierThreshold }) => {
  const tierConfig = {
    member: { name: 'Member', icon: '👤', color: 'blue', threshold: 0 },
    bronze: { name: 'Bronze', icon: '🥉', color: 'orange', threshold: 500 },
    silver: { name: 'Silver', icon: '🥈', color: 'gray', threshold: 2000 },
    gold: { name: 'Gold', icon: '🥇', color: 'yellow', threshold: 5000 }
  };

  const current = tierConfig[currentTier] || tierConfig.member;
  const next = nextTier ? tierConfig[nextTier] : null;

  if (!next) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border-2 border-yellow-300">
        <div className="text-center">
          <div className="text-6xl mb-3">{current.icon}</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {current.name} Tier - Maximum Level!
          </h3>
          <p className="text-gray-600">
            You've reached the highest tier with {currentPoints.toLocaleString()} points
          </p>
        </div>
      </div>
    );
  }

  const pointsToNext = nextTierThreshold - currentPoints;
  const progressPercentage = ((currentPoints - current.threshold) / (nextTierThreshold - current.threshold)) * 100;

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{current.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{current.name} Tier</h3>
            <p className="text-sm text-gray-600">{currentPoints.toLocaleString()} points</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <div className="text-right">
            <p className="text-xs text-gray-600">Next: {next.name}</p>
            <p className="text-sm font-bold text-indigo-600">{pointsToNext.toLocaleString()} pts to go</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full bg-gradient-to-r from-${current.color}-400 to-${next.color}-500 transition-all duration-500`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            <div className="h-full w-full bg-white opacity-20 animate-pulse"></div>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>{current.threshold.toLocaleString()} pts</span>
          <span className="font-semibold">{Math.round(progressPercentage)}%</span>
          <span>{nextTierThreshold.toLocaleString()} pts</span>
        </div>
      </div>

      {/* Next Tier Preview */}
      <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{next.icon}</span>
          <span className="font-semibold text-gray-900">Unlock {next.name} Tier Benefits:</span>
        </div>
        <ul className="text-sm text-gray-700 space-y-1 ml-8">
          {next.name === 'Bronze' && (
            <>
              <li>• 5% discount on all bookings</li>
              <li>• 1 free trip per year</li>
              <li>• 100 birthday bonus points</li>
            </>
          )}
          {next.name === 'Silver' && (
            <>
              <li>• 10% discount on all bookings</li>
              <li>• 3 free trips per year</li>
              <li>• Priority boarding</li>
              <li>• 200 birthday bonus points</li>
            </>
          )}
          {next.name === 'Gold' && (
            <>
              <li>• 15% discount on all bookings</li>
              <li>• 5 free trips per year</li>
              <li>• Priority boarding + free seat selection</li>
              <li>• 5kg extra baggage</li>
              <li>• 500 birthday bonus points</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TierProgress;
