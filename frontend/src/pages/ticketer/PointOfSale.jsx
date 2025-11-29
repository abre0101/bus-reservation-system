import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  Receipt, 
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  Printer,
  Download,
  Filter,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import ticketerService from '../../services/ticketerService';
import { toast } from 'react-toastify';
import { exportToPDF, exportToCSV, printReceipt } from '../../utils/exportUtils';

const PointOfSale = () => {
  const [transactions, setTransactions] = useState([]);
  const [todayStats, setTodayStats] = useState({
    totalSales: 0,
    transactionCount: 0,
    averageTicket: 0,
    cashSales: 0,
    chapaSales: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cashDrawer, setCashDrawer] = useState({
    openingBalance: 0,
    currentBalance: 0,
    totalSales: 0,
    totalCash: 0,
    totalChapa: 0,
    ticketsSold: 0,
    status: 'closed'
  });

  useEffect(() => {
    fetchTodayStats();
    fetchTransactions();
    fetchCashDrawer();
  }, [selectedDate, dateRange, startDate, endDate]);

  useEffect(() => {
    // Update date range based on selection
    const today = new Date();
    if (dateRange === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
      setSelectedDate(todayStr);
    } else if (dateRange === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      setStartDate(monthAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  }, [dateRange]);

  const fetchTodayStats = async () => {
    try {
      const response = await ticketerService.getSalesStats(selectedDate);
      if (response?.success && response?.stats) {
        setTodayStats(response.stats);
      } else {
        console.error('Invalid stats response:', response);
        toast.error('Failed to load sales statistics');
      }
    } catch (error) {
      console.error('Failed to fetch sales stats:', error);
      toast.error(error.message || 'Failed to load sales statistics');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await ticketerService.getTransactions({ date: selectedDate });
      if (response?.success && Array.isArray(response?.transactions)) {
        setTransactions(response.transactions);
      } else {
        console.error('Invalid transactions response:', response);
        toast.error('Failed to load transactions');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error(error.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCashDrawer = async () => {
    try {
      const response = await ticketerService.getCashDrawer();
      if (response?.success && response?.cashDrawer) {
        const cd = response.cashDrawer;
        setCashDrawer({
          openingBalance: cd.opening_balance || 0,
          currentBalance: cd.current_balance || 0,
          totalSales: cd.total_sales || 0,
          totalCash: cd.total_cash || 0,
          totalChapa: cd.total_chapa || 0,
          ticketsSold: cd.tickets_sold || 0,
          status: cd.status || 'closed'
        });
      } else {
        console.error('Invalid cash drawer response:', response);
        toast.error('Failed to load cash drawer status');
      }
    } catch (error) {
      console.error('Failed to fetch cash drawer:', error);
      toast.error(error.message || 'Failed to load cash drawer status');
    }
  };

  const handleOpenDrawer = async () => {
    try {
      if (cashDrawer.status === 'open') {
        toast.warning('Cash drawer is already open');
        return;
      }
      
      const amount = prompt('Enter opening balance (cash in drawer):');
      if (amount === null) return; // User cancelled
      
      const openingBalance = parseFloat(amount);
      if (isNaN(openingBalance) || openingBalance < 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      const response = await ticketerService.openCashDrawer(openingBalance);
      if (response?.success && response?.cashDrawer) {
        const cd = response.cashDrawer;
        setCashDrawer({
          openingBalance: cd.opening_balance || 0,
          currentBalance: cd.current_balance || 0,
          totalSales: cd.total_sales || 0,
          totalCash: cd.total_cash || 0,
          totalChapa: cd.total_chapa || 0,
          ticketsSold: cd.tickets_sold || 0,
          status: cd.status || 'open'
        });
        toast.success('Cash drawer opened! You can now start selling tickets.');
        fetchTransactions(); // Refresh to show session transactions
      } else {
        throw new Error(response?.message || 'Failed to open cash drawer');
      }
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      toast.error(error.message || 'Failed to open cash drawer');
    }
  };

  const handleCloseDrawer = async () => {
    try {
      if (cashDrawer.status === 'closed') {
        toast.warning('Cash drawer is already closed');
        return;
      }
      
      const confirmed = window.confirm(
        `Close cash drawer?\n\n` +
        `Opening Balance: ETB ${cashDrawer.openingBalance.toLocaleString()}\n` +
        `Total Sales: ETB ${cashDrawer.totalSales.toLocaleString()}\n` +
        `Tickets Sold: ${cashDrawer.ticketsSold}\n` +
        `Cash in Drawer: ETB ${cashDrawer.currentBalance.toLocaleString()}\n\n` +
        `This will end your session.`
      );
      
      if (!confirmed) return;
      
      const response = await ticketerService.closeCashDrawer();
      if (response?.success) {
        const cd = response.cashDrawer;
        setCashDrawer({
          openingBalance: cd.opening_balance || 0,
          currentBalance: cd.current_balance || 0,
          totalSales: cd.total_sales || 0,
          totalCash: cd.total_cash || 0,
          totalChapa: cd.total_chapa || 0,
          ticketsSold: cd.tickets_sold || 0,
          status: cd.status || 'closed'
        });
        toast.success(
          `Drawer closed! Total sales: ETB ${cd.total_sales?.toLocaleString() || 0}, ` +
          `Tickets sold: ${cd.tickets_sold || 0}`
        );
        fetchTransactions(); // Refresh transactions
      } else {
        throw new Error(response?.message || 'Failed to close cash drawer');
      }
    } catch (error) {
      console.error('Failed to close cash drawer:', error);
      toast.error(error.message || 'Failed to close cash drawer');
    }
  };

  const handlePrintReceipt = (transaction) => {
    try {
      printReceipt(transaction);
      toast.success('Receipt sent to printer');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt');
    }
  };

  const handleExportPDF = () => {
    try {
      const reportData = {
        date: selectedDate,
        cashDrawer: cashDrawer,
        stats: todayStats,
        transactions: filteredTransactions
      };
      
      exportToPDF(reportData);
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      const reportData = {
        date: selectedDate,
        cashDrawer: cashDrawer,
        stats: todayStats,
        transactions: filteredTransactions
      };
      
      exportToCSV(reportData);
      toast.success('CSV report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const getPaymentMethodColor = (method) => {
    return method === 'cash' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.completed;
  };

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter(transaction => {
    const matchesPayment = paymentFilter === 'all' || transaction.payment_method === paymentFilter;
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesPayment && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600 mt-1">
            {cashDrawer.status === 'open' 
              ? 'Session active - Recording all ticket sales' 
              : 'Open drawer to start your shift'}
          </p>
        </div>
        <div className="flex gap-3">
          {cashDrawer.status === 'closed' ? (
            <button 
              onClick={handleOpenDrawer}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <DollarSign className="h-4 w-4" />
              <span>Open Drawer</span>
            </button>
          ) : (
            <button 
              onClick={handleCloseDrawer}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-md"
            >
              <XCircle className="h-4 w-4" />
              <span>Close Drawer</span>
            </button>
          )}
          <div className="relative group">
            <button 
              className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
              >
                <FileText className="h-4 w-4 text-red-600" />
                <span>Export as PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>Export as CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Drawer Status */}
      {cashDrawer.status === 'closed' ? (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-200 p-3 rounded-full">
                <XCircle className="h-8 w-8 text-yellow-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-900">Cash Drawer is Closed</h3>
                <p className="text-yellow-700 mt-1">
                  Open the drawer to start your shift and begin selling tickets
                </p>
              </div>
            </div>
            <button 
              onClick={handleOpenDrawer}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              <DollarSign className="h-5 w-5" />
              <span>Open Drawer</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-200 p-2 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Drawer is Open - Session Active</h3>
                  <p className="text-green-700 text-sm">All tickets sold will be recorded in this session</p>
                </div>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>Close Drawer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-800">Opening Balance</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">
                    ETB {cashDrawer.openingBalance?.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Start of shift</p>
                </div>
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-800">Total Sales</p>
                  <p className="text-xl font-bold text-purple-900 mt-1">
                    ETB {cashDrawer.totalSales?.toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">This session</p>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-green-800">Cash in Drawer</p>
                  <p className="text-xl font-bold text-green-900 mt-1">
                    ETB {cashDrawer.currentBalance?.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Opening + Cash sales</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-orange-800">Tickets Sold</p>
                  <p className="text-xl font-bold text-orange-900 mt-1">
                    {cashDrawer.ticketsSold || 0}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">This session</p>
                </div>
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-800">Digital Payments</p>
                  <p className="text-xl font-bold text-indigo-900 mt-1">
                    ETB {cashDrawer.totalChapa?.toLocaleString()}
                  </p>
                  <p className="text-xs text-indigo-700 mt-1">Chapa/Online</p>
                </div>
                <ShoppingCart className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sales Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            Today's Sales Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Total Sales:</span>
              <span className="text-xl font-bold text-green-600">
                ETB {todayStats.totalSales?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Transactions:</span>
              <span className="font-semibold text-gray-900">{todayStats.transactionCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Average Ticket:</span>
              <span className="font-semibold text-gray-900">
                ETB {todayStats.averageTicket?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Cash Sales:</span>
              <span className="font-semibold text-green-600">
                ETB {todayStats.cashSales?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Chapa Sales:</span>
              <span className="font-semibold text-purple-600">
                ETB {todayStats.chapaSales?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="h-5 w-5 text-blue-600 mr-2" />
            Filters & Date Range
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quick Date Range
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => setDateRange('today')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateRange('week')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setDateRange('month')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Month
                </button>
              </div>
              <button
                onClick={() => setDateRange('custom')}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Range
              </button>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash Only</option>
                <option value="chapa">Chapa Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleExportPDF}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Receipt className="h-5 w-5 text-blue-600 mr-2" />
                {cashDrawer.status === 'open' ? 'Session Transactions' : 'Today\'s Transactions'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {cashDrawer.status === 'open' 
                  ? 'Tickets sold during current drawer session' 
                  : 'All transactions for today'}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{transaction._id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.customer_name || 'Walk-in Customer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.customer_phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-green-600">
                        ETB {transaction.amount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(transaction.payment_method)}`}>
                        {transaction.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handlePrintReceipt(transaction)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p>No transactions found for selected date</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={handleExportPDF}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-red-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Export PDF</span>
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <FileSpreadsheet className="h-8 w-8 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Export CSV</span>
          </button>
          
          <button 
            onClick={() => {
              const reportData = {
                date: selectedDate,
                cashDrawer: cashDrawer,
                stats: todayStats,
                transactions: filteredTransactions
              };
              exportToPDF(reportData);
              toast.success('Daily report generated');
            }}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Receipt className="h-8 w-8 text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Daily Report</span>
          </button>
          
          <button 
            onClick={() => {
              toast.info(`Cash in drawer: ETB ${cashDrawer.currentBalance?.toLocaleString()}`);
            }}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <DollarSign className="h-8 w-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Cash Count</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointOfSale;