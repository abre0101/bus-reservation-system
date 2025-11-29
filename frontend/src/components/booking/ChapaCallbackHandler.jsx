// src/components/booking/ChapaCallbackHandler.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'
import { toast } from 'react-toastify'
import { CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react'

const ChapaCallbackHandler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)
  const [txRef, setTxRef] = useState(null)

  useEffect(() => {
    console.log('🔄 ChapaCallbackHandler MOUNTED')
    console.log('📋 Full URL:', window.location.href)
    console.log('🔍 All URL Parameters:', Object.fromEntries(searchParams.entries()))
    
    const handlePaymentCallback = async () => {
      try {
        // Try to get tx_ref from URL parameters first
        let extractedTxRef = searchParams.get('tx_ref')
        const urlStatus = searchParams.get('status')
        
        console.log('📊 URL Parameters:', { 
          tx_ref: extractedTxRef, 
          status: urlStatus 
        })

        // If no tx_ref in URL, try to get it from sessionStorage
        if (!extractedTxRef) {
          extractedTxRef = sessionStorage.getItem('pending_chapa_tx_ref')
          console.log('🔍 No tx_ref in URL, trying sessionStorage:', extractedTxRef)
        }

        if (!extractedTxRef) {
          console.error('❌ No transaction reference found anywhere')
          setStatus('failed')
          setError('No transaction reference found. Please contact support.')
          toast.error('Payment failed: No transaction reference found')
          return
        }

        setTxRef(extractedTxRef)
        console.log('🎯 Using tx_ref:', extractedTxRef)

        // Verify the payment with backend
        setStatus('verifying')
        console.log('🔍 Verifying payment with tx_ref:', extractedTxRef)
        
        const verificationResult = await paymentService.verifyPayment(extractedTxRef)
        console.log('✅ Verification result:', verificationResult)
        console.log('📊 Verification success:', verificationResult.success)
        console.log('📊 Verification message:', verificationResult.message)
        console.log('📊 Verification payment_status:', verificationResult.payment_status)

        if (verificationResult.success) {
          console.log('🎉 Payment verified successfully!')
          setStatus('success')
          
          // Clear stored data
          sessionStorage.removeItem('pending_chapa_tx_ref')
          sessionStorage.removeItem('pending_chapa_booking_data')
          
          toast.success('Payment completed successfully!')
          
          // Navigate to success page
          setTimeout(() => {
            navigate('/booking/booking-confirmation', {
              state: {
                paymentResult: verificationResult,
                txRef: extractedTxRef,
                bookingId: verificationResult.booking_id,
                pnrNumber: verificationResult.pnr_number
              }
            })
          }, 2000)
          
        } else {
          console.error('❌ Payment verification failed:', verificationResult)
          setStatus('failed')
          setError(verificationResult.message || 'Payment verification failed')
          toast.error(verificationResult.message || 'Payment verification failed')
        }

      } catch (error) {
        console.error('❌ Error in payment callback:', error)
        console.error('🐛 Error details:', error.response?.data || error.message)
        setStatus('failed')
        setError(error.message || 'Payment processing failed')
        toast.error(error.message || 'Payment processing failed')
      }
    }

    handlePaymentCallback()
  }, [searchParams, navigate])
// In your ChapaCallbackHandler.jsx - update the retry logic
const handleRetry = async () => {
  if (!txRef) return
  
  setStatus('verifying')
  setError(null)
  
  try {
    console.log('🔄 Retrying verification for tx_ref:', txRef)
    
    // Add a small delay to ensure backend has time to process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const verificationResult = await paymentService.verifyPayment(txRef)
    
    console.log('✅ Retry verification result:', verificationResult)
    
    if (verificationResult.success) {
      setStatus('success')
      toast.success('Payment verified successfully!')
      
      setTimeout(() => {
        navigate('/booking/booking-confirmation', {
          state: {
            paymentResult: verificationResult,
            txRef: txRef,
            bookingId: verificationResult.booking_id,
            pnrNumber: verificationResult.pnr_number
          }
        })
      }, 2000)
    } else {
      setStatus('failed')
      setError(verificationResult.message || 'Payment verification failed')
    }
  } catch (error) {
    console.error('❌ Retry error:', error)
    setStatus('failed')
    setError(error.message || 'Retry failed')
  }
}

  // Render different states
  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
            <p className="text-gray-600">Please wait while we process your payment...</p>
          </div>
        )
      
      case 'verifying':
        return (
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
            <p className="text-sm text-gray-500 mt-2">Transaction: {txRef}</p>
          </div>
        )
      
      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">Your payment has been processed successfully.</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to booking confirmation...</p>
          </div>
        )
      
      case 'failed':
        return (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            
            {txRef && (
              <div className="bg-gray-100 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-700 break-all">
                  <strong>Transaction Reference:</strong> {txRef}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Retry Verification
              </button>
              
              <button
                onClick={() => navigate('/payment')}
                className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Payment Again
              </button>
              
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Check My Bookings
              </button>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        {renderContent()}
        
        {/* Debug info - remove in production */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600 font-mono break-all">
            URL: {window.location.href}
          </p>
          <p className="text-sm text-gray-600 font-mono break-all mt-2">
            TX_REF: {txRef || 'Not found'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChapaCallbackHandler