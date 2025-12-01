import { useState, useEffect } from 'react';
import { TrendingUp, Gift, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const BookingDiscount = ({ basePrice, onDiscountApplied, onFreeTripSelected }) => {
  const [loading, setLoading] = useState(true);
  const [discount, setDiscount] = useState(null);
  const [freeTripEligibility, setFreeTripEligibility] = useState(null);
  const [useFreeTripChecked, setUseFreeTripChecked] = useState(false);

  useEffect(() => {
    if (basePrice) {
      fetchDiscount();
      checkFreeTripEligibility();
    }
  }, [basePrice]);

  const fetchDiscount = async () => {
    try {
      const response = await api.post('/api/loyalty/apply-discount', {
        base_price: basePrice
      });
      setDiscount(response.data);
      if (onDiscountApplied && !useFreeTripChecked) {
        onDiscountApplied(response.data);
      }
    } catch (error) {
      console.error('Error fetching discount:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFreeTripEligibility = async () => {
    try {
      const response = await api.post('/api/loyalty/check-free-trip', {
        booking_amount: basePrice
      });
      setFreeTripEligibility(response.data);
    } catch (error) {
      console.error('Error checking free trip:', error);
    }
  };

  const handleFreeTripToggle = (checked) => {
    setUseFreeTripChecked(checked);
    if (onFreeTripSelected) {
      onFreeTripSelected(checked);
    }
    if (onDiscountApplied) {
      if (checked) {
        // Free trip selected, no discount
        onDiscountApplied({ final_price: 0, discount_amount: basePrice });
      } else {
        // Use tier discount
        onDiscountApplied(discount);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!discount) return null;

  const tierColors = {
    member: 'blue',
    bronze: 'orange',
    silver: 'gray',
    gold: 'yellow'
  };

  const color = tierColors[discount.tier] || 'blue';

  return (
    <div className="space-y-4">
      {/* Tier Discount */}
      {discount.discount_percentage > 0 && !useFreeTripChecked && (
        <div className={`bg-gradient-to-r from-${color}-50 to-${color}-100 rounded-xl p-4 border-2 border-${color}-200`}>
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br from-${color}-400 to-${color}-500 rounded-full flex items-center justify-center flex-shrink-0`}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 capitalize">
                  {discount.tier} Member Discount
                </h3>
                <span className={`text-${color}-600 font-bold text-lg`}>
                  -{discount.discount_percentage}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Your loyalty discount has been applied automatically
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Original Price:</span>
                <span className="line-through text-gray-500">{basePrice.toLocaleString()} ETB</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold mt-1">
                <span className="text-gray-900">Discounted Price:</span>
                <span className="text-green-600 text-lg">{discount.final_price.toLocaleString()} ETB</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  You save: <span className="font-semibold text-green-600">{discount.discount_amount.toLocaleString()} ETB</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Trip Option */}
      {freeTripEligibility?.can_use && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">Use Free Trip</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFreeTripChecked}
                    onChange={(e) => handleFreeTripToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                You have {freeTripEligibility.remaining_trips} free trip(s) remaining
              </p>
              {useFreeTripChecked ? (
                <div className="bg-white rounded-lg p-3 mt-2">
                  <p className="text-sm font-semibold text-green-600 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Free trip applied! This booking is FREE
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Original price: {basePrice.toLocaleString()} ETB
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Max value: {freeTripEligibility.max_value} ETB per trip
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Free Trip Not Available */}
      {freeTripEligibility && !freeTripEligibility.can_use && freeTripEligibility.reason && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">{freeTripEligibility.reason}</p>
              {freeTripEligibility.excess_amount && (
                <p className="text-xs text-gray-500 mt-1">
                  This booking exceeds the free trip limit by {freeTripEligibility.excess_amount} ETB
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDiscount;
