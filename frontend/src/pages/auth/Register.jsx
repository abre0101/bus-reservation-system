import { Link } from 'react-router-dom'
import RegisterForm from '../../components/auth/RegisterForm'
import PublicPageLayout from '../../components/common/PublicPageLayout'

const Register = () => {
  return (
    <PublicPageLayout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Enhanced Brand / Value Prop */}
            <div className="space-y-8">
              <Link to="/" className="inline-flex items-center space-x-4 group">
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
                  Start Your
                  <span className="block text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text">
                    Journey
                  </span>
                </h2>
                <p className="text-gray-700 text-xl max-w-lg leading-relaxed">
                  Join thousands of travelers across Ethiopia. Create your account to book seats, manage trips, and experience hassle-free bus travel.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <span className="px-4 py-2.5 rounded-full bg-green-50 text-green-700 text-base font-medium ring-2 ring-green-200 backdrop-blur-sm hover:bg-green-100 transition-all duration-300 cursor-default">
                    ⚡ Fast sign up
                  </span>
                  <span className="px-4 py-2.5 rounded-full bg-blue-50 text-blue-700 text-base font-medium ring-2 ring-blue-200 backdrop-blur-sm hover:bg-blue-100 transition-all duration-300 cursor-default">
                    🔒 Secure data
                  </span>
                  <span className="px-4 py-2.5 rounded-full bg-purple-50 text-purple-700 text-base font-medium ring-2 ring-purple-200 backdrop-blur-sm hover:bg-purple-100 transition-all duration-300 cursor-default">
                    💰 No hidden fees
                  </span>
                </div>
              </div>

              {/* Benefits List */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Instant booking confirmation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Digital QR code tickets</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Easy trip management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">24/7 customer support</span>
                </div>
              </div>

              {/* Already have account link */}
              <div className="pt-6 border-t border-gray-200">
                <p className="text-gray-700">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    className="text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-200 underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>

            {/* Register Form Panel */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <RegisterForm />
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

export default Register