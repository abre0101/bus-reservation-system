import { useState } from 'react';
import { Copy, Check, Users, Gift } from 'lucide-react';
import { toast } from 'react-toastify';

const ReferralCard = ({ code, totalReferrals, bonusPerReferral, tier }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = `${window.location.origin}/signup?ref=${code}`;

  const handleShare = (platform) => {
    const message = `Join EthioBus with my referral code ${code} and get 50 bonus points! ${shareUrl}`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl shadow-md">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Refer & Earn</h3>
          <p className="text-sm text-gray-600">Share your code and earn points</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-purple-300">
        <p className="text-xs text-gray-600 mb-2 font-medium">Your Referral Code</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-purple-600 tracking-wider">{code}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600 font-medium">Total Referrals</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{totalReferrals}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600 font-medium">Points Earned</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{totalReferrals * bonusPerReferral}</p>
        </div>
      </div>

      {/* Bonus Info */}
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-4 border border-purple-300">
        <p className="text-sm text-purple-900 font-medium mb-2">
          <strong>Earn {bonusPerReferral} points</strong> for each friend who signs up!
        </p>
        <p className="text-xs text-purple-700">
          Your friend gets <strong>50 bonus points</strong> too when they use your code.
        </p>
      </div>

      {/* Share Buttons */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 font-medium mb-2">Share via:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <span>📱</span>
            WhatsApp
          </button>
          <button
            onClick={() => handleShare('telegram')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <span>✈️</span>
            Telegram
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <span>📘</span>
            Facebook
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium"
          >
            <span>🐦</span>
            Twitter
          </button>
        </div>
      </div>

      {/* Tier Note */}
      {tier === 'member' && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            💡 <strong>Tip:</strong> Reach Bronze tier or higher to unlock referral bonuses!
          </p>
        </div>
      )}
    </div>
  );
};

export default ReferralCard;
