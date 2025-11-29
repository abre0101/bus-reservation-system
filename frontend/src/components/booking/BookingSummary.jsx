import React from 'react'
import { MapPin, Calendar, Clock, User, Package } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/helpers'

const BookingSummary = ({ schedule, passenger, baggage, selectedSeats }) => {
  const baseFare = (schedule.fare || schedule.fareBirr) * selectedSeats.length
  const totalAmount = baseFare + (baggage?.baggage_fee || 0)

  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-white/30 relative overflow-hidden group">
      {/* Decorative gradient accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 flex items-center">
        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></span>
        Booking Summary
      </h2>

      <div className="space-y-6">
        {/* Route Information - Enhanced */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
          <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
            <MapPin className="h-6 w-6 mr-2 text-blue-600" />
            Journey Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">From</p>
                <p className="text-gray-900 font-bold">{schedule.originCity}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">To</p>
                <p className="text-gray-900 font-bold">{schedule.destinationCity}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Date</p>
                <p className="text-gray-900 font-bold">{formatDate(schedule.departure_date)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Time</p>
                <p className="text-gray-900 font-bold">{schedule.departure_time} - {schedule.arrival_time}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bus Information - Enhanced */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
          <h3 className="text-xl font-bold text-purple-900 mb-3">Bus Information 🚌</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 shadow-md">
            <p className="font-bold text-lg text-gray-900">{schedule.bus?.name || schedule.bus_name}</p>
            <p className="text-gray-700 font-semibold mt-2">Bus No: {schedule.bus?.number || schedule.bus_number}</p>
            <p className="text-gray-700 font-semibold">Type: {schedule.bus?.type || schedule.busType}</p>
          </div>
        </div>

        {/* Passenger Information - Enhanced */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg">
          <h3 className="text-xl font-bold text-green-900 mb-3 flex items-center">
            <User className="h-6 w-6 mr-2 text-green-600" />
            Passenger Details
          </h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 shadow-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">{passenger.passenger_name}</p>
                <p className="text-gray-700 font-semibold">{passenger.passenger_phone}</p>
                {passenger.passenger_email && (
                  <p className="text-gray-700 font-semibold">{passenger.passenger_email}</p>
                )}
              </div>
            </div>
            <div className="border-t-2 border-green-200 pt-4">
              <p className="font-bold text-gray-900 mb-2">Selected Seats</p>
              <div className="flex flex-wrap gap-2">
                {selectedSeats.sort((a, b) => a - b).map(seat => (
                  <span key={seat} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md">
                    {seat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Baggage Information - Enhanced */}
        {baggage?.has_baggage && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200 shadow-lg">
            <h3 className="text-xl font-bold text-orange-900 mb-3 flex items-center">
              <Package className="h-6 w-6 mr-2 text-orange-600" />
              Baggage Details
            </h3>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Weight: {baggage.baggage_weight}kg</p>
                  <p className="text-gray-700 font-semibold">Fee: {formatCurrency(baggage.baggage_fee)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Breakdown - Enhanced */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 shadow-lg">
          <h3 className="text-xl font-bold text-indigo-900 mb-3">Price Breakdown 💰</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 shadow-md">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-gray-700">Base Fare ({selectedSeats.length} seats):</span>
                <span className="font-bold text-gray-900 text-lg">{formatCurrency(baseFare)}</span>
              </div>
              {baggage?.has_baggage && (
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Baggage Fee:</span>
                  <span className="font-bold text-gray-900 text-lg">{formatCurrency(baggage.baggage_fee)}</span>
                </div>
              )}
              <div className="border-t-2 border-indigo-200 pt-4 flex justify-between items-center">
                <span className="font-bold text-xl text-gray-900">Total Amount:</span>
                <span className="font-bold text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingSummary