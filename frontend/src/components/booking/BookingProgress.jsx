// src/components/booking/BookingProgress.jsx
import React from 'react'
import { CheckCircle, Circle } from 'lucide-react'

const BookingProgress = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Seats', path: 'seat-selection' },
    { number: 2, label: 'Passengers', path: 'passenger-details' },
    { number: 3, label: 'Baggage', path: 'baggage' },
    { number: 4, label: 'Payment', path: 'payment' },
    { number: 5, label: 'Confirm', path: 'confirmation' }
  ]

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border-2 border-white/60">
        {/* Desktop View */}
        <div className="hidden md:flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                    step.number < currentStep
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg'
                      : step.number === currentStep
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl ring-4 ring-blue-200 scale-110'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.number < currentStep ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-semibold ${
                    step.number === currentStep
                      ? 'text-blue-600'
                      : step.number < currentStep
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 relative">
                  <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-500 ${
                      step.number < currentStep
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 w-full'
                        : 'bg-gray-200 w-0'
                    }`}
                  ></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-600">
              Step {currentStep} of {steps.length}
            </div>
            <div className="text-sm font-bold text-blue-600">
              {steps[currentStep - 1]?.label}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
          </div>

          {/* Step Labels */}
          <div className="flex justify-between mt-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex flex-col items-center ${
                  step.number === currentStep ? 'scale-110' : 'scale-90'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : step.number === currentStep
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step.number < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${
                    step.number === currentStep
                      ? 'text-blue-600'
                      : step.number < currentStep
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingProgress
