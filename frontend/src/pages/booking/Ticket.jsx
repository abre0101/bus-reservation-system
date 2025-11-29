import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Download, Printer, ArrowLeft, QrCode, Calendar, MapPin, User, Clock, Bus } from 'lucide-react'

const Ticket = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to fetch ticket details
    const fetchTicket = async () => {
      try {
        // In a real app, you would fetch from your API
        // const response = await bookingService.getTicket(id)
        setTimeout(() => {
          setTicket({
            id: id,
            bookingReference: `ETHBUS${id.padStart(6, '0')}`,
            passengerName: user?.name || 'Passenger Name',
            route: 'Addis Ababa to Hawassa',
            busNumber: 'BUS-001',
            seatNumber: 'A12',
            departureTime: '2024-01-15T08:00:00',
            arrivalTime: '2024-01-15T12:30:00',
            price: 450,
            status: 'confirmed',
            bookingDate: '2024-01-10T14:30:00',
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${id}`
          })
          setLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to fetch ticket:', error)
        setLoading(false)
      }
    }

    fetchTicket()
  }, [id, user])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Implement download functionality
    alert('Download feature coming soon!')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h2>
          <p className="text-gray-600 mb-6">The requested ticket could not be found.</p>
          <button
            onClick={() => navigate('/my-bookings')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Bookings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/my-bookings')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </button>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Ticket
            </button>
          </div>
        </div>

        {/* Ticket */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 print:shadow-none print:border-2">
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">EthioBus Ticket</h1>
                <p className="text-blue-100">Booking Reference: {ticket.bookingReference}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  ticket.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </div>
                <p className="text-blue-100 mt-2">{formatDate(ticket.bookingDate)}</p>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Passenger & Journey Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Passenger Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Passenger Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">{ticket.passengerName}</p>
                    <p className="text-gray-600">Seat: {ticket.seatNumber}</p>
                  </div>
                </div>

                {/* Journey Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                    Journey Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{ticket.route.split(' to ')[0]}</p>
                        <p className="text-2xl font-bold text-blue-600">{formatTime(ticket.departureTime)}</p>
                      </div>
                      <div className="text-center">
                        <Bus className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm text-gray-500">{ticket.busNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{ticket.route.split(' to ')[1]}</p>
                        <p className="text-2xl font-bold text-blue-600">{formatTime(ticket.arrivalTime)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(ticket.departureTime)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {Math.round((new Date(ticket.arrivalTime) - new Date(ticket.departureTime)) / (1000 * 60 * 60))} hours
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Information */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Important Information</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Please arrive at the terminal 45 minutes before departure</li>
                    <li>• Bring a valid ID and this ticket (digital or printed)</li>
                    <li>• Boarding gates close 15 minutes before departure</li>
                    <li>• Luggage limit: 20kg per passenger</li>
                  </ul>
                </div>
              </div>

              {/* QR Code & Price */}
              <div className="space-y-6">
                {/* QR Code */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center">
                    <QrCode className="h-5 w-5 mr-2 text-blue-600" />
                    Boarding Pass
                  </h3>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
                    <img
                      src={ticket.qrCode}
                      alt="QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Scan at boarding</p>
                </div>

                {/* Price */}
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Total Amount Paid</p>
                  <p className="text-3xl font-bold text-green-600">ETB {ticket.price}</p>
                </div>

                {/* Contact Info */}
                <div className="text-center text-sm text-gray-500">
                  <p>Need help? Contact support:</p>
                  <p className="font-medium">+251 911 123 456</p>
                  <p>support@ethiobus.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-lg">
            <div className="text-center text-sm text-gray-500">
              <p>Thank you for choosing EthioBus. Have a safe journey!</p>
              <p>Terms and conditions apply. Visit ethiobus.com/terms for details.</p>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 text-center print:hidden">
          <p className="text-gray-600 mb-4">
            Lost your ticket? You can always access it from your booking history.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/my-bookings')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              View All Bookings
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Print Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:shadow-none,
            .print\\:shadow-none * {
              visibility: visible;
            }
            .print\\:shadow-none {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              box-shadow: none !important;
            }
            .print\\:border-2 {
              border: 2px solid #000 !important;
            }
            button {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Ticket