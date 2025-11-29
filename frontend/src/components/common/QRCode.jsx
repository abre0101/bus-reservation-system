import React from 'react'
import QRCode from 'qrcode.react'

const QRCodeComponent = ({ 
  value, 
  size = 128, 
  level = 'M',
  className = '' 
}) => {
  if (!value) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <span className="text-gray-400 text-sm">No data</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <QRCode
        value={value}
        size={size}
        level={level}
        includeMargin
        renderAs="canvas"
      />
    </div>
  )
}

export default QRCodeComponent