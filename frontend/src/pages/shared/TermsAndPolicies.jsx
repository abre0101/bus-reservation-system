import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Gift, 
  Star,
  AlertCircle,
  Info,
  Shield,
  FileText,
  Award,
  Ban
} from 'lucide-react'

const TermsAndPolicies = () => {
  const [activeSection, setActiveSection] = useState('checkin')

  const sections = [
    { id: 'checkin', label: 'Check-in Policy', icon: CheckCircle },
    { id: 'cancellation', label: 'Cancellation Policy', icon: XCircle },
    { id: 'loyalty', label: 'Loyalty Program', icon: Gift },
    { id: 'booking', label: 'Booking Status', icon: FileText },
    { id: 'refund', label: 'Refund Policy', icon: DollarSign },
    { id: 'terms', label: 'Terms of Service', icon: Shield }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4">
          <Link 
            to="/" 
            className="inline-flex items-center space-x-2 text-blue-100 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold mb-3">Terms & Policies</h1>
          <p className="text-blue-100 text-lg">Everything you need to know about our services</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Navigation</h3>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Check-in Policy */}
              {activeSection === 'checkin' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Check-in Policy</h2>
                      <p className="text-gray-600">Online and station check-in guidelines</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Online Check-in Window</h4>
                        <p className="text-blue-800 text-sm">Check-in opens 24 hours before departure and closes 1 hour before departure</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Check-in Requirements</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Valid booking with confirmed payment status</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Government-issued photo ID matching passenger name</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Booking PNR number or QR code</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                    <div className="flex items-start space-x-3">
                      <Ban className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-900 mb-1">Check-in Restrictions</h4>
                        <ul className="text-orange-800 text-sm space-y-1">
                          <li>• Check-in is disabled if you have a pending cancellation request</li>
                          <li>• Once checked in, you cannot request cancellation</li>
                          <li>• Arrive at boarding point at least 30 minutes before departure</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              {activeSection === 'cancellation' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Cancellation Policy</h2>
                      <p className="text-gray-600">Tiered refund system based on cancellation time</p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-1">Important Notice</h4>
                        <p className="text-yellow-800 text-sm">All cancellation requests require operator approval. Refunds are processed within 5-7 business days.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Refund Tiers</h3>
                    
                    <div className="grid gap-4">
                      {/* 100% Refund */}
                      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-green-900">100% Refund</h4>
                          <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">Best</span>
                        </div>
                        <p className="text-green-800 text-sm mb-2">Cancel 48+ hours before departure</p>
                        <p className="text-green-700 text-xs">Full refund of booking amount</p>
                      </div>

                      {/* 70% Refund */}
                      <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-blue-900">70% Refund</h4>
                          <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">Good</span>
                        </div>
                        <p className="text-blue-800 text-sm mb-2">Cancel 24-48 hours before departure</p>
                        <p className="text-blue-700 text-xs">30% cancellation fee applies</p>
                      </div>

                      {/* 50% Refund */}
                      <div className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-yellow-900">50% Refund</h4>
                          <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-semibold">Fair</span>
                        </div>
                        <p className="text-yellow-800 text-sm mb-2">Cancel 6-24 hours before departure</p>
                        <p className="text-yellow-700 text-xs">50% cancellation fee applies</p>
                      </div>

                      {/* 30% Refund */}
                      <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-orange-900">30% Refund</h4>
                          <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-sm font-semibold">Limited</span>
                        </div>
                        <p className="text-orange-800 text-sm mb-2">Cancel 3-6 hours before departure</p>
                        <p className="text-orange-700 text-xs">70% cancellation fee applies</p>
                      </div>

                      {/* No Refund */}
                      <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-red-900">No Refund</h4>
                          <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">None</span>
                        </div>
                        <p className="text-red-800 text-sm mb-2">Less than 3 hours before departure</p>
                        <p className="text-red-700 text-xs">Cancellation not allowed</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-start space-x-3">
                      <Ban className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-1">Cancellation Restrictions</h4>
                        <ul className="text-red-800 text-sm space-y-1">
                          <li>• Cannot cancel after check-in - contact support for assistance</li>
                          <li>• Only one cancellation request allowed per booking</li>
                          <li>• Check-in is disabled while cancellation request is pending</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loyalty Program */}
              {activeSection === 'loyalty' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Gift className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Loyalty Program</h2>
                      <p className="text-gray-600">Earn points and enjoy exclusive benefits</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Loyalty Tiers</h3>
                    
                    <div className="grid gap-4">
                      {/* Bronze */}
                      <div className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-5">
                        <div className="flex items-center space-x-3 mb-3">
                          <Award className="h-6 w-6 text-orange-600" />
                          <h4 className="font-bold text-orange-900 text-lg">Bronze Tier</h4>
                        </div>
                        <p className="text-orange-800 text-sm mb-3">0 - 999 points</p>
                        <ul className="space-y-2 text-sm text-orange-900">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-orange-600" />
                            <span>5% discount on bookings</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-orange-600" />
                            <span>Earn 100 points per booking</span>
                          </li>
                        </ul>
                      </div>

                      {/* Silver */}
                      <div className="border-2 border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-5">
                        <div className="flex items-center space-x-3 mb-3">
                          <Award className="h-6 w-6 text-gray-600" />
                          <h4 className="font-bold text-gray-900 text-lg">Silver Tier</h4>
                        </div>
                        <p className="text-gray-800 text-sm mb-3">1,000 - 2,999 points</p>
                        <ul className="space-y-2 text-sm text-gray-900">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-gray-600" />
                            <span>10% discount on bookings</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-gray-600" />
                            <span>Priority boarding</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-gray-600" />
                            <span>Free seat selection</span>
                          </li>
                        </ul>
                      </div>

                      {/* Gold */}
                      <div className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-5">
                        <div className="flex items-center space-x-3 mb-3">
                          <Award className="h-6 w-6 text-yellow-600" />
                          <h4 className="font-bold text-yellow-900 text-lg">Gold Tier</h4>
                        </div>
                        <p className="text-yellow-800 text-sm mb-3">3,000 - 4,999 points</p>
                        <ul className="space-y-2 text-sm text-yellow-900">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-yellow-600" />
                            <span>15% discount on bookings</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-yellow-600" />
                            <span>Priority boarding + free seat selection</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-yellow-600" />
                            <span>+5kg extra baggage allowance</span>
                          </li>
                        </ul>
                      </div>

                      {/* Platinum */}
                      <div className="border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-5">
                        <div className="flex items-center space-x-3 mb-3">
                          <Star className="h-6 w-6 text-indigo-600" />
                          <h4 className="font-bold text-indigo-900 text-lg">Platinum Tier</h4>
                        </div>
                        <p className="text-indigo-800 text-sm mb-3">5,000+ points</p>
                        <ul className="space-y-2 text-sm text-indigo-900">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                            <span>20% discount on bookings</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                            <span>All Gold benefits</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                            <span>+10kg extra baggage allowance</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                            <span>1 free trip every 10 bookings (max 1000 ETB)</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Status */}
              {activeSection === 'booking' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Booking Status Guide</h2>
                      <p className="text-gray-600">Understanding your booking status</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
                      <h4 className="font-semibold text-yellow-900 mb-2">Pending</h4>
                      <p className="text-yellow-800 text-sm">Payment is being processed. Your seats are temporarily reserved.</p>
                    </div>

                    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Confirmed</h4>
                      <p className="text-green-800 text-sm">Payment successful. Your booking is confirmed and seats are reserved.</p>
                    </div>

                    <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Checked In</h4>
                      <p className="text-blue-800 text-sm">You have completed online check-in. Present your ticket at boarding.</p>
                    </div>

                    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                      <h4 className="font-semibold text-red-900 mb-2">Cancelled</h4>
                      <p className="text-red-800 text-sm">Booking has been cancelled. Refund processed according to cancellation policy.</p>
                    </div>

                    <div className="border-l-4 border-gray-500 bg-gray-50 p-4 rounded">
                      <h4 className="font-semibold text-gray-900 mb-2">Completed</h4>
                      <p className="text-gray-800 text-sm">Journey completed. Thank you for traveling with us!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Policy */}
              {activeSection === 'refund' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Refund Policy</h2>
                      <p className="text-gray-600">How and when you'll receive your refund</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">Refund Processing</h3>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Processing Time</h4>
                      <p className="text-blue-800 text-sm">Refunds are processed within 5-7 business days after operator approval.</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Refund Methods</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Original Payment Method</p>
                            <p className="text-gray-600 text-sm">Refund to the same payment method used for booking</p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Bank Transfer</p>
                            <p className="text-gray-600 text-sm">Direct transfer to your bank account (requires verification)</p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Mobile Money</p>
                            <p className="text-gray-600 text-sm">TeleBirr, CBE Birr, or HelloCash refund</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms of Service */}
              {activeSection === 'terms' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Shield className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Terms of Service</h2>
                      <p className="text-gray-600">General terms and conditions</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-gray-700">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Booking Agreement</h3>
                      <p className="text-sm">By making a booking, you agree to our terms and conditions. All bookings are subject to availability and confirmation.</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Passenger Responsibilities</h3>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Arrive at boarding point 30 minutes before departure</li>
                        <li>• Carry valid government-issued photo ID</li>
                        <li>• Ensure baggage complies with weight limits</li>
                        <li>• Follow driver and staff instructions</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Liability</h3>
                      <p className="text-sm">EthioBus is not liable for delays caused by weather, traffic, or other circumstances beyond our control. We recommend travel insurance for added protection.</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Privacy</h3>
                      <p className="text-sm">We protect your personal information and use it only for booking and service purposes. We do not share your data with third parties without consent.</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Changes to Terms</h3>
                      <p className="text-sm">We reserve the right to update these terms. Continued use of our services constitutes acceptance of updated terms.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                    <p className="text-sm text-gray-600">
                      Last updated: December 2024. For questions or concerns, contact us at{' '}
                      <a href="mailto:support@ethiobus.com" className="text-blue-600 hover:underline">
                        support@ethiobus.com
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsAndPolicies
