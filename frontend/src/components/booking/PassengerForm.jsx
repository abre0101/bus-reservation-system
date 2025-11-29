// src/components/booking/PassengerForm.jsx
import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import BookingProgress from './BookingProgress'
import { User, Phone, Mail, ArrowRight, Users, AlertCircle, ClipboardList } from 'lucide-react'
import { validatePhone, validateEmail } from '../../utils/validators'
import { toast } from 'react-toastify'

const PassengerForm = ({ onSubmit, defaultValues = {}, loading = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get passenger count from location state or session storage
  const passengerCount = location.state?.passengerCount || 
                        parseInt(sessionStorage.getItem('passengerCount') || '1')
  
  const schedule = location.state?.schedule || JSON.parse(sessionStorage.getItem('selectedSchedule') || '{}')
  const selectedSeats = location.state?.selectedSeats || JSON.parse(sessionStorage.getItem('selectedSeats') || '[]')
  const baseFare = location.state?.baseFare || parseFloat(sessionStorage.getItem('baseFare') || '0')
  
  // Get passenger data from location state or session storage
  const passengersFromState = location.state?.passengers || 
                               (sessionStorage.getItem('passengerData') ? 
                                JSON.parse(sessionStorage.getItem('passengerData')) : null)

  console.log('👥 PassengerForm initialized with:', {
    passengerCount,
    selectedSeats,
    schedule,
    baseFare,
    passengersFromState
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      passengers: Array.from({ length: passengerCount }, (_, index) => ({
        name: passengersFromState?.[`passenger_${index}_name`] || defaultValues[`passenger_${index}_name`] || '',
        phone: passengersFromState?.[`passenger_${index}_phone`] || defaultValues[`passenger_${index}_phone`] || '',
        email: passengersFromState?.[`passenger_${index}_email`] || defaultValues[`passenger_${index}_email`] || '',
        seatNumber: selectedSeats[index] || ''
      }))
    },
    mode: 'onTouched'
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers"
  })

  // Initialize form with passenger count
  useEffect(() => {
    // Ensure we have the correct number of passengers
    if (fields.length < passengerCount) {
      // Add missing passengers
      for (let i = fields.length; i < passengerCount; i++) {
        append({
          name: '',
          phone: '',
          email: '',
          seatNumber: selectedSeats[i] || ''
        })
      }
    } else if (fields.length > passengerCount) {
      // Remove extra passengers
      for (let i = fields.length - 1; i >= passengerCount; i--) {
        remove(i)
      }
    }
  }, [passengerCount, fields.length, append, remove, selectedSeats])

  const handleFormSubmit = (data) => {
    console.log('📋 Passenger form data:', data)
    
    // Validate all passengers have names and phones
    const invalidPassengers = data.passengers.filter(p => !p.name.trim() || !p.phone.trim())
    if (invalidPassengers.length > 0) {
      toast.error('Please fill in name and phone for all passengers')
      return
    }

    // Get existing booking data
    const storedSchedule = sessionStorage.getItem('selectedSchedule')
    const storedSeats = sessionStorage.getItem('selectedSeats')
    
    if (!storedSchedule || !storedSeats) {
      toast.error('Please select seats first.')
      navigate('/seats')
      return
    }

    try {
      const schedule = JSON.parse(storedSchedule)
      const selectedSeats = JSON.parse(storedSeats)
      
      // Transform passenger data for storage
      const passengerData = {}
      data.passengers.forEach((passenger, index) => {
        passengerData[`passenger_${index}_name`] = passenger.name
        passengerData[`passenger_${index}_phone`] = passenger.phone
        passengerData[`passenger_${index}_email`] = passenger.email
        passengerData[`passenger_${index}_seat`] = passenger.seatNumber || selectedSeats[index]
      })

      // Store passenger data in session storage
      sessionStorage.setItem('passengerData', JSON.stringify(passengerData))
      sessionStorage.setItem('baseFare', baseFare.toString())
      
      console.log('💾 Stored passenger data:', {
        passengers: passengerData,
        schedule: schedule,
        seats: selectedSeats,
        baseFare: baseFare,
        passengerCount: passengerCount
      })

      // Safe onSubmit handling
      if (typeof onSubmit === 'function') {
        onSubmit(passengerData)
      } else {
        console.log('📦 No onSubmit provided, navigating to baggage page')
        navigate('/booking/baggage', {
          state: {
            schedule: schedule,
            selectedSeats: selectedSeats,
            passengers: passengerData,
            baseFare: baseFare,
            passengerCount: passengerCount
          }
        })
      }
    } catch (error) {
      console.error('❌ Error processing passenger data:', error)
      toast.error('Error processing your data. Please try again.')
    }
  }

  // Load initial data from session storage if no defaultValues provided
  React.useEffect(() => {
    if (Object.keys(defaultValues).length === 0) {
      try {
        const storedPassenger = sessionStorage.getItem('passengerData')
        if (storedPassenger) {
          const passengerData = JSON.parse(storedPassenger)
          console.log('📥 Loaded passenger data from session:', passengerData)
          
          // Populate form fields with stored data
          for (let i = 0; i < passengerCount; i++) {
            if (passengerData[`passenger_${i}_name`]) {
              setValue(`passengers.${i}.name`, passengerData[`passenger_${i}_name`])
            }
            if (passengerData[`passenger_${i}_phone`]) {
              setValue(`passengers.${i}.phone`, passengerData[`passenger_${i}_phone`])
            }
            if (passengerData[`passenger_${i}_email`]) {
              setValue(`passengers.${i}.email`, passengerData[`passenger_${i}_email`])
            }
            if (selectedSeats[i]) {
              setValue(`passengers.${i}.seatNumber`, selectedSeats[i])
            }
          }
          console.log('✅ Form populated with stored passenger data')
        }
      } catch (error) {
        console.error('Error loading stored passenger data:', error)
      }
    }
  }, [defaultValues, passengerCount, setValue, selectedSeats])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 py-12">
      {/* Elegant Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4">
      {/* Booking Progress */}
      <BookingProgress currentStep={2} />

      <div className="relative group animate-slide-up">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-20 group-hover:opacity-30 blur-lg transition duration-500"></div>
        <div className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/60">
        {/* Header - Enhanced */}
        <div className="mb-8">
          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <button
              type="button"
              onClick={() => navigate('/booking/seats', {
                state: {
                  schedule: schedule,
                  bookingData: { passengers: passengerCount },
                  selectedSeats: selectedSeats
                }
              })}
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-all bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-xl font-semibold"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Seats</span>
            </button>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-blue-500/50 transform hover:scale-110 transition-transform duration-300">
              <Users className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Passenger Information
            </h2>
            <p className="text-gray-600 text-lg font-medium">
              Enter details for <span className="font-bold text-gray-900">{passengerCount}</span> passenger{passengerCount !== 1 ? 's' : ''}
            </p>
          </div>
          {selectedSeats.length > 0 && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-sm font-bold text-green-700">
                Selected Seats: {selectedSeats.sort((a, b) => a - b).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Booking Summary - Enhanced */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 mb-8 shadow-xl hover:shadow-2xl transition-all">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-blue-900 text-xl">
                  Booking Summary
                </h3>
              </div>
              <p className="text-blue-900 font-bold text-lg mb-2">
                {schedule.originCity} → {schedule.destinationCity}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg font-semibold text-blue-800 border border-blue-200">
                  📅 {schedule.departure_date}
                </span>
                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg font-semibold text-blue-800 border border-blue-200">
                  👥 {passengerCount} passenger{passengerCount !== 1 ? 's' : ''}
                </span>
                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg font-semibold text-blue-800 border border-blue-200">
                  💺 {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="text-center md:text-right bg-white/90 backdrop-blur-sm px-8 py-5 rounded-2xl shadow-lg border-2 border-green-200">
              <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {baseFare} ETB
              </p>
              <p className="text-sm text-gray-600 font-bold mt-1">Total Fare</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Dynamic Passenger Forms - Enhanced */}
          {fields.map((field, index) => (
            <div key={field.id} className="border-2 border-blue-300 rounded-2xl p-7 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-blue-400">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Passenger {index + 1}
                  </h3>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg border-2 border-green-400">
                  💺 Seat {selectedSeats[index] || index + 1}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Passenger Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-1.5 text-blue-600" />
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md ${
                        errors.passengers?.[index]?.name 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 bg-white'
                      }`}
                      placeholder="Enter full name"
                      {...register(`passengers.${index}.name`, {
                        required: 'Full name is required',
                        minLength: {
                          value: 2,
                          message: 'Name must be at least 2 characters'
                        },
                        pattern: {
                          value: /^[a-zA-Z\s]+$/,
                          message: 'Name can only contain letters and spaces'
                        }
                      })}
                    />
                  </div>
                  {errors.passengers?.[index]?.name && (
                    <p className="mt-2 text-sm text-red-600 font-semibold flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.passengers[index].name.message}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <Phone className="h-4 w-4 mr-1.5 text-blue-600" />
                    Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md ${
                        errors.passengers?.[index]?.phone 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 bg-white'
                      }`}
                      placeholder="+251 911 223 344"
                      {...register(`passengers.${index}.phone`, {
                        required: 'Phone number is required',
                        validate: validatePhone,
                        pattern: {
                          value: /^(\+251|0)(9\d{8})$/,
                          message: 'Please enter a valid Ethiopian phone number'
                        }
                      })}
                    />
                  </div>
                  {errors.passengers?.[index]?.phone && (
                    <p className="mt-2 text-sm text-red-600 font-semibold flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.passengers[index].phone.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-600 font-medium">
                    📱 Format: +251 XXX XXX XXX or 09XXXXXXXX
                  </p>
                </div>

                {/* Email (Optional) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <Mail className="h-4 w-4 mr-1.5 text-blue-600" />
                    Email Address <span className="text-gray-500 font-normal ml-1">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md ${
                        errors.passengers?.[index]?.email 
                          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 bg-white'
                      }`}
                      placeholder="email@example.com"
                      {...register(`passengers.${index}.email`, {
                        validate: (value) => {
                          if (!value) return true // Optional field
                          return validateEmail(value) || 'Please enter a valid email address'
                        }
                      })}
                    />
                  </div>
                  {errors.passengers?.[index]?.email && (
                    <p className="mt-2 text-sm text-red-600 font-semibold flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.passengers[index].email.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-600 font-medium">
                    ✉️ For electronic ticket and receipts (optional)
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Additional Information */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-blue-900 text-lg">
                Important Information
              </h4>
            </div>
            <div className="text-sm text-blue-900 space-y-2.5 font-medium">
              <p className="flex items-start">
                <span className="text-blue-600 mr-2 font-bold">📱</span>
                Your ticket will be sent via SMS to each passenger
              </p>
              <p className="flex items-start">
                <span className="text-blue-600 mr-2 font-bold">🔔</span>
                Keep your phone accessible for updates
              </p>
              <p className="flex items-start">
                <span className="text-blue-600 mr-2 font-bold">🪪</span>
                Present ID matching passenger name at boarding
              </p>
              <p className="flex items-start">
                <span className="text-blue-600 mr-2 font-bold">✅</span>
                Each passenger must provide valid identification
              </p>
            </div>
          </div>

          {/* Submit Button - Enhanced */}
          <div className="flex justify-end pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="relative flex items-center justify-center px-12 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-600/60 transform hover:scale-105 hover:-translate-y-1 disabled:transform-none min-w-[260px] text-lg overflow-hidden group border-2 border-blue-400"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <span className="relative z-10 flex items-center">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Baggage
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
      </div>
      </div>
    </div>
  )
}

export default PassengerForm
