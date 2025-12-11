import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Bus, Phone, Mail, MapPin, Facebook, Twitter, Instagram, 
  Heart, ArrowRight
} from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { path: '/about', label: 'About Us' },
    { path: '/contact', label: 'Contact' },
    { path: '/faq', label: 'FAQ' },
    { path: '/search', label: 'Book Tickets' },
    { path: '/terms-and-policies', label: 'Terms & Policies' },
  ]

  const popularRoutes = [
    { path: '/search?from=Addis Ababa&to=Hawassa', label: 'Addis → Hawassa' },
    { path: '/search?from=Addis Ababa&to=Bahir Dar', label: 'Addis → Bahir Dar' },
    { path: '/search?from=Addis Ababa&to=Dire Dawa', label: 'Addis → Dire Dawa' },
  ]

  const socialLinks = [
    { icon: Telegram, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter */}
      <div className="bg-blue-600 py-8">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>
          <p className="text-blue-100 text-sm mb-4">Get the latest deals and routes</p>
          <div className="flex max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-4 py-2 rounded-l-lg text-gray-900 focus:outline-none"
            />
            <button className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold px-4 py-2 rounded-r-lg transition-colors flex items-center">
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Bus className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold">EthioBus</span>
            </div>
            <p className="text-gray-300 text-sm mb-4 max-w-md">
              Ethiopia's trusted bus service. Safe, comfortable, and reliable travel across the country.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="bg-gray-700 hover:bg-blue-600 p-2 rounded transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-blue-400">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-300 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-blue-400">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-blue-400" />
                <a href="tel:+251911223344" className="text-gray-300 text-sm hover:text-white">
                  +251 900469816
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <a href="mailto:info@ethiobus.com" className="text-gray-300 text-sm hover:text-white">
                  abrahamworku10a@gmail.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300 text-sm">Addis Ababa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moving Bus Animation */}
      <div className="relative border-t border-gray-700 overflow-hidden bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800">
        {/* Road */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 opacity-50">
          <div className="absolute inset-0 flex space-x-8 animate-road-lines">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-8 h-1 bg-white opacity-70"></div>
            ))}
          </div>
        </div>

        {/* Animated Bus */}
        <div className="relative py-8 overflow-hidden">
          <div className="animate-bus-drive relative">
            <div className="flex items-center space-x-3 text-blue-400">
              <div className="relative">
                <Bus className="h-16 w-16" />
                {/* Door opening indicator */}
                <div className="absolute top-1/2 right-0 h-12 bg-yellow-300 animate-door-open rounded-r"></div>
              </div>
              <span className="text-lg font-semibold whitespace-nowrap">EthioBus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 py-4 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="flex items-center space-x-2 text-gray-300 text-sm">
              <span>© {currentYear} EthioBus</span>
              <span>•</span>
              <span className="flex items-center">
                Made with <Heart className="h-3 w-3 text-red-500 mx-1" fill="currentColor" /> in Ethiopia
              </span>
            </div>
            <div className="flex space-x-4 text-gray-300 text-sm">
              <Link to="/terms-and-policies" className="hover:text-white">Terms & Policies</Link>
              <Link to="/privacy" className="hover:text-white">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer