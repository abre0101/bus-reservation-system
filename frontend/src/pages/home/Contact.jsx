import { useState } from 'react'
import { Phone, Mail, MapPin, Send, Clock, MessageCircle, Users, HeadphonesIcon } from 'lucide-react'
import PublicPageLayout from '../../components/common/PublicPageLayout'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Form submitted:', formData)
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' })
    setIsSubmitting(false)
  }

  return (
    <PublicPageLayout>
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl mb-6 shadow-xl transform hover:scale-110 transition-all duration-300">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent mb-4">
            Get In Touch
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Have questions about our bus services? We're here to help! Reach out to our friendly team 
            and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Information Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Phone Card */}
            <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/60 hover:shadow-2xl hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300 shadow-md">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Call Us</h3>
                  <p className="text-blue-600 font-semibold text-base">+251 911 123 456</p>
                  <p className="text-blue-600 font-semibold text-base">+251 922 234 567</p>
                  <p className="text-gray-600 text-sm mt-2 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Available 24/7 for emergencies
                  </p>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/60 hover:shadow-2xl hover:border-green-400 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl group-hover:from-green-100 group-hover:to-green-200 transition-all duration-300 shadow-md">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Email Us</h3>
                  <p className="text-green-600 font-semibold text-base">support@ethiobus.com</p>
                  <p className="text-green-600 font-semibold text-base">info@ethiobus.com</p>
                  <p className="text-gray-600 text-sm mt-2 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    We reply within 2 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/60 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300 shadow-md">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Visit Us</h3>
                  <p className="text-purple-600 font-semibold text-base">Bole Road</p>
                  <p className="text-purple-600 font-semibold text-base">Addis Ababa, Ethiopia</p>
                  <p className="text-gray-600 text-sm mt-2 flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    Main office location
                  </p>
                </div>
              </div>
            </div>

            {/* Business Hours Card */}
            <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/60 hover:shadow-2xl hover:border-indigo-400 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center space-x-3 mb-4">
                <Clock className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-lg">Business Hours</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">Monday - Friday</span>
                  <span className="text-indigo-600 font-medium text-sm">8:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">Saturday</span>
                  <span className="text-indigo-600 font-medium text-sm">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">Sunday</span>
                  <span className="text-indigo-600 font-medium text-sm">9:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600 text-sm">Emergency Support</span>
                  <span className="text-green-600 font-medium text-sm flex items-center">
                    <HeadphonesIcon className="h-3 w-3 mr-1" />
                    24/7 Available
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/60">
              <div className="mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent mb-3">Send us a Message</h2>
                <p className="text-gray-700 text-lg">Fill out the form below and we'll get back to you shortly</p>
              </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                      placeholder="What is this regarding?"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 resize-none transition-all duration-200 hover:border-gray-400"
                      placeholder="Tell us how we can help you..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl group"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        <span className="text-lg">Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-3 group-hover:translate-x-1 transition-transform" />
                        <span className="text-lg">Send Message</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600 text-sm">
                    By submitting this form, you agree to our{' '}
                    <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">
                      privacy policy
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { value: "15 min", label: "Average Response Time", color: "blue", icon: Clock },
            { value: "24/7", label: "Emergency Support", color: "green", icon: HeadphonesIcon },
            { value: "98%", label: "Customer Satisfaction", color: "purple", icon: Users }
          ].map((stat, index) => (
            <div key={index} className="group relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/60 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <stat.icon className={`h-8 w-8 text-${stat.color}-600 mx-auto mb-4`} />
                <div className={`text-3xl font-bold text-${stat.color}-600 mb-2`}>{stat.value}</div>
                <div className="text-gray-700 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  )
}

export default Contact