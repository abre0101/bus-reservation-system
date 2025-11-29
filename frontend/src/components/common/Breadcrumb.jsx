import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const Breadcrumb = ({ items }) => {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/" className="text-gray-400 hover:text-gray-500">
            <Home className="h-5 w-5" />
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={item.path || index}>
            <div className="flex items-center">
              <ChevronRight className="h-5 w-5 text-gray-400" />
              {item.path ? (
                <Link
                  to={item.path}
                  className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb