import React from 'react'
import { Search } from 'lucide-react'

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  onSearch,
  ...props
}) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch?.(value)
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-field pl-10 pr-4 w-full"
          {...props}
        />
      </div>
    </form>
  )
}

export default SearchBar