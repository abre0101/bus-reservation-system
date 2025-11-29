// Use sessionStorage for better security - tokens cleared when browser closes
export const getStoredToken = () => {
  return sessionStorage.getItem('token')
}

export const setStoredToken = (token) => {
  sessionStorage.setItem('token', token)
}

export const removeStoredToken = () => {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}


export const isTokenExpired = (token) => {
  if (!token) return true
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch (error) {
    return true
  }
}

export const getUserRole = () => {
  const token = getStoredToken()
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role
  } catch (error) {
    return null
  }
}

export const hasRole = (requiredRole) => {
  const userRole = getUserRole()
  return userRole === requiredRole
}