module.exports = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Server settings
  port: process.env.PORT || 5000,
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    cookieExpiresIn: process.env.JWT_COOKIE_EXPIRES_IN || 30
  },
  
  // Upload settings
  uploads: {
    productImage: {
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedFormats: ['jpg', 'jpeg', 'png']
    }
  },
  
  // Location settings
  location: {
    maxDistance: 50, // in kilometers
    defaultCoordinates: {
      lat: 0,
      lng: 0
    }
  }
};