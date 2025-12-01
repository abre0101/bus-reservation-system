import { Percent, Gift, Star, Plane, Luggage, Crown, Headphones } from 'lucide-react';

const BenefitsCard = ({ tier, benefits, freeTripsRemaining }) => {
  const tierConfig = {
    member: {
      name: 'Member',
      icon: '👤',
      gradient: 'from-blue-500 to-blue-600'
    },
    bronze: {
      name: 'Bronze',
      icon: '🥉',
      gradient: 'from-orange-500 to-orange-600'
    },
    silver: {
      name: 'Silver',
      icon: '🥈',
      gradient: 'from-gray-400 to-gray-600'
    },
    gold: {
      name: 'Gold',
      icon: '🥇',
      gradient: 'from-yellow-400 to-yellow-600'
    }
  };

  const config = tierConfig[tier] || tierConfig.member;

  const benefitsList = [
    {
      icon: <Percent className="w-5 h-5" />,
      label: 'Booking Discount',
      value: benefits.discount_percentage > 0 ? `${benefits.discount_percentage}%` : 'None',
      active: benefits.discount_percentage > 0
    },
    {
      icon: <Gift className="w-5 h-5" />,
      label: 'Free Trips/Year',
      value: benefits.free_trips_per_year > 0 ? `${freeTripsRemaining}/${benefits.free_trips_per_year} remaining` : 'None',
      active: benefits.free_trips_per_year > 0
    },
    {
      icon: <Plane className="w-5 h-5" />,
      label: 'Priority Boarding',
      value: benefits.priority_boarding ? 'Included' : 'Not available',
      active: benefits.priority_boarding
    },
    {
      icon: <Crown className="w-5 h-5" />,
      label: 'Free Seat Selection',
      value: benefits.free_seat_selection ? 'Included' : 'Not available',
      active: benefits.free_seat_selection
    },
    {
      icon: <Luggage className="w-5 h-5" />,
      label: 'Extra Baggage',
      value: benefits.extra_baggage_kg > 0 ? `+${benefits.extra_baggage_kg}kg` : 'Standard',
      active: benefits.extra_baggage_kg > 0
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: 'Birthday Bonus',
      value: benefits.birthday_bonus_points > 0 ? `${benefits.birthday_bonus_points} points` : 'None',
      active: benefits.birthday_bonus_points > 0
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: 'Referral Bonus',
      value: benefits.referral_bonus_points > 0 ? `${benefits.referral_bonus_points} points` : 'None',
      active: benefits.referral_bonus_points > 0
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      label: 'Customer Support',
      value: benefits.dedicated_support ? 'Dedicated' : 'Standard',
      active: benefits.dedicated_support
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.gradient} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-5xl">{config.icon}</div>
            <div>
              <h2 className="text-2xl font-bold">{config.name} Tier</h2>
              <p className="text-white/80">Your exclusive benefits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits List */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefitsList.map((benefit, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all ${
                benefit.active
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  benefit.active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{benefit.label}</p>
                  <p className={`text-lg font-bold ${
                    benefit.active ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {benefit.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tier-specific message */}
        {tier === 'member' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Earn 500 points</strong> to unlock Bronze tier and start enjoying exclusive benefits!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenefitsCard;
