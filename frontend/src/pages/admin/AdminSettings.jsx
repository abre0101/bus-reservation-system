import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminSettings = () => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('refund')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      setSettings(response.data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      alert('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put('/settings', settings)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to default values?')) return
    try {
      setSaving(true)
      const response = await api.post('/settings/reset')
      setSettings(response.data.settings)
      alert('Settings reset to default values')
    } catch (error) {
      console.error('Error resetting settings:', error)
      alert('Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
  if (!settings) return <div className="text-center py-12"><p className="text-gray-500">Failed to load settings</p></div>

  const tabs = [
    { id: 'refund', name: 'Refund Policy', icon: '💰' },
    { id: 'cancellation', name: 'Cancellation', icon: '❌' },
    { id: 'baggage', name: 'Baggage', icon: '🧳' },
    { id: 'checkin', name: 'Check-in', icon: '✅' },
    { id: 'booking', name: 'Booking Limits', icon: '📋' },
    { id: 'payment', name: 'Payment', icon: '💳' },
    { id: 'general', name: 'General', icon: '⚙️' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system policies and limits</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} disabled={saving} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Reset to Default
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <span className="mr-2">{tab.icon}</span>{tab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'refund' && <RefundTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'cancellation' && <CancellationTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'baggage' && <BaggageTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'checkin' && <CheckinTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'booking' && <BookingTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'payment' && <PaymentTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'general' && <GeneralTab settings={settings} updateSetting={updateSetting} />}
        </div>
      </div>
    </div>
  )
}

const RefundTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Refund Policy</h3>
      <label className="flex items-center cursor-pointer">
        <input type="checkbox" checked={settings.refund_policy.enabled} onChange={(e) => updateSetting('refund_policy', 'enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
        <span className="ml-2 text-sm">Enable Refunds</span>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div><label className="block text-sm font-medium mb-2">Refund % (24+ hours)</label><input type="number" value={settings.refund_policy.refund_percentage_24h} onChange={(e) => updateSetting('refund_policy', 'refund_percentage_24h', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" max="100" /></div>
      <div><label className="block text-sm font-medium mb-2">Refund % (12-24 hours)</label><input type="number" value={settings.refund_policy.refund_percentage_12h} onChange={(e) => updateSetting('refund_policy', 'refund_percentage_12h', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" max="100" /></div>
      <div><label className="block text-sm font-medium mb-2">Refund % (6-12 hours)</label><input type="number" value={settings.refund_policy.refund_percentage_6h} onChange={(e) => updateSetting('refund_policy', 'refund_percentage_6h', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" max="100" /></div>
      <div><label className="block text-sm font-medium mb-2">Refund % (2-6 hours)</label><input type="number" value={settings.refund_policy.refund_percentage_2h} onChange={(e) => updateSetting('refund_policy', 'refund_percentage_2h', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" max="100" /></div>
      <div><label className="block text-sm font-medium mb-2">Processing Fee (ETB)</label><input type="number" value={settings.refund_policy.processing_fee} onChange={(e) => updateSetting('refund_policy', 'processing_fee', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Processing Days</label><input type="number" value={settings.refund_policy.refund_processing_days} onChange={(e) => updateSetting('refund_policy', 'refund_processing_days', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="1" /></div>
    </div>
  </div>
)

const CancellationTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Cancellation Policy</h3>
      <label className="flex items-center cursor-pointer">
        <input type="checkbox" checked={settings.cancellation_policy.enabled} onChange={(e) => updateSetting('cancellation_policy', 'enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
        <span className="ml-2 text-sm">Enable Cancellations</span>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <label className="flex items-center"><input type="checkbox" checked={settings.cancellation_policy.allow_cancellation} onChange={(e) => updateSetting('cancellation_policy', 'allow_cancellation', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Allow User Cancellations</span></label>
      <label className="flex items-center"><input type="checkbox" checked={settings.cancellation_policy.cancellation_reasons_required} onChange={(e) => updateSetting('cancellation_policy', 'cancellation_reasons_required', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Require Reason</span></label>
      <div><label className="block text-sm font-medium mb-2">Deadline (hours before)</label><input type="number" value={settings.cancellation_policy.cancellation_deadline_hours} onChange={(e) => updateSetting('cancellation_policy', 'cancellation_deadline_hours', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Auto-Cancel Unpaid (minutes)</label><input type="number" value={settings.cancellation_policy.auto_cancel_unpaid_minutes} onChange={(e) => updateSetting('cancellation_policy', 'auto_cancel_unpaid_minutes', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
    </div>
  </div>
)

const BaggageTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Baggage Policy</h3>
      <label className="flex items-center cursor-pointer">
        <input type="checkbox" checked={settings.baggage_policy.enabled} onChange={(e) => updateSetting('baggage_policy', 'enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
        <span className="ml-2 text-sm">Enable Baggage Policy</span>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div><label className="block text-sm font-medium mb-2">Free Baggage (kg)</label><input type="number" value={settings.baggage_policy.free_baggage_weight_kg} onChange={(e) => updateSetting('baggage_policy', 'free_baggage_weight_kg', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Extra Fee per kg (ETB)</label><input type="number" value={settings.baggage_policy.extra_baggage_fee_per_kg} onChange={(e) => updateSetting('baggage_policy', 'extra_baggage_fee_per_kg', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Max Baggage (kg)</label><input type="number" value={settings.baggage_policy.max_baggage_weight_kg} onChange={(e) => updateSetting('baggage_policy', 'max_baggage_weight_kg', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Hand Luggage (kg)</label><input type="number" value={settings.baggage_policy.hand_luggage_weight_kg} onChange={(e) => updateSetting('baggage_policy', 'hand_luggage_weight_kg', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Oversized Fee (ETB)</label><input type="number" value={settings.baggage_policy.oversized_baggage_fee} onChange={(e) => updateSetting('baggage_policy', 'oversized_baggage_fee', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
    </div>
  </div>
)

const CheckinTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Check-in Policy</h3>
      <label className="flex items-center cursor-pointer">
        <input type="checkbox" checked={settings.checkin_policy.enabled} onChange={(e) => updateSetting('checkin_policy', 'enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
        <span className="ml-2 text-sm">Enable Check-in</span>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div><label className="block text-sm font-medium mb-2">Opens (hours before)</label><input type="number" value={settings.checkin_policy.checkin_opens_hours} onChange={(e) => updateSetting('checkin_policy', 'checkin_opens_hours', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Closes (minutes before)</label><input type="number" value={settings.checkin_policy.checkin_closes_minutes} onChange={(e) => updateSetting('checkin_policy', 'checkin_closes_minutes', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <label className="flex items-center"><input type="checkbox" checked={settings.checkin_policy.require_checkin} onChange={(e) => updateSetting('checkin_policy', 'require_checkin', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Require Check-in</span></label>
      <label className="flex items-center"><input type="checkbox" checked={settings.checkin_policy.allow_online_checkin} onChange={(e) => updateSetting('checkin_policy', 'allow_online_checkin', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Allow Online</span></label>
      <label className="flex items-center"><input type="checkbox" checked={settings.checkin_policy.send_checkin_reminder} onChange={(e) => updateSetting('checkin_policy', 'send_checkin_reminder', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Send Reminder</span></label>
      <div><label className="block text-sm font-medium mb-2">Reminder (hours before)</label><input type="number" value={settings.checkin_policy.reminder_hours_before} onChange={(e) => updateSetting('checkin_policy', 'reminder_hours_before', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
    </div>
  </div>
)

const BookingTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Booking Limits</h3>
      <label className="flex items-center cursor-pointer">
        <input type="checkbox" checked={settings.booking_limits.enabled} onChange={(e) => updateSetting('booking_limits', 'enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
        <span className="ml-2 text-sm">Enable Limits</span>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div><label className="block text-sm font-medium mb-2">Max Bookings per User/Day</label><input type="number" value={settings.booking_limits.max_bookings_per_user_per_day} onChange={(e) => updateSetting('booking_limits', 'max_bookings_per_user_per_day', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="1" /></div>
      <div><label className="block text-sm font-medium mb-2">Max Seats per Booking</label><input type="number" value={settings.booking_limits.max_seats_per_booking} onChange={(e) => updateSetting('booking_limits', 'max_seats_per_booking', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="1" /></div>
      <div><label className="block text-sm font-medium mb-2">Min Advance (hours)</label><input type="number" value={settings.booking_limits.min_booking_advance_hours} onChange={(e) => updateSetting('booking_limits', 'min_booking_advance_hours', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="0" /></div>
      <div><label className="block text-sm font-medium mb-2">Max Advance (days)</label><input type="number" value={settings.booking_limits.max_booking_advance_days} onChange={(e) => updateSetting('booking_limits', 'max_booking_advance_days', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="1" /></div>
    </div>
  </div>
)

const PaymentTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Payment Policy</h3>
      <label className="flex items-center cursor-pointer">
        <input type="checkbox" checked={settings.payment_policy.enabled} onChange={(e) => updateSetting('payment_policy', 'enabled', e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
        <span className="ml-2 text-sm">Enable Policy</span>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div><label className="block text-sm font-medium mb-2">Timeout (minutes)</label><input type="number" value={settings.payment_policy.payment_timeout_minutes} onChange={(e) => updateSetting('payment_policy', 'payment_timeout_minutes', parseInt(e.target.value))} className="w-full px-4 py-2 border rounded-lg" min="1" /></div>
      <label className="flex items-center"><input type="checkbox" checked={settings.payment_policy.require_payment_confirmation} onChange={(e) => updateSetting('payment_policy', 'require_payment_confirmation', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Require Confirmation</span></label>
      <label className="flex items-center"><input type="checkbox" checked={settings.payment_policy.partial_payment_allowed} onChange={(e) => updateSetting('payment_policy', 'partial_payment_allowed', e.target.checked)} className="rounded" /><span className="ml-2 text-sm">Allow Partial Payment</span></label>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-2">Payment Methods</label>
        <div className="grid grid-cols-2 gap-3">
          {['cash', 'chapa'].map((method) => (
            <label key={method} className="flex items-center">
              <input type="checkbox" checked={settings.payment_policy.accepted_methods.includes(method)} onChange={(e) => {
                const methods = e.target.checked ? [...settings.payment_policy.accepted_methods, method] : settings.payment_policy.accepted_methods.filter(m => m !== method)
                updateSetting('payment_policy', 'accepted_methods', methods)
              }} className="rounded" />
              <span className="ml-2 text-sm capitalize">{method.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
)

const GeneralTab = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">General Settings</h3>
    <div className="grid grid-cols-2 gap-6">
      <div><label className="block text-sm font-medium mb-2">Company Name</label><input type="text" value={settings.general_settings.company_name} onChange={(e) => updateSetting('general_settings', 'company_name', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
      <div><label className="block text-sm font-medium mb-2">Support Email</label><input type="email" value={settings.general_settings.support_email} onChange={(e) => updateSetting('general_settings', 'support_email', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
      <div><label className="block text-sm font-medium mb-2">Support Phone</label><input type="tel" value={settings.general_settings.support_phone} onChange={(e) => updateSetting('general_settings', 'support_phone', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
      <div><label className="block text-sm font-medium mb-2">Currency</label><input type="text" value={settings.general_settings.currency} onChange={(e) => updateSetting('general_settings', 'currency', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
      <div><label className="block text-sm font-medium mb-2">Timezone</label><input type="text" value={settings.general_settings.timezone} onChange={(e) => updateSetting('general_settings', 'timezone', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
      <div><label className="block text-sm font-medium mb-2">Language</label><input type="text" value={settings.general_settings.language} onChange={(e) => updateSetting('general_settings', 'language', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
    </div>
  </div>
)

export default AdminSettings
