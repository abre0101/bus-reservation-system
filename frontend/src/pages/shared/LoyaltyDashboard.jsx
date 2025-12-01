import { useState, useEffect } from 'react';
import { Star, Gift, TrendingUp, Calendar, Award } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import TierProgress from '../../components/loyalty/TierProgress';
import BenefitsCard from '../../components/loyalty/BenefitsCard';
import ReferralCard from '../../components/loyalty/ReferralCard';
import LoyaltyBadge from '../../components/loyalty/LoyaltyBadge';

const LoyaltyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [canClaimBirthday, setCanClaimBirthday] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/loyalty/benefits');
      setLoyaltyData(response.data);
      
      // Check if can claim birthday bonus
      checkBirthdayBonus();
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      toast.error('Failed to load loyalty information');
    } finally {
      setLoading(false);
    }
  };

  const checkBirthdayBonus = async () => {
    try {
      const response = await api.post('/api/loyalty/claim-birthday-bonus');
      if (response.data.success) {
        setCanClaimBirthday(true);
      }
    } catch (error) {
      // User can't claim - that's okay
      setCanClaimBirthday(false);
    }
  };

  const handleClaimBirthdayBonus = async () => {
    try {
      setClaimingBonus(true);
      const response = await api.post('/api/loyalty/claim-birthday-bonus');
      
      if (response.data.success) {
        toast.success(response.data.message);
        fetchLoyaltyData();
        setCanClaimBirthday(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to claim birthday bonus');
    } finally {
      setClaimingBonus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!loyaltyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load loyalty data</p>
          <button
            onClick={fetchLoyaltyData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { loyalty_points, tier, benefits, free_trips_remaining, progress, referral_code, total_referrals } = loyaltyData;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Loyalty Rewards</h1>
              <p className="text-indigo-100">Earn points, unlock benefits, and enjoy exclusive perks</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-indigo-100 text-sm">Your Points</p>
                <p className="text-4xl font-bold">{loyalty_points.toLocaleString()}</p>
              </div>
              <div className="text-5xl">{benefits.icon}</div>
            </div>
          </div>
        </div>

        {/* Birthday Bonus Banner */}
        {canClaimBirthday && (
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🎂</div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">Happy Birthday!</h3>
                  <p className="text-pink-100">
                    Claim your {benefits.birthday_bonus_points} bonus points gift
                  </p>
                </div>
              </div>
              <button
                onClick={handleClaimBirthdayBonus}
                disabled={claimingBonus}
                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-pink-50 transition-colors font-semibold disabled:opacity-50"
              >
                {claimingBonus ? 'Claiming...' : 'Claim Gift 🎁'}
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Current Tier</p>
                <p className="text-2xl font-bold text-gray-900">{benefits.name}</p>
              </div>
              <div className="text-4xl">{benefits.icon}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Discount</p>
                <p className="text-2xl font-bold text-green-600">{benefits.discount_percentage}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Free Trips</p>
                <p className="text-2xl font-bold text-purple-600">{free_trips_remaining}</p>
                <p className="text-xs text-gray-500">remaining this year</p>
              </div>
              <Gift className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Referrals</p>
                <p className="text-2xl font-bold text-yellow-600">{total_referrals}</p>
                <p className="text-xs text-gray-500">friends referred</p>
              </div>
              <Award className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Tier Progress */}
        <TierProgress
          currentPoints={loyalty_points}
          currentTier={tier}
          nextTier={progress.next_tier}
          nextTierThreshold={progress.next_tier_threshold}
        />

        {/* Benefits and Referral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BenefitsCard
              tier={tier}
              benefits={benefits}
              freeTripsRemaining={free_trips_remaining}
            />
          </div>
          <div>
            <ReferralCard
              code={referral_code}
              totalReferrals={total_referrals}
              bonusPerReferral={benefits.referral_bonus_points}
              tier={tier}
            />
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl mb-2">🎫</div>
              <p className="font-semibold text-gray-900 mb-1">Book a Trip</p>
              <p className="text-2xl font-bold text-blue-600">+100</p>
              <p className="text-xs text-gray-600">points per booking</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-semibold text-gray-900 mb-1">Complete Trip</p>
              <p className="text-2xl font-bold text-green-600">+50</p>
              <p className="text-xs text-gray-600">bonus points</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl mb-2">👥</div>
              <p className="font-semibold text-gray-900 mb-1">Refer Friends</p>
              <p className="text-2xl font-bold text-purple-600">+{benefits.referral_bonus_points}</p>
              <p className="text-xs text-gray-600">per referral ({tier} tier)</p>
            </div>
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="text-3xl mb-2">🎂</div>
              <p className="font-semibold text-gray-900 mb-1">Birthday Gift</p>
              <p className="text-2xl font-bold text-pink-600">+{benefits.birthday_bonus_points}</p>
              <p className="text-xs text-gray-600">once per year</p>
            </div>
          </div>
        </div>

        {/* Tier Comparison */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Tier Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Benefit</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">👤 Member</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">🥉 Bronze</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">🥈 Silver</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">🥇 Gold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Points Required</td>
                  <td className="px-4 py-3 text-center text-sm">0</td>
                  <td className="px-4 py-3 text-center text-sm">500</td>
                  <td className="px-4 py-3 text-center text-sm">2,000</td>
                  <td className="px-4 py-3 text-center text-sm">5,000</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">Booking Discount</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-orange-600">5%</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-600">10%</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-yellow-600">15%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Free Trips/Year</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">1</td>
                  <td className="px-4 py-3 text-center text-sm">3</td>
                  <td className="px-4 py-3 text-center text-sm">5</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">Priority Boarding</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">✓</td>
                  <td className="px-4 py-3 text-center text-sm">✓</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Free Seat Selection</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">✓</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">Extra Baggage</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">+5kg</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Birthday Bonus</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">100 pts</td>
                  <td className="px-4 py-3 text-center text-sm">200 pts</td>
                  <td className="px-4 py-3 text-center text-sm">500 pts</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">Referral Bonus</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">-</td>
                  <td className="px-4 py-3 text-center text-sm">150 pts</td>
                  <td className="px-4 py-3 text-center text-sm">300 pts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyDashboard;
