import { Link } from 'react-router-dom'
import LoginForm from '../../components/auth/LoginForm'
import PublicPageLayout from '../../components/common/PublicPageLayout'

const Login = () => {
  return (
    <PublicPageLayout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Enhanced Brand / Marketing Panel */}
            <div className="space-y-8">
              <Link
                to="/"
                className="inline-flex items-center space-x-4 group"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl ring-2 ring-blue-400/30 group-hover:scale-105 transition-all duration-300">
                  <span className="text-white text-2xl font-black">EB</span>
                </div>
                <div className="text-left">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                    EthioBus
                  </h1>
                  <p className="text-gray-600 text-base font-medium mt-1">Travel with confidence</p>
                </div>
              </Link>

              <div className="space-y-6">
                <h2 className="text-5xl md:text-6xl font-black leading-tight text-gray-900">
                  Journey
                  <span className="block text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text">
                    Smarter
                  </span>
                </h2>
                <p className="text-gray-700 text-xl max-w-lg leading-relaxed">
                  Experience Ethiopia like never before. Book your bus tickets instantly, choose your preferred seats, and travel with complete peace of mind.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <span className="px-4 py-2.5 rounded-full bg-blue-50 text-blue-700 text-base font-medium ring-2 ring-blue-200 backdrop-blur-sm hover:bg-blue-100 transition-all duration-300 cursor-default">
                    🎫 Instant e-ticket
                  </span>
                  <span className="px-4 py-2.5 rounded-full bg-green-50 text-green-700 text-base font-medium ring-2 ring-green-200 backdrop-blur-sm hover:bg-green-100 transition-all duration-300 cursor-default">
                    💳 Secure payments
                  </span>
                  <span className="px-4 py-2.5 rounded-full bg-purple-50 text-purple-700 text-base font-medium ring-2 ring-purple-200 backdrop-blur-sm hover:bg-purple-100 transition-all duration-300 cursor-default">
                    💺 Seat selection
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">50K+</div>
                  <div className="text-gray-600 text-sm font-medium">Happy Travelers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">6+</div>
                  <div className="text-gray-600 text-sm font-medium">Routes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">24/7</div>
                  <div className="text-gray-600 text-sm font-medium">Support</div>
                </div>
              </div>
            </div>

            {/* Login Form Panel */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <LoginForm />
              </div>
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="text-center mt-16 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 text-gray-600">
              <p className="text-sm">
                © {new Date().getFullYear()} EthioBus. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <Link to="/privacy" className="text-sm hover:text-blue-600 transition-colors duration-200">
                  Privacy
                </Link>
                <Link to="/terms" className="text-sm hover:text-blue-600 transition-colors duration-200">
                  Terms
                </Link>
                <Link to="/contact" className="text-sm hover:text-blue-600 transition-colors duration-200">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}

export default Login