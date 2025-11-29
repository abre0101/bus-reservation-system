import React, { useState, useEffect } from 'react';
import { operatorService } from '../../services/operatorService';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, TrendingUp, Users, DollarSign, Bus, Route, 
  Filter, Download, Search, Phone, User, Clock, MapPin, ChevronDown, ChevronUp
} from 'lucide-react';

const OperatorReports = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [reportData, setReportData] = useState({
    todayBookings: [],
    todayRevenue: 0,
    todayPassengerCount: 0,
    tomorrowBookings: [],
    weeklyStats: {
      totalBookings: 0,
      totalRevenue: 0,
      totalPassengers: 0,
      averageOccupancy: 0
    },
    bookingTrends: [],
    routePerformance: [],
    busPerformance: [],
    cancellationRate: 0,
    mostPopularRoute: null
  });

  const [filters, setFilters] = useState({
    busNumber: '',
    routeName: '',
    searchTerm: ''
  });

  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetchReportData();
  }, [filterPeriod, customDateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = filterPeriod === 'custom' ? customDateRange : { period: filterPeriod };
      const data = await operatorService.getReports(params);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (format) => {
    try {
      if (format === 'csv') {
        exportToCSV();
      } else if (format === 'pdf') {
        exportToPDF();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  };

  const exportToCSV = () => {
    try {
      const dateStr = filterPeriod === 'custom' 
        ? `${customDateRange.startDate}_to_${customDateRange.endDate}`
        : filterPeriod;
      
      // Create CSV content
      let csvContent = 'EthioBus Operator Report\n';
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Period: ${filterPeriod.toUpperCase()}\n\n`;
      
      // Summary Statistics
      csvContent += 'SUMMARY STATISTICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Today's Bookings,${reportData.todayBookings?.length || 0}\n`;
      csvContent += `Today's Revenue,$${reportData.todayRevenue?.toFixed(2) || '0.00'}\n`;
      csvContent += `Today's Passengers,${reportData.todayPassengerCount || 0}\n`;
      csvContent += `Weekly Bookings,${reportData.weeklyStats?.totalBookings || 0}\n`;
      csvContent += `Weekly Revenue,$${reportData.weeklyStats?.totalRevenue?.toFixed(2) || '0.00'}\n`;
      csvContent += `Weekly Passengers,${reportData.weeklyStats?.totalPassengers || 0}\n`;
      csvContent += `Average Occupancy,${reportData.weeklyStats?.averageOccupancy || 0}%\n`;
      csvContent += `Cancellation Rate,${reportData.cancellationRate || 0}%\n\n`;
      
      // Route Performance
      csvContent += 'ROUTE PERFORMANCE\n';
      csvContent += 'Route Name,Bookings,Revenue,Occupancy Rate,Status\n';
      reportData.routePerformance.forEach(route => {
        const status = route.occupancyRate >= 80 ? 'High' : route.occupancyRate >= 50 ? 'Medium' : 'Low';
        csvContent += `${route.routeName},${route.bookings},$${route.revenue?.toFixed(2)},${route.occupancyRate}%,${status}\n`;
      });
      csvContent += '\n';
      
      // Bus Performance
      csvContent += 'BUS PERFORMANCE\n';
      csvContent += 'Bus Name,Bus Number,Total Trips,Bookings,Revenue,Average Occupancy\n';
      reportData.busPerformance.forEach(bus => {
        const busName = bus.busName || bus.bus_name || `Bus ${bus.busNumber || bus.bus_number}`;
        const busNumber = bus.busNumber || bus.bus_number;
        csvContent += `${busName},${busNumber},${bus.totalTrips},${bus.bookings},$${bus.revenue?.toFixed(2)},${bus.avgOccupancy}%\n`;
      });
      csvContent += '\n';
      
      // Today's Bookings Detail
      if (reportData.todayBookings && reportData.todayBookings.length > 0) {
        csvContent += 'TODAY\'S BOOKINGS DETAIL\n';
        csvContent += 'Passenger Name,Phone Number,Bus Number,Route,Departure Time,Seats,Price,Status\n';
        reportData.todayBookings.forEach(booking => {
          csvContent += `${booking.passengerName || 'N/A'},${booking.phoneNumber || 'N/A'},${booking.bus_number || 'N/A'},${booking.route_name || 'N/A'},${booking.departure_time || 'N/A'},${booking.seatsBooked || 1},$${booking.totalPrice?.toFixed(2) || '0.00'},${booking.status || 'N/A'}\n`;
        });
      }
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ethiobus_operator_report_${dateStr}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('CSV report exported successfully!');
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Failed to generate CSV export');
    }
  };

  const exportToPDF = () => {
    try {
      // Use browser's print functionality to generate PDF
      const printWindow = window.open('', '_blank');
      const dateStr = filterPeriod === 'custom' 
        ? `${customDateRange.startDate} to ${customDateRange.endDate}`
        : filterPeriod.toUpperCase();
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>EthioBus Operator Report - ${dateStr}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: #1e40af;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 10px;
            }
            h2 {
              color: #3b82f6;
              margin-top: 30px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #3b82f6;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin: 20px 0;
            }
            .summary-card {
              border: 1px solid #e5e7eb;
              padding: 15px;
              border-radius: 8px;
              background: #f9fafb;
            }
            .summary-label {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
            }
            .header-info {
              margin-bottom: 30px;
              padding: 15px;
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>EthioBus Operator Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Period:</strong> ${dateStr}</p>
          </div>

          <h2>Summary Statistics</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">Today's Bookings</div>
              <div class="summary-value">${reportData.todayBookings?.length || 0}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Today's Revenue</div>
              <div class="summary-value">$${reportData.todayRevenue?.toFixed(2) || '0.00'}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Weekly Bookings</div>
              <div class="summary-value">${reportData.weeklyStats?.totalBookings || 0}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Weekly Revenue</div>
              <div class="summary-value">$${reportData.weeklyStats?.totalRevenue?.toFixed(2) || '0.00'}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Average Occupancy</div>
              <div class="summary-value">${reportData.weeklyStats?.averageOccupancy || 0}%</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Cancellation Rate</div>
              <div class="summary-value">${reportData.cancellationRate || 0}%</div>
            </div>
          </div>

          <h2>Route Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Route Name</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Occupancy Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.routePerformance.map(route => {
                const status = route.occupancyRate >= 80 ? 'High' : route.occupancyRate >= 50 ? 'Medium' : 'Low';
                return `
                  <tr>
                    <td>${route.routeName}</td>
                    <td>${route.bookings}</td>
                    <td>$${route.revenue?.toFixed(2)}</td>
                    <td>${route.occupancyRate}%</td>
                    <td>${status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <h2>Bus Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Bus Number</th>
                <th>Total Trips</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Avg Occupancy</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.busPerformance.map(bus => `
                <tr>
                  <td>${bus.bus_number}</td>
                  <td>${bus.totalTrips}</td>
                  <td>${bus.bookings}</td>
                  <td>$${bus.revenue?.toFixed(2)}</td>
                  <td>${bus.avgOccupancy}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>EthioBus - Ethiopian Bus Reservation System</p>
            <p>This report is confidential and intended for internal use only</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try using your browser\'s print function (Ctrl+P) and select "Save as PDF".');
    }
  };

  const filteredTodayBookings = reportData.todayBookings.filter(booking => {
    const matchesBus = !filters.busNumber || booking.bus_number?.toLowerCase().includes(filters.busNumber.toLowerCase());
    const matchesRoute = !filters.routeName || booking.route_name?.toLowerCase().includes(filters.routeName.toLowerCase());
    const matchesSearch = !filters.searchTerm || 
      booking.passengerName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      booking.phoneNumber?.includes(filters.searchTerm);
    return matchesBus && matchesRoute && matchesSearch;
  });

  const filteredTomorrowBookings = reportData.tomorrowBookings.filter(booking => {
    const matchesBus = !filters.busNumber || booking.bus_number?.toLowerCase().includes(filters.busNumber.toLowerCase());
    const matchesRoute = !filters.routeName || booking.route_name?.toLowerCase().includes(filters.routeName.toLowerCase());
    const matchesSearch = !filters.searchTerm || 
      booking.passengerName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      booking.phoneNumber?.includes(filters.searchTerm);
    return matchesBus && matchesRoute && matchesSearch;
  });

  const groupBookingsByBusAndRoute = (bookings) => {
    const grouped = {};
    bookings.forEach(booking => {
      const key = `${booking.bus_number}-${booking.route_name}`;
      if (!grouped[key]) {
        grouped[key] = {
          bus_number: booking.bus_number,
          route_name: booking.route_name,
          departure_time: booking.departure_time,
          origin: booking.origin,
          destination: booking.destination,
          bookings: [],
          totalRevenue: 0,
          totalSeats: 0
        };
      }
      grouped[key].bookings.push(booking);
      grouped[key].totalRevenue += booking.totalPrice || 0;
      grouped[key].totalSeats += booking.seatsBooked || 1;
    });
    return Object.values(grouped).sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive booking and revenue insights</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {filterPeriod === 'custom' && (
            <>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => handleExportReport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExportReport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'today', label: "Today's Bookings" },
            { id: 'tomorrow', label: "Tomorrow's Bookings" },
            { id: 'analytics', label: 'Analytics' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Today's Bookings</p>
                  <p className="text-3xl font-bold mt-2">{reportData.todayBookings?.length || 0}</p>
                  <p className="text-blue-100 text-xs mt-1">{reportData.todayPassengerCount || 0} passengers</p>
                </div>
                <Users className="w-12 h-12 text-blue-200 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Today's Revenue</p>
                  <p className="text-3xl font-bold mt-2">${reportData.todayRevenue?.toFixed(2) || '0.00'}</p>
                  <p className="text-green-100 text-xs mt-1">Total earnings</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-200 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Weekly Bookings</p>
                  <p className="text-3xl font-bold mt-2">{reportData.weeklyStats?.totalBookings || 0}</p>
                  <p className="text-purple-100 text-xs mt-1">{reportData.weeklyStats?.totalPassengers || 0} passengers</p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-200 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Weekly Revenue</p>
                  <p className="text-3xl font-bold mt-2">${reportData.weeklyStats?.totalRevenue?.toFixed(2) || '0.00'}</p>
                  <p className="text-orange-100 text-xs mt-1">{reportData.weeklyStats?.averageOccupancy || 0}% avg occupancy</p>
                </div>
                <DollarSign className="w-12 h-12 text-orange-200 opacity-80" />
              </div>
            </div>
          </div>

          {/* Cancellation Rate & Most Popular Route */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cancellation Rate</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  reportData.cancellationRate < 5 ? 'bg-green-100 text-green-800' :
                  reportData.cancellationRate < 15 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {reportData.cancellationRate < 5 ? 'Excellent' : reportData.cancellationRate < 15 ? 'Good' : 'High'}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div className="text-5xl font-bold text-gray-900">{reportData.cancellationRate || 0}%</div>
                <div className="text-sm text-gray-600 mb-2">
                  {reportData.cancelledBookingsInPeriod || 0} of {reportData.totalBookingsInPeriod || 0} bookings cancelled
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <Route className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Most Popular Route</h3>
              </div>
              {reportData.mostPopularRoute ? (
                <>
                  <div className="text-2xl font-bold mb-2">{reportData.mostPopularRoute.routeName}</div>
                  <div className="flex items-center justify-between text-indigo-100">
                    <span>{reportData.mostPopularRoute.bookings} bookings</span>
                    <span className="text-xl font-semibold">${reportData.mostPopularRoute.revenue?.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="text-indigo-100">No data available</div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Trends */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.bookingTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bookings" stroke="#3B82F6" strokeWidth={2} name="Bookings" />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue ($)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Route Performance Pie Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Distribution</h2>
              {reportData.routePerformance && reportData.routePerformance.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.routePerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ routeName, percent }) => `${routeName || 'Unknown'}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="bookings"
                        nameKey="routeName"
                      >
                        {reportData.routePerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} bookings (${((value / reportData.routePerformance.reduce((sum, r) => sum + r.bookings, 0)) * 100).toFixed(1)}%)`,
                          props.payload.routeName || 'Unknown Route'
                        ]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry) => {
                          const route = reportData.routePerformance.find(r => r.routeName === entry.payload.routeName);
                          return `${entry.payload.routeName || 'Unknown'} (${route?.bookings || 0})`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Route Legend with Colors */}
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {reportData.routePerformance.map((route, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-sm font-medium text-gray-900">{route.routeName || 'Unknown Route'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">{route.bookings} bookings</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {((route.bookings / reportData.routePerformance.reduce((sum, r) => sum + r.bookings, 0)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Route className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">No route data available</p>
                  <p className="text-sm">Route distribution will appear here once bookings are made</p>
                </div>
              )}
            </div>
          </div>

          {/* Route Performance Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Occupancy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.routePerformance.map((route, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Route className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{route.routeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.bookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">${route.revenue?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.occupancyRate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          route.occupancyRate >= 80 ? 'bg-green-100 text-green-800' :
                          route.occupancyRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {route.occupancyRate >= 80 ? 'High' : route.occupancyRate >= 50 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bus Performance */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bus Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bus Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trips</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Occupancy</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.busPerformance.map((bus, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Bus className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{bus.busName || bus.bus_name || `Bus ${bus.busNumber || bus.bus_number}`}</div>
                            <div className="text-xs text-gray-500">{bus.busNumber || bus.bus_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bus.totalTrips}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bus.bookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">${bus.revenue?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bus.avgOccupancy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Today's Bookings Tab */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filter Bookings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Passenger</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name or phone number..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bus Number</label>
                <input
                  type="text"
                  placeholder="Filter by bus..."
                  value={filters.busNumber}
                  onChange={(e) => setFilters({ ...filters, busNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                <input
                  type="text"
                  placeholder="Filter by route..."
                  value={filters.routeName}
                  onChange={(e) => setFilters({ ...filters, routeName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white p-3 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Today's Summary</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {filteredTodayBookings.length} Bookings | ${filteredTodayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toFixed(2)} Revenue
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Bookings by Bus and Route */}
          <div className="space-y-4">
            {groupBookingsByBusAndRoute(filteredTodayBookings).map((group, idx) => {
              const sectionKey = `today-${group.bus_number}-${group.route_name}`;
              const isExpanded = expandedSections[sectionKey];
              
              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Section Header */}
                  <div 
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                    onClick={() => toggleSection(sectionKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Bus {group.bus_number}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Route className="w-4 h-4" />
                              {group.route_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {group.origin} → {group.destination}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {group.departure_time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Passengers</p>
                          <p className="text-xl font-bold text-gray-900">{group.bookings.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Revenue</p>
                          <p className="text-xl font-bold text-green-600">${group.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Seats</p>
                          <p className="text-xl font-bold text-blue-600">{group.totalSeats}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Passenger List */}
                  {isExpanded && (
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone Number</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seat Numbers</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {group.bookings.map((booking, bookingIdx) => (
                              <tr key={bookingIdx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{bookingIdx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">{booking.passengerName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{booking.phoneNumber}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{booking.seatsBooked || 1}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{booking.seatNumbers?.join(', ') || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm font-medium text-green-600">${booking.totalPrice?.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{new Date(booking.bookingTime).toLocaleTimeString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredTodayBookings.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
                <p className="text-gray-600">There are no bookings matching your filters for today.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tomorrow's Bookings Tab */}
      {activeTab === 'tomorrow' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filter Bookings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Passenger</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Name or phone number..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bus Number</label>
                <input
                  type="text"
                  placeholder="Filter by bus..."
                  value={filters.busNumber}
                  onChange={(e) => setFilters({ ...filters, busNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                <input
                  type="text"
                  placeholder="Filter by route..."
                  value={filters.routeName}
                  onChange={(e) => setFilters({ ...filters, routeName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600 text-white p-3 rounded-lg">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Tomorrow's Summary</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {filteredTomorrowBookings.length} Bookings | {filteredTomorrowBookings.reduce((sum, b) => sum + (b.seatsBooked || 1), 0)} Passengers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Bookings by Bus and Route */}
          <div className="space-y-4">
            {groupBookingsByBusAndRoute(filteredTomorrowBookings).map((group, idx) => {
              const sectionKey = `tomorrow-${group.bus_number}-${group.route_name}`;
              const isExpanded = expandedSections[sectionKey];
              
              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Section Header */}
                  <div 
                    className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-colors"
                    onClick={() => toggleSection(sectionKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-purple-600 text-white p-2 rounded-lg">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Bus {group.bus_number}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Route className="w-4 h-4" />
                              {group.route_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {group.origin} → {group.destination}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {group.departure_time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Passengers</p>
                          <p className="text-xl font-bold text-gray-900">{group.bookings.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Revenue</p>
                          <p className="text-xl font-bold text-green-600">${group.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Seats</p>
                          <p className="text-xl font-bold text-purple-600">{group.totalSeats}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Passenger List */}
                  {isExpanded && (
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone Number</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seat Numbers</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {group.bookings.map((booking, bookingIdx) => (
                              <tr key={bookingIdx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{bookingIdx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">{booking.passengerName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{booking.phoneNumber}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{booking.seatsBooked || 1}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{booking.seatNumbers?.join(', ') || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm font-medium text-green-600">${booking.totalPrice?.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{new Date(booking.bookingTime).toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredTomorrowBookings.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
                <p className="text-gray-600">There are no bookings matching your filters for tomorrow.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={reportData.bookingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Booking vs Revenue Comparison */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings vs Revenue</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={reportData.bookingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#3B82F6" strokeWidth={2} name="Bookings" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Routes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Routes</h2>
              <div className="space-y-3">
                {reportData.routePerformance.slice(0, 5).map((route, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold`}
                           style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{route.routeName}</p>
                        <p className="text-sm text-gray-600">{route.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${route.revenue?.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{route.occupancyRate}% occupancy</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Buses */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Buses</h2>
              <div className="space-y-3">
                {reportData.busPerformance.slice(0, 5).map((bus, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold`}
                           style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Bus {bus.bus_number}</p>
                        <p className="text-sm text-gray-600">{bus.totalTrips} trips</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${bus.revenue?.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{bus.avgOccupancy}% occupancy</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorReports;
