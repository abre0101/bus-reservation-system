import { useState, useEffect } from 'react'
import operatorService from '../../services/operatorService'

const Schedules = () => {
  const [schedules, setSchedules] = useState([])
  const [filteredSchedules, setFilteredSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [scheduleToCancel, setScheduleToCancel] = useState(null)
  const [refundPercentage, setRefundPercentage] = useState(100)
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [selectedBus, setSelectedBus] = useState(null)
  const [tariffRates, setTariffRates] = useState({})
  const [maxTariff, setMaxTariff] = useState(0)
  const [showDiscountReason, setShowDiscountReason] = useState(false)
  
  const [formData, setFormData] = useState({
    route_name: '',
    origin_city: '',
    destination_city: '',
    bus_number: '',
    bus_type: '',
    driver_name: '',
    departure_date: '',
    departure_time: '',
    arrival_time: '',
    fare_birr: 0,
    total_seats: 45,
    status: 'scheduled',
    discount_reason: '' // Added missing field
  })

  // Fallback rates (will be replaced by API rates)
  const ratePerKm = {
    'Standard': 2.5,
    'standard': 2.5,
    'Luxury': 3.5,
    'luxury': 3.5,
    'VIP': 4.5,
    'vip': 4.5,
    'Premium': 4.0,
    'premium': 4.0,
    'Sleeper': 5.0
  }

  useEffect(() => {
    fetchSchedules()
    fetchRoutes()
    fetchBuses()
    fetchDrivers()
    fetchTariffRates()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [schedules, searchTerm, statusFilter, dateFilter])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const response = await operatorService.getSchedules()
      setSchedules(response.schedules || [])
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoutes = async () => {
    try {
      const response = await operatorService.getRoutes()
      console.log('📍 Routes fetched:', response.routes)
      setRoutes(response.routes || [])
    } catch (error) {
      console.error('Error fetching routes:', error)
      setRoutes([])
    }
  }

  const fetchBuses = async () => {
    try {
      console.log('🔄 Fetching buses...')
      const response = await operatorService.getBuses()
      console.log('🚌 Buses fetched:', response.buses?.length || 0)
      
      // Filter to only show active buses (exclude maintenance and inactive)
      const activeBuses = (response.buses || []).filter(bus => 
        bus.status === 'active' || !bus.status
      )
      console.log(`✅ Active buses: ${activeBuses.length} out of ${response.buses?.length || 0}`)
      
      setBuses(activeBuses)
    } catch (error) {
      console.error('Error fetching buses:', error)
      setBuses([])
    }
  }

  const fetchDrivers = async () => {
    try {
      const response = await operatorService.getDrivers()
      setDrivers(response.drivers || [])
    } catch (error) {
      console.error('Error fetching drivers:', error)
      setDrivers([])
    }
  }

  const fetchTariffRates = async () => {
    try {
      const response = await operatorService.getCurrentTariffRates()
      console.log('💰 Tariff API response:', response)
      
      // Handle different response structures
      const rates = {}
      if (response.tariff_rates) {
        // If response has tariff_rates object
        Object.keys(response.tariff_rates).forEach(busType => {
          rates[busType] = response.tariff_rates[busType]
        })
      } else if (response.rates && Array.isArray(response.rates)) {
        // If response has rates array
        response.rates.forEach(rate => {
          rates[rate.bus_type] = rate.rate_per_km
        })
      } else {
        // Use fallback rates
        console.warn('No tariff rates found in API response, using fallback rates')
        setTariffRates(ratePerKm)
        return
      }
      
      setTariffRates(rates)
      console.log('💰 Tariff rates loaded:', rates)
    } catch (error) {
      console.error('Error fetching tariff rates:', error)
      // Use fallback rates if API fails
      setTariffRates(ratePerKm)
    }
  }

  // Calculate travel time based on distance (average speed: 55 km/h)
  const calculateTravelTime = (distance) => {
    if (!distance || distance <= 0) return 0
    
    // Average bus speed in Ethiopia: 50-60 km/h considering road conditions
    const averageSpeed = 55 // km/h
    const travelHours = distance / averageSpeed
    
    // Add 30 minutes buffer for stops, traffic, etc.
    return travelHours + 0.5
  }

  // Calculate arrival time based on departure time and distance
  const calculateArrivalTime = (departureTime, distance) => {
    if (!departureTime || !distance) return ''
    
    const travelHours = calculateTravelTime(distance)
    const [hours, minutes] = departureTime.split(':').map(Number)
    
    // Calculate total minutes
    const totalMinutes = hours * 60 + minutes + Math.round(travelHours * 60)
    
    // Calculate new hours and minutes
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMinutes = totalMinutes % 60
    
    // Format to HH:MM
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
  }

  const handleAddSchedule = () => {
    setFormData({
      route_name: '',
      origin_city: '',
      destination_city: '',
      bus_number: '',
      bus_type: 'Standard',
      driver_name: '',
      departure_date: '',
      departure_time: '',
      arrival_time: '',
      fare_birr: 0,
      total_seats: 45,
      status: 'scheduled',
      discount_reason: ''
    })
    setSelectedRoute(null)
    setSelectedBus(null)
    setMaxTariff(0)
    setShowDiscountReason(false)
    setShowAddModal(true)
  }

  const handleEditSchedule = (schedule) => {
    // Format the departure date properly for the date input
    let formattedDate = ''
    if (schedule.departure_date) {
      try {
        const dateStr = schedule.departure_date.toString()
        if (dateStr.includes('T')) {
          formattedDate = dateStr.split('T')[0]
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          formattedDate = dateStr.substring(0, 10)
        } else {
          formattedDate = new Date(schedule.departure_date).toISOString().split('T')[0]
        }
      } catch (e) {
        formattedDate = ''
      }
    }

    // Find and set the selected route
    const route = routes.find(r => 
      r.name === schedule.route_name || 
      `${r.origin_city} - ${r.destination_city}` === schedule.route_name
    )
    if (route) {
      setSelectedRoute(route)
      const distance = route.distance_km || route.distance || 0
      const calculatedMaxTariff = calculateTariff(distance, schedule.bus_type || 'Standard')
      setMaxTariff(calculatedMaxTariff)
      
      // Check if discount reason should be shown
      const discount = ((calculatedMaxTariff - (schedule.fare_birr || 0)) / calculatedMaxTariff) * 100
      setShowDiscountReason(discount > 20)
    }

    // Find and set the selected bus
    console.log('🔍 Looking for bus:', schedule.bus_number, 'in', buses.length, 'buses')
    console.log('📋 Available buses:', buses.map(b => ({ 
      id: b._id, 
      number: b.bus_number,
      type: b.type || b.bus_type,
      capacity: b.capacity || b.total_seats
    })))
    const bus = buses.find(b => b.bus_number === schedule.bus_number)
    if (bus) {
      console.log('✅ Found bus:', {
        _id: bus._id,
        bus_number: bus.bus_number,
        type: bus.type || bus.bus_type,
        capacity: bus.capacity || bus.total_seats
      })
      setSelectedBus(bus)
    } else {
      console.warn('⚠️ Bus not found in buses array:', schedule.bus_number)
      console.warn('⚠️ Schedule bus_number:', schedule.bus_number)
      console.warn('⚠️ Available bus numbers:', buses.map(b => b.bus_number))
      setSelectedBus(null)
    }

    setFormData({
      route_name: schedule.route_name || '',
      origin_city: schedule.origin_city || '',
      destination_city: schedule.destination_city || '',
      bus_number: schedule.bus_number || '',
      bus_type: schedule.bus_type || 'Standard',
      driver_name: schedule.driver_name || '',
      departure_date: formattedDate,
      departure_time: schedule.departure_time || '',
      arrival_time: schedule.arrival_time || '',
      fare_birr: schedule.fare_birr || 0,
      total_seats: schedule.total_seats || 45,
      status: schedule.status || 'scheduled',
      discount_reason: schedule.discount_reason || ''
    })
    
    setSelectedSchedule(schedule)
    setShowEditModal(true)
  }

  const calculateTariff = (distance, busType = 'Standard') => {
    // Use API rates if available, otherwise fallback
    const rate = tariffRates[busType] || ratePerKm[busType] || ratePerKm['Standard']
    const baseTariff = distance * rate
    
    // Add minimum fare
    const minimumFare = 50
    
    return Math.max(Math.round(baseTariff), minimumFare)
  }

  const getRateDescription = (busType) => {
    const rate = tariffRates[busType] || ratePerKm[busType] || ratePerKm['Standard']
    return `${rate} ETB/km`
  }

  const validateFare = (fare, maxTariff) => {
    if (fare > maxTariff) {
      return { valid: false, message: `Fare cannot exceed maximum tariff of ${maxTariff} ETB` }
    }
    
    const discount = ((maxTariff - fare) / maxTariff) * 100
    if (discount > 20) {
      return { valid: true, requiresReason: true, discount: discount.toFixed(1) }
    }
    
    return { valid: true, requiresReason: false }
  }

  const handleRouteSelect = (routeId) => {
    const route = routes.find(r => r._id === routeId)
    if (route) {
      setSelectedRoute(route)
      
      // Calculate tariff based on distance and current bus type
      const distance = route.distance_km || route.distance || 0
      const calculatedTariff = distance > 0 
        ? calculateTariff(distance, formData.bus_type || 'Standard')
        : (route.base_fare_birr || route.fare || route.base_fare || 0)
      
      // Set maximum tariff for validation
      setMaxTariff(calculatedTariff)
      
      console.log('🛣️ Route selected:', {
        route: route.name,
        distance: distance,
        busType: formData.bus_type,
        rate: getRateDescription(formData.bus_type || 'Standard'),
        calculatedTariff: calculatedTariff,
        maxTariff: calculatedTariff
      })
      
      // Calculate arrival time if departure time is already set
      let arrivalTime = formData.arrival_time
      if (formData.departure_time && distance > 0) {
        arrivalTime = calculateArrivalTime(formData.departure_time, distance)
      }
      
      setFormData({
        ...formData,
        route_name: route.name || `${route.origin_city} - ${route.destination_city}`,
        origin_city: route.origin_city || route.originCity,
        destination_city: route.destination_city || route.destinationCity,
        fare_birr: calculatedTariff,
        arrival_time: arrivalTime
      })
    }
  }

  const handleBusSelect = (busId) => {
    const bus = buses.find(b => b._id === busId)
    if (bus) {
      setSelectedBus(bus)
      
      const busType = bus.bus_type || bus.type || 'Standard'
      
      // Recalculate tariff if route is selected
      let newTariff = formData.fare_birr
      const routeDistance = selectedRoute?.distance_km || selectedRoute?.distance
      if (selectedRoute && routeDistance) {
        newTariff = calculateTariff(routeDistance, busType)
        setMaxTariff(newTariff) // Update max tariff when bus type changes
      }
      
      console.log('🚌 Bus selected:', {
        bus: bus.bus_number,
        busType: busType,
        rate: getRateDescription(busType),
        routeDistance: routeDistance,
        calculatedTariff: newTariff,
        maxTariff: newTariff
      })
      
      setFormData({
        ...formData,
        bus_number: bus.bus_number,
        bus_type: busType,
        total_seats: bus.capacity || bus.total_seats || 45,
        fare_birr: newTariff
      })
    }
  }

  const checkScheduleConflicts = (tempFormData = null) => {
    const dataToCheck = tempFormData || formData
    const conflicts = []
    const scheduleDate = dataToCheck.departure_date
    
    if (!scheduleDate) {
      return conflicts
    }

    // Check all schedules for conflicts (excluding the current one being edited)
    schedules.forEach(schedule => {
      // Skip if it's the same schedule we're editing
      if (showEditModal && selectedSchedule && schedule._id === selectedSchedule._id) {
        return
      }

      // Skip completed or cancelled schedules
      if (schedule.status === 'completed' || schedule.status === 'cancelled') {
        return
      }

      const existingDate = schedule.departure_date?.toString().split('T')[0]
      const newDate = scheduleDate.split('T')[0]

      // Check if same date
      if (existingDate === newDate) {
        // Check driver conflict
        if (dataToCheck.driver_name && schedule.driver_name === dataToCheck.driver_name) {
          conflicts.push({
            type: 'driver',
            message: `Driver "${dataToCheck.driver_name}" is already assigned to another schedule on ${newDate}`,
            details: `${schedule.origin_city} → ${schedule.destination_city} at ${schedule.departure_time}`
          })
        }

        // Check bus conflict
        if (dataToCheck.bus_number && schedule.bus_number === dataToCheck.bus_number) {
          conflicts.push({
            type: 'bus',
            message: `Bus "${dataToCheck.bus_number}" is already assigned to another schedule on ${newDate}`,
            details: `${schedule.origin_city} → ${schedule.destination_city} at ${schedule.departure_time}`
          })
        }
      }
    })

    return conflicts
  }

  const handleDriverSelect = (driverName) => {
    const newFormData = {
      ...formData,
      driver_name: driverName
    }
    setFormData(newFormData)

    // Check for driver conflict immediately
    if (driverName && newFormData.departure_date) {
      const conflicts = checkScheduleConflicts(newFormData)
      const driverConflict = conflicts.find(c => c.type === 'driver')
      if (driverConflict) {
        console.warn('⚠️ Driver conflict detected:', driverConflict.message)
      }
    }
  }

  // Handle departure time change - automatically calculate arrival time
  const handleDepartureTimeChange = (departureTime) => {
    const routeDistance = selectedRoute?.distance_km || selectedRoute?.distance || 0
    let arrivalTime = ''
    
    if (departureTime && routeDistance > 0) {
      arrivalTime = calculateArrivalTime(departureTime, routeDistance)
    }
    
    setFormData({
      ...formData,
      departure_time: departureTime,
      arrival_time: arrivalTime
    })
  }

  const handleSaveSchedule = async () => {
    try {
      // Validate fare against maximum tariff
      if (maxTariff > 0) {
        const validation = validateFare(formData.fare_birr, maxTariff)
        
        if (!validation.valid) {
          alert(validation.message)
          return
        }
        
        if (validation.requiresReason && !formData.discount_reason) {
          alert(`Large discount detected (${validation.discount}%). Please provide a reason.`)
          setShowDiscountReason(true)
          return
        }
      }

      // Check for schedule conflicts
      const conflicts = checkScheduleConflicts()
      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map(c => `⚠️ ${c.message}\n   Existing: ${c.details}`).join('\n\n')
        alert(`Cannot save schedule due to conflicts:\n\n${conflictMessages}\n\nPlease choose a different driver or bus, or select a different date.`)
        return
      }

      if (showEditModal && selectedSchedule) {
        await operatorService.updateSchedule(selectedSchedule._id, formData)
        alert('Schedule updated successfully!')
      } else {
        await operatorService.createSchedule(formData)
        alert('Schedule created successfully!')
      }

      setShowAddModal(false)
      setShowEditModal(false)
      setShowDiscountReason(false)
      fetchSchedules()
    } catch (error) {
      alert('Error saving schedule: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return
    }

    try {
      await operatorService.deleteSchedule(scheduleId)
      alert('Schedule deleted successfully!')
      fetchSchedules()
    } catch (error) {
      alert('Error deleting schedule')
    }
  }

  const handleEmergencyCancel = (schedule) => {
    setScheduleToCancel(schedule)
    setCancelReason('')
    setRefundPercentage(100)
    setShowCancelModal(true)
  }

  const handleConfirmEmergencyCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    if (refundPercentage < 0 || refundPercentage > 100) {
      alert('Refund percentage must be between 0% and 100%')
      return
    }

    const confirmMessage = `Are you sure you want to cancel this schedule?\n\n` +
      `Route: ${scheduleToCancel.origin_city} → ${scheduleToCancel.destination_city}\n` +
      `Date: ${scheduleToCancel.departure_date?.toString().split('T')[0]}\n` +
      `Booked Passengers: ${scheduleToCancel.booked_seats || 0}\n` +
      `Refund: ${refundPercentage}%\n\n` +
      `This action cannot be undone.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const response = await operatorService.emergencyCancelSchedule(scheduleToCancel._id, {
        reason: cancelReason,
        refund_percentage: refundPercentage
      })

      alert(`Schedule cancelled successfully!\n\n${response.affected_bookings || 0} passengers will receive ${refundPercentage}% refund.\nTotal refund amount: ${response.total_refund_amount || 0} ETB`)
      
      setShowCancelModal(false)
      setScheduleToCancel(null)
      setCancelReason('')
      setRefundPercentage(100)
      fetchSchedules()
    } catch (error) {
      alert('Error cancelling schedule: ' + (error.message || 'Unknown error'))
    }
  }

  const applyFilters = () => {
    let filtered = [...schedules]

    if (searchTerm) {
      filtered = filtered.filter(schedule =>
        schedule.origin_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.destination_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.bus_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(schedule => schedule.status === statusFilter)
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      filtered = filtered.filter(schedule => {
        const scheduleDate = schedule.departure_date?.toString().split('T')[0]
        
        if (dateFilter === 'today') return scheduleDate === today
        if (dateFilter === 'upcoming') return scheduleDate >= today
        if (dateFilter === 'past') return scheduleDate < today
        return true
      })
    }

    setFilteredSchedules(filtered)
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      boarding: 'bg-indigo-100 text-indigo-800',
      departed: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const hasDriverConflict = (schedule) => {
    if (!schedule.driver_name || !schedule.departure_date) return false
    if (schedule.status === 'cancelled' || schedule.status === 'completed') return false
    
    const scheduleDate = schedule.departure_date?.toString().split('T')[0]
    
    // Check if any other schedule has the same driver on the same day
    return filteredSchedules.some(other => {
      if (other._id === schedule._id) return false
      if (!other.driver_name || !other.departure_date) return false
      if (other.status === 'cancelled' || other.status === 'completed') return false
      
      const otherDate = other.departure_date?.toString().split('T')[0]
      return other.driver_name === schedule.driver_name && otherDate === scheduleDate
    })
  }

  const stats = {
    total: schedules.length,
    scheduled: schedules.filter(s => s.status === 'scheduled').length,
    inProgress: schedules.filter(s => s.status === 'in_progress' || s.status === 'active').length,
    completed: schedules.filter(s => s.status === 'completed').length,
    cancelled: schedules.filter(s => s.status === 'cancelled').length,
    departed: schedules.filter(s => s.status === 'departed').length,
    boarding: schedules.filter(s => s.status === 'boarding').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600 mt-1">Manage bus schedules, routes, and departures</p>
        </div>
        <button
          onClick={handleAddSchedule}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Schedule
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total</p>
              <p className="text-4xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium uppercase tracking-wide">Scheduled</p>
              <p className="text-4xl font-bold mt-2">{stats.scheduled}</p>
            </div>
            <div className="bg-yellow-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Departed</p>
              <p className="text-4xl font-bold mt-2">{stats.departed}</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">In Progress</p>
              <p className="text-4xl font-bold mt-2">{stats.inProgress}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm font-medium uppercase tracking-wide">Completed</p>
              <p className="text-4xl font-bold mt-2">{stats.completed}</p>
            </div>
            <div className="bg-gray-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium uppercase tracking-wide">Cancelled</p>
              <p className="text-4xl font-bold mt-2">{stats.cancelled}</p>
            </div>
            <div className="bg-red-400 bg-opacity-30 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Schedules</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by cities or bus number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="boarding">Boarding</option>
              <option value="departed">Departed</option>
              <option value="in_progress">In Progress</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date Filter</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Bus</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Seats</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fare</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchedules.map((schedule) => {
                const totalSeats = schedule.total_seats || 45
                const bookedSeats = schedule.booked_seats || 0
                const availableSeats = totalSeats - bookedSeats
                const occupancy = totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(0) : 0
                
                // Debug logging
                if (schedule._id && bookedSeats > 0) {
                  console.log('Schedule seats:', {
                    id: schedule._id,
                    route: `${schedule.origin_city} → ${schedule.destination_city}`,
                    total: totalSeats,
                    booked: bookedSeats,
                    available: availableSeats,
                    from_api: schedule.available_seats
                  })
                }

                const originCity = schedule.origin_city || 'N/A'
                const destinationCity = schedule.destination_city || 'N/A'
                const fare = schedule.fare_birr || 0
                const busNumber = schedule.bus_number || 'N/A'
                const busType = schedule.bus_type || ''
                
                // Format date properly
                let formattedDate = 'N/A'
                if (schedule.departure_date) {
                  try {
                    const dateStr = schedule.departure_date.toString()
                    if (dateStr.includes('T')) {
                      formattedDate = dateStr.split('T')[0]
                    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                      formattedDate = dateStr.substring(0, 10)
                    } else {
                      formattedDate = new Date(schedule.departure_date).toISOString().split('T')[0]
                    }
                  } catch (e) {
                    formattedDate = 'Invalid date'
                  }
                }

                return (
                  <tr key={schedule._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {originCity} → {destinationCity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formattedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{schedule.departure_time || 'N/A'}</div>
                      <div className="text-xs text-gray-500">→ {schedule.arrival_time || 'Not set'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{busNumber}</div>
                      {busType && <div className="text-xs text-gray-500 capitalize">{busType}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {schedule.driver_name || 'Not assigned'}
                        </span>
                        {hasDriverConflict(schedule) && (
                          <span 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300"
                            title="Driver conflict: This driver is assigned to multiple schedules on the same day"
                          >
                            ⚠️ Conflict
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {availableSeats} / {totalSeats}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {bookedSeats} booked
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            occupancy >= 80 ? 'bg-red-500' :
                            occupancy >= 50 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${occupancy}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {fare.toLocaleString()} ETB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      {schedule.status !== 'cancelled' && schedule.status !== 'completed' && bookedSeats > 0 && (
                        <button
                          onClick={() => handleEmergencyCancel(schedule)}
                          className="text-orange-600 hover:text-orange-900"
                          title={`Emergency cancellation with refund for ${bookedSeats} passengers`}
                        >
                          🚨 Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSchedule(schedule._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredSchedules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No schedules found</p>
          </div>
        )}
      </div>

      {/* Emergency Cancel Modal */}
      {showCancelModal && scheduleToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-600">🚨 Emergency Cancellation</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Schedule Details</h3>
                <p className="text-sm text-red-800">
                  <strong>Route:</strong> {scheduleToCancel.origin_city} → {scheduleToCancel.destination_city}<br/>
                  <strong>Date:</strong> {scheduleToCancel.departure_date?.toString().split('T')[0]}<br/>
                  <strong>Time:</strong> {scheduleToCancel.departure_time}<br/>
                  <strong>Bus:</strong> {scheduleToCancel.bus_number}<br/>
                  <strong>Booked Passengers:</strong> {scheduleToCancel.booked_seats || 0}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• All passengers will receive refund based on percentage below</li>
                  <li>• Passengers will be notified via email/SMS</li>
                  <li>• This action cannot be undone</li>
                  <li>• Schedule status will be set to "cancelled"</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason * <span className="text-red-600">(Required)</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-2"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="Road Blockage">🚧 Road Blockage</option>
                  <option value="Accident on Route">🚗 Accident on Route</option>
                  <option value="Severe Weather">🌧️ Severe Weather Conditions</option>
                  <option value="Bus Breakdown">🔧 Bus Mechanical Failure</option>
                  <option value="Driver Emergency">👨‍✈️ Driver Emergency/Unavailable</option>
                  <option value="Government Order">📋 Government/Authority Order</option>
                  <option value="Safety Concerns">⚠️ Safety Concerns</option>
                  <option value="Other Emergency">🚨 Other Emergency</option>
                </select>
                
                {cancelReason && (
                  <textarea
                    placeholder="Additional details (optional)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    rows="3"
                    onChange={(e) => {
                      const baseReason = cancelReason.split(':')[0]
                      const details = e.target.value.trim()
                      setCancelReason(details ? `${baseReason}: ${details}` : baseReason)
                    }}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Percentage * <span className="text-red-600">(0-100%)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={refundPercentage}
                    onChange={(e) => setRefundPercentage(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={refundPercentage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      setRefundPercentage(Math.min(100, Math.max(0, value)))
                    }}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">%</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-600">
                  <button
                    type="button"
                    onClick={() => setRefundPercentage(0)}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    No Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundPercentage(50)}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundPercentage(75)}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundPercentage(100)}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Full Refund
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Estimated total refund: {((scheduleToCancel.booked_seats || 0) * (scheduleToCancel.fare_birr || 0) * refundPercentage / 100).toFixed(2)} ETB
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmergencyCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                Confirm Cancellation & Refund {refundPercentage}%
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Schedule Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {showEditModal ? 'Edit Schedule' : 'Add New Schedule'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Route Selection */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Route *</label>
                  <select
                    value={selectedRoute?._id || ''}
                    onChange={(e) => handleRouteSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select a route</option>
                    {routes.map((route) => (
                      <option key={route._id} value={route._id}>
                        {route.name || `${route.origin_city} - ${route.destination_city}`} 
                        ({route.distance_km || route.distance || 0} km)
                      </option>
                    ))}
                  </select>
                  {selectedRoute && (
                    <div className="mt-2 bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>Route Info:</strong> {selectedRoute.origin_city} → {selectedRoute.destination_city} • 
                        {selectedRoute.distance_km || selectedRoute.distance || 0} km • 
                        Duration: ~{calculateTravelTime(selectedRoute.distance_km || selectedRoute.distance || 0).toFixed(1)} hours
                      </div>
                    </div>
                  )}
                </div>

                {/* Bus Selection */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bus * {formData.bus_number && !selectedBus && <span className="text-xs text-gray-500">(Current: {formData.bus_number})</span>}
                  </label>
                  <select
                    value={selectedBus?._id || buses.find(b => b.bus_number === formData.bus_number)?._id || ''}
                    onChange={(e) => handleBusSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select a bus</option>
                    {buses.map((bus) => (
                      <option key={bus._id} value={bus._id}>
                        {bus.bus_number} - {bus.bus_name || 'N/A'} ({bus.bus_type || bus.type || 'standard'}) - {bus.capacity || bus.total_seats || 45} seats
                      </option>
                    ))}
                  </select>
                  {buses.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ No active buses available. Please add buses first.</p>
                  )}
                  {(selectedBus || formData.bus_number) && (
                    <div className="mt-2 bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-800">
                        <strong>Bus:</strong> {formData.bus_number} • 
                        <strong>Type:</strong> {selectedBus?.bus_type || selectedBus?.type || formData.bus_type || 'standard'} • 
                        <strong>Rate:</strong> {getRateDescription(selectedBus?.bus_type || selectedBus?.type || formData.bus_type || 'standard')} • 
                        <strong>Seats:</strong> {selectedBus?.capacity || selectedBus?.total_seats || formData.total_seats || 45}
                      </div>
                    </div>
                  )}
                </div>

                {/* Driver Selection */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver *</label>
                  <select
                    value={formData.driver_name}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select a driver</option>
                    {drivers.map((driver, index) => (
                      <option key={index} value={driver.name || driver}>
                        {driver.name || driver}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Departure Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departure Date *</label>
                  <input
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => setFormData({...formData, departure_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cannot select past dates
                  </p>
                </div>

                {/* Departure Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departure Time *</label>
                  <input
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => handleDepartureTimeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Arrival Time (Auto-calculated) */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calculated Arrival Time
                    {selectedRoute && (selectedRoute.distance_km || selectedRoute.distance) && selectedBus && (
                      <span className="text-xs text-blue-600 ml-2">
                        (Auto-calculated based on {calculateTravelTime(selectedRoute.distance_km || selectedRoute.distance).toFixed(1)} hours travel)
                      </span>
                    )}
                  </label>
                  <input
                    type="time"
                    value={formData.arrival_time}
                    onChange={(e) => setFormData({...formData, arrival_time: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    readOnly
                  />
                  {selectedRoute && (selectedRoute.distance_km || selectedRoute.distance) && selectedBus && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Calculation:</strong> {selectedRoute.distance_km || selectedRoute.distance} km × {getRateDescription(formData.bus_type)} = {formData.fare_birr} ETB
                    </p>
                  )}
                </div>

                {/* Final Fare with Tariff Validation */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final Fare (ETB) *
                    {maxTariff > 0 && (
                      <span className="text-xs text-red-600 ml-2">
                        (Max: {maxTariff} ETB)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={formData.fare_birr}
                    onChange={(e) => {
                      const newFare = parseFloat(e.target.value) || 0
                      setFormData({...formData, fare_birr: newFare})
                      
                      // Check if discount reason is needed
                      if (maxTariff > 0) {
                        const discount = ((maxTariff - newFare) / maxTariff) * 100
                        setShowDiscountReason(discount > 20)
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min="50"
                    max={maxTariff || undefined}
                    step="10"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cannot exceed maximum tariff. Large discounts require justification.
                  </p>
                </div>

                {/* Discount Reason (Conditional) */}
                {showDiscountReason && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Reason * 
                      <span className="text-xs text-orange-600 ml-2">
                        (Required for discounts &gt; 20%)
                      </span>
                    </label>
                    <textarea
                      value={formData.discount_reason}
                      onChange={(e) => setFormData({...formData, discount_reason: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows="2"
                      placeholder="e.g., Student group discount, Promotional offer, Off-peak travel"
                      required
                    />
                  </div>
                )}

                {/* Total Seats */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Seats *</label>
                  <input
                    type="number"
                    value={formData.total_seats}
                    onChange={(e) => setFormData({...formData, total_seats: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    max="60"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showEditModal ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedules