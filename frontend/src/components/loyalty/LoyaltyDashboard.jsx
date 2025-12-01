import { useState, useEffect } from 'react';
import { Star, Gift, Users, TrendingUp, Award, Calendar } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const LoyaltyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [benefits, setBenefits] = useState(null);
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/loyalty/benefits');
      setBenefits(response.data);
    } catch (error) {
      console.error('Error fetching benefits:', error);
      toast.error('Failed to load loyalty benefits');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimBirthdayBonus = async () => {
    try {
      const response = await api.post('/api/loyalty/claim-birthday-bonus');
      toast.success(response.data.message);
      fetchBenefits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to claim birthday bonus');
    }
  };

  const handleGenerateReferralCode = async () => {
    try {
      const response = await api.post('/api/loyalty/generate-referral-code');
      toast.success(response.data.message);
      fetchBenefits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate referral code');
    }
  };

  const copyReferralCode = () => {
    if (benefits?.referral_code) {
      navigator.clipboard.writeText(benefits.referral_code);
      toast.success('Referral code copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!benefits) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load loyalty benefits</p>
      </div>
    );
  }

  const tierColors = {
    member: 'from-blue-500 to-blue-600',
    bronze: 'from-orange-500 to-orange-600',
    silver: 'from-gray-400 to-gray-500',
    gold: 'from-yellow-400 to-yellow-500'
  };

  const tierIcons = {
    member: '👤',
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇'
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className={`bg-gradient-to-r ${tierColors[benefits.tier]} rounded-2xl shadow-xl p-8 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-5xl">{tierIcons[benefits.tier]}</span>
              <div>
                <h1 className="text-3xl font-bold capitalize">{benefits.tier} Member</h1>
                <p className="text-white/80 mt-1">Loyalty Tier</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Total Points</p>
            <p className="text-5xl font-bold">{benefits.loyalty_points.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {benefits.progress.next_tier && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progress to {benefits.progress.next_tier}</span>
              <span>{benefits.progress.points_to_next} points to go</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${benefits.progress.progress_percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Discount */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <span className="text-3xl font-bold text-green-600">
              {benefits.benefits.discount_percentage}%
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">Discount</h3>
          <p className="text-sm text-gray-600 mt-1">On all bookings</p>
        </div>

        {/* Free Trips */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <Gift className="h-8 w-8 text-purple-600" />
            <span className="text-3xl font-bold text-purple-600">
              {benefits.free_trips_remaining}/{benefits.benefits.free_trips_per_year}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">Free Trips</h3>
          <p className="text-sm text-gray-600 mt-1">Remaining this year</p>
        </div>

        {/* Birthday Bonus */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border-2 border-pink-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="h-8 w-8 text-pink-600" />
            <span className="text-3xl font-bold text-pink-600">
              {benefits.benefits.birthday_bonus_points}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">Birthday Bonus</h3>
          <p className="text-sm text-gray-600 mt-1">Points per year</p>
          {benefits.benefits.birthday_bonus_points > 0 && (
            <button
              onClick={handleClaimBirthdayBonus}
              className="mt-3 w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
            >
              Claim Bonus
            </button>
          )}
        </div>

        {/* Referrals */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-600" />
            <span className="text-3xl font-bold text-blue-600">
              {benefits.total_referrals}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">Referrals</h3>
          <p className="text-sm text-gray-600 mt-1">
            {benefits.benefits.referral_bonus_points} pts each
          </p>
          <button
            onClick={() => setShowReferralModal(true)}
            className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Share Code
          </button>
        </div>
      </div>

      {/* Tier Benefits Details */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Award className="h-6 w-6 text-indigo-600" />
          Your {benefits.benefits.name} Benefits
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {benefits.benefits.discount_percentage}% Discount
              </h3>
              <p className="text-sm text-gray-600">Automatically applied to all bookings</p>
            </div>
          </div>

          {benefits.benefits.free_trips_per_year > 0 && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {benefits.benefits.free_trips_per_year} Free Trips/Year
                </h3>
                <p className="text-sm text-gray-600">
                  Max {benefits.benefits.free_trip_max_value} ETB per trip
                </p>
              </div>
            </div>
          )}

          {benefits.benefits.priority_boarding && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Priority Boarding</h3>
                <p className="text-sm text-gray-600">Board 30 minutes before departure</p>
              </div>
            </div>
          )}

          {benefits.benefits.free_seat_selection && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Free Seat Selection</h3>
                <p className="text-sm text-gray-600">Choose your preferred seat</p>
              </div>
            </div>
          )}

          {benefits.benefits.extra_baggage_kg > 0 && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  +{benefits.benefits.extra_baggage_kg}kg Baggage
                </h3>
                <p className="text-sm text-gray-600">Free extra baggage allowance</p>
              </div>
            </div>
          )}

          {benefits.benefits.dedicated_support && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Dedicated Support</h3>
                <p className="text-sm text-gray-600">Priority customer service</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Share & Earn</h3>
              <button
                onClick={() => setShowReferralModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {benefits.referral_code ? (
              <>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Your Referral Code</p>
                  <div className="flex items-center gap-3">
                    <code className="text-3xl font-bold text-indigo-600 flex-1">
                      {benefits.referral_code}
                    </code>
                    <button
                      onClick={copyReferralCode}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-2xl">🎁</span>
                    <div>
                      <p className="font-semibold text-gray-900">Your Friend Gets</p>
                      <p className="text-sm text-gray-600">50 bonus points on signup</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="font-semibold text-gray-900">You Get</p>
                      <p className="text-sm text-gray-600">
                        {benefits.benefits.referral_bonus_points} points per referral
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Generate your referral code to start earning</p>
                <button
                  onClick={handleGenerateReferralCode}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Generate Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyDashboard;
