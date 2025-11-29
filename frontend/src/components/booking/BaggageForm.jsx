import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BookingProgress from './BookingProgress'
import { Package, Scale, ArrowRight, ArrowLeft, Users, Loader, Info, AlertCircle } from 'lucide-react'
import { bookingService } from '../../services/bookingService'
import { toast } from 'react-toastify'

const BaggageForm = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Get data from location state or session storage
  const schedule = location.state?.schedule || JSON.parse(sessionStorage.getItem('selectedSchedule') || '{}')
  const selectedSeats = location.state?.selectedSeats || JSON.parse(sessionStorage.getItem('selectedSeats') || '[]')
  const passengers = location.state?.passengers || JSON.parse(sessionStorage.getItem('passengerData') || '{}')
  const baseFare = location.state?.baseFare || parseFloat(sessionStorage.getItem('baseFare') || '0')
  const passengerCount = location.state?.passengerCount || parseInt(sessionStorage.getItem('passengerCount') || '1')

  const [baggageData, setBaggageData] = useState([])
  const [baggagePolicy, setBaggagePolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totalBaggageFee, setTotalBaggageFee] = useState(0)

  console.log('🎒 BaggageForm initialized with:', {
    passengerCount,
    selectedSeats: selectedSeats.length,
    hasPassengers: !!passengers,
    baseFare,
    locationState: location.state,
    sessionStorage: {
      schedule: !!sessionStorage.getItem('selectedSchedule'),
      seats: !!sessionStorage.getItem('selectedSeats'),
      passengers: !!sessionStorage.getItem('passengerData'),
      baggageData: !!sessionStorage.getItem('baggageData')
    }
  })

  useEffect(() => {
    const initializeBaggageData = async () => {
      try {
        setLoading(true)
        
        // Validate we have the required data
        if (!schedule || !selectedSeats.length) {
          console.error('❌ Missing required data')
          toast.error('Missing booking information. Please start over.')
          navigate('/search')
          return
        }

        // Fetch baggage policy
        console.log('📦 Fetching baggage policy...')
        const policyResponse = await bookingService.getBaggagePolicy()
        console.log('✅ Baggage policy:', policyResponse)
        setBaggagePolicy(policyResponse)

        // Check if there's existing baggage data in session storage
        const storedBaggageData = sessionStorage.getItem('baggageData')
        const storedTotalBaggageFee = sessionStorage.getItem('totalBaggageFee')
        
        if (storedBaggageData) {
          // Restore previous baggage selections
          console.log('📥 Restoring baggage data from session storage')
          const parsedBaggageData = JSON.parse(storedBaggageData)
          
          // Reconstruct the baggage data array from stored data
          const restoredBaggageData = Array.from({ length: passengerCount }, (_, index) => {
            const storedItem = parsedBaggageData.baggage_items?.[index]
            return {
              passengerIndex: index,
              passengerName: passengers[`passenger_${index}_name`] || `Passenger ${index + 1}`,
              seatNumber: selectedSeats[index] || `Seat ${index + 1}`,
              hasBaggage: storedItem?.hasBaggage || false,
              baggageWeight: storedItem?.baggageWeight || 0,
              baggageFee: storedItem?.baggageFee || 0
            }
          })
          
          console.log('✅ Restored baggage data:', restoredBaggageData)
          setBaggageData(restoredBaggageData)
          
          if (storedTotalBaggageFee) {
            setTotalBaggageFee(parseFloat(storedTotalBaggageFee))
          }
        } else {
          // Initialize fresh baggage data for each passenger
          const initialBaggageData = Array.from({ length: passengerCount }, (_, index) => ({
            passengerIndex: index,
            passengerName: passengers[`passenger_${index}_name`] || `Passenger ${index + 1}`,
            seatNumber: selectedSeats[index] || `Seat ${index + 1}`,
            hasBaggage: false,
            baggageWeight: 0,
            baggageFee: 0
          }))

          console.log('📋 Initial baggage data:', initialBaggageData)
          setBaggageData(initialBaggageData)
        }
        
      } catch (error) {
        console.error('❌ Error initializing baggage data:', error)
        toast.error('Failed to load baggage information')
      } finally {
        setLoading(false)
      }
    }

    initializeBaggageData()
  }, [passengerCount, passengers, selectedSeats, schedule, navigate])

  // Save baggage data to session storage whenever it changes
  useEffect(() => {
    if (baggageData.length > 0) {
      const completeBaggageData = {
        has_baggage: baggageData.some(item => item.hasBaggage),
        baggage_weight: baggageData.reduce((total, item) => total + item.baggageWeight, 0),
        baggage_fee: totalBaggageFee,
        baggage_items: baggageData
      }
      sessionStorage.setItem('baggageData', JSON.stringify(completeBaggageData))
      sessionStorage.setItem('totalBaggageFee', totalBaggageFee.toString())
      console.log('💾 Saved baggage data to session:', completeBaggageData)
    }
  }, [baggageData, totalBaggageFee])

  // Simple and straightforward fee calculation
  const calculateBaggageFee = (weight) => {
    if (weight <= 15) return 0      // Free up to 15kg
    if (weight <= 25) return 50     // 50 ETB for 16-25kg
    if (weight <= 35) return 100    // 100 ETB for 26-35kg
    return 150                      // 150 ETB for 36-40kg
  }

  const handleBaggageToggle = (index, hasBaggage) => {
    const updatedData = [...baggageData]
    updatedData[index] = {
      ...updatedData[index],
      hasBaggage,
      baggageWeight: hasBaggage ? 15 : 0, // Default to free allowance
      baggageFee: hasBaggage ? 0 : 0
    }
    setBaggageData(updatedData)
    updateTotalFee(updatedData)
  }

  const handleWeightChange = (index, weight) => {
    const fee = calculateBaggageFee(weight)
    
    const updatedData = [...baggageData]
    updatedData[index] = {
      ...updatedData[index],
      baggageWeight: weight,
      baggageFee: fee
    }
    setBaggageData(updatedData)
    updateTotalFee(updatedData)
  }

  const updateTotalFee = (data) => {
    const total = data.reduce((sum, item) => sum + item.baggageFee, 0)
    setTotalBaggageFee(total)
  }

  const handleContinue = () => {
    console.log('🚀 Continue to Payment clicked')
    
    // Validate that we have all required data
    if (!schedule || !selectedSeats.length || !passengers) {
      console.error('❌ Missing required data for payment:', {
        schedule: !!schedule,
        selectedSeats: selectedSeats.length,
        passengers: !!passengers
      })
      toast.error('Missing booking information. Please go back and try again.')
      return
    }

    // Prepare complete baggage information
    const completeBaggageData = {
      has_baggage: baggageData.some(item => item.hasBaggage),
      baggage_weight: baggageData.reduce((total, item) => total + item.baggageWeight, 0),
      baggage_fee: totalBaggageFee,
      baggage_items: baggageData
    }

    // Store baggage data in session storage
    try {
      sessionStorage.setItem('baggageData', JSON.stringify(completeBaggageData))
      sessionStorage.setItem('totalBaggageFee', totalBaggageFee.toString())
      sessionStorage.setItem('totalAmount', (baseFare + totalBaggageFee).toString())

      console.log('💾 Baggage data stored:', completeBaggageData)
    } catch (error) {
      console.error('❌ Error storing baggage data:', error)
      toast.error('Error saving your baggage information. Please try again.')
      return
    }

    // Navigate to payment page
    console.log('📍 Navigating to payment page')
    navigate('/booking/payment', {
      replace: true // Prevent going back to baggage form
    })
  }

  const handleBack = () => {
    console.log('🔙 Back to Passengers clicked')
    
    // Get passenger data from session storage to pass it back
    const storedPassengerData = sessionStorage.getItem('passengerData')
    const passengerData = storedPassengerData ? JSON.parse(storedPassengerData) : passengers
    
    navigate('/booking/passenger-details', {
      state: {
        schedule: schedule,
        selectedSeats: selectedSeats,
        baseFare: baseFare,
        passengerCount: passengerCount,
        passengers: passengerData
      }
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md w-full">
          <div className="animate-pulse mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto">
              <Package className="h-10 w-10 text-white" />
            </div>
          </div>
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Loading Baggage Options</h3>
          <p className="text-gray-600 text-lg">
            Preparing baggage information for {passengerCount} passenger{passengerCount !== 1 ? 's' : ''}...
          </p>
        </div>
      </div>
    )
  }

  const totalAmount = baseFare + totalBaggageFee

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 py-8">
      {/* Elegant Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Booking Progress */}
        <BookingProgress currentStep={3} />

        {/* Header */}
        <div className="mb-12">
          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-all bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-xl font-semibold"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Passengers</span>
            </button>
          </div>

          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border-2 border-white/50">
              <Package className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Baggage Information
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
              Add baggage for <span className="font-bold text-blue-600">{passengerCount}</span> passenger{passengerCount !== 1 ? 's' : ''} traveling with you
            </p>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border-2 border-white/60">
          {/* Baggage Policy */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8 md:p-10">
            <div className="flex items-center mb-8">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <Info className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-bold drop-shadow-lg">Baggage Policy</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center mb-5">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-3">
                    <Scale className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold">Weight Allowance & Fees</h3>
                </div>
                <div className="space-y-5">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border-2 border-white/20 shadow-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-green-500/40 backdrop-blur-sm rounded-xl p-4 border-2 border-green-300/30 shadow-lg hover:scale-105 transition-transform">
                        <div className="text-2xl mb-1">🆓</div>
                        <div className="font-bold text-xl">≤15kg</div>
                        <div className="text-sm text-green-100 font-bold mt-1">FREE</div>
                      </div>
                      <div className="bg-yellow-500/40 backdrop-blur-sm rounded-xl p-4 border-2 border-yellow-300/30 shadow-lg hover:scale-105 transition-transform">
                        <div className="text-2xl mb-1">💰</div>
                        <div className="font-bold text-xl">16-25kg</div>
                        <div className="text-sm text-yellow-100 font-bold mt-1">50 ETB</div>
                      </div>
                      <div className="bg-orange-500/40 backdrop-blur-sm rounded-xl p-4 border-2 border-orange-300/30 shadow-lg hover:scale-105 transition-transform">
                        <div className="text-2xl mb-1">💵</div>
                        <div className="font-bold text-xl">26-35kg</div>
                        <div className="text-sm text-orange-100 font-bold mt-1">100 ETB</div>
                      </div>
                      <div className="bg-red-500/40 backdrop-blur-sm rounded-xl p-4 border-2 border-red-300/30 shadow-lg hover:scale-105 transition-transform">
                        <div className="text-2xl mb-1">💸</div>
                        <div className="font-bold text-xl">36-40kg</div>
                        <div className="text-sm text-red-100 font-bold mt-1">150 ETB</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                    <p className="font-bold mb-3 text-lg flex items-center">
                      <span className="text-2xl mr-2">📝</span>
                      How it works:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-green-300 mr-2 text-lg">✓</span>
                        <span>First 15kg is included free for all passengers</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-300 mr-2 text-lg">✓</span>
                        <span>Pay only for weight above 15kg</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-300 mr-2 text-lg">✓</span>
                        <span>Maximum allowed: 40kg per passenger</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center mb-5">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mr-3">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold">Important Notes</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                    <span className="text-2xl mr-3 flex-shrink-0">⚖️</span>
                    <span className="text-sm"><strong className="text-yellow-200">Maximum 40kg</strong> per passenger - excess baggage subject to availability</span>
                  </li>
                  <li className="flex items-start bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                    <span className="text-2xl mr-3 flex-shrink-0">⚠️</span>
                    <span className="text-sm"><strong className="text-yellow-200">Fragile items</strong> transported at your own risk</span>
                  </li>
                  <li className="flex items-start bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                    <span className="text-2xl mr-3 flex-shrink-0">🏀</span>
                    <span className="text-sm"><strong className="text-yellow-200">Sports equipment</strong> may have special fees - contact support</span>
                  </li>
                  <li className="flex items-start bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                    <span className="text-2xl mr-3 flex-shrink-0">🚫</span>
                    <span className="text-sm"><strong className="text-yellow-200">Prohibited items:</strong> Weapons, flammable materials, etc.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Passenger Baggage Forms */}
          <div className="p-8">
            <div className="space-y-6">
              {baggageData.map((passenger, index) => (
                <div key={index} className="bg-white/95 backdrop-blur-xl border-2 border-gray-200 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:border-orange-300">
                  {/* Passenger Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{passenger.passengerName}</h3>
                        <p className="text-gray-600 font-medium">Traveler {index + 1}</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg border-2 border-white/50">
                      🪑 Seat: {passenger.seatNumber}
                    </div>
                  </div>

                  {/* Baggage Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Baggage Toggle */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                        Has Checked Baggage?
                      </label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => handleBaggageToggle(index, true)}
                          className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold transition-all duration-200 text-lg ${
                            passenger.hasBaggage
                              ? 'bg-green-500 text-white border-green-600 shadow-lg transform scale-105'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          ✅ Yes, I have baggage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBaggageToggle(index, false)}
                          className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold transition-all duration-200 text-lg ${
                            !passenger.hasBaggage
                              ? 'bg-red-500 text-white border-red-600 shadow-lg transform scale-105'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          ❌ No baggage
                        </button>
                      </div>
                    </div>

                    {/* Weight Selection */}
                    {passenger.hasBaggage && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide flex items-center space-x-2">
                          <Scale className="h-4 w-4 text-orange-600" />
                          <span>⚖️ Select Baggage Weight</span>
                        </label>
                        <div className="relative">
                          <select
                            value={passenger.baggageWeight}
                            onChange={(e) => handleWeightChange(index, parseInt(e.target.value))}
                            className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-lg appearance-none bg-white cursor-pointer hover:border-orange-400 shadow-sm hover:shadow-md font-medium"
                          >
                            <option value={15}>15 kg (Free - Included)</option>
                            <option value={20}>20 kg (+50 ETB extra)</option>
                            <option value={25}>25 kg (+50 ETB extra)</option>
                            <option value={30}>30 kg (+100 ETB extra)</option>
                            <option value={35}>35 kg (+100 ETB extra)</option>
                            <option value={40}>40 kg (+150 ETB extra)</option>
                          </select>
                        </div>
                        {passenger.baggageFee > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 font-semibold text-center text-lg">
                              Additional Fee: {passenger.baggageFee} ETB
                            </p>
                            <p className="text-red-600 text-sm text-center mt-1">
                              (Weight above 15kg is charged)
                            </p>
                          </div>
                        )}
                        {passenger.baggageFee === 0 && passenger.hasBaggage && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-700 font-semibold text-center text-lg">
                              ✅ Free baggage included
                            </p>
                            <p className="text-green-600 text-sm text-center mt-1">
                              Your 15kg free allowance covers this weight
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Card */}
            <div className="mt-8 bg-white/95 backdrop-blur-xl rounded-2xl p-8 border-2 border-blue-200 shadow-2xl">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Booking Summary</h3>
              </div>
              <div className="space-y-4 text-lg">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Base Fare ({passengerCount} passenger{passengerCount !== 1 ? 's' : ''})</span>
                  <span className="font-bold text-gray-900">{baseFare.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Baggage Fee</span>
                  <span className={`font-bold ${totalBaggageFee > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {totalBaggageFee > 0 ? `+${totalBaggageFee.toLocaleString()} ETB` : 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t-4 border-blue-300">
                  <span className="text-xl font-bold text-gray-900">Total Amount</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{totalAmount.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col lg:flex-row justify-between gap-6 pt-8">
              <button
                onClick={handleBack}
                className="flex items-center justify-center px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-bold text-lg shadow-lg hover:shadow-xl order-2 lg:order-1"
              >
                <ArrowLeft className="h-5 w-5 mr-3" />
                Back to Passengers
              </button>
              <button
                onClick={handleContinue}
                className="relative flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 border-2 border-white/50 overflow-hidden order-1 lg:order-2 group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                <span className="relative">Continue to Payment</span>
                <ArrowRight className="h-6 w-6 ml-3 relative" />
              </button>
            </div>
          </div>
        </div>     
      </div>
    </div>
  )
}

export default BaggageForm