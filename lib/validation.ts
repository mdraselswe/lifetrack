/**
 * Email validation utility
 * Validates email format using regex pattern
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Password validation utility
 * Validates password strength
 */
export const isValidPassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' }
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'পাসওয়ার্ড ১২৮ অক্ষরের বেশি হতে পারবে না' }
  }
  
  return { isValid: true }
}

/**
 * Name validation utility
 * Validates name format
 */
export const isValidName = (name: string): { isValid: boolean; message?: string } => {
  if (name.trim().length < 2) {
    return { isValid: false, message: 'নাম কমপক্ষে ২ অক্ষর হতে হবে' }
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, message: 'নাম ৫০ অক্ষরের বেশি হতে পারবে না' }
  }
  
  // Check for valid characters (letters, spaces, and common Bengali characters)
  const nameRegex = /^[a-zA-Z\u0980-\u09FF\s]+$/
  if (!nameRegex.test(name.trim())) {
    return { isValid: false, message: 'নামে শুধুমাত্র অক্ষর এবং স্পেস ব্যবহার করুন' }
  }
  
  return { isValid: true }
}

/**
 * Form validation utility
 * Validates complete registration form
 */
export const validateRegistrationForm = (data: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): { isValid: boolean; message?: string } => {
  // Check if all fields are filled
  if (!data.name || !data.email || !data.password || !data.confirmPassword) {
    return { isValid: false, message: 'সব ফিল্ড পূরণ করুন' }
  }

  // Validate name
  const nameValidation = isValidName(data.name)
  if (!nameValidation.isValid) {
    return { isValid: false, message: nameValidation.message }
  }

  // Validate email
  if (!isValidEmail(data.email)) {
    return { isValid: false, message: 'সঠিক ইমেইল ঠিকানা দিন' }
  }

  // Validate password
  const passwordValidation = isValidPassword(data.password)
  if (!passwordValidation.isValid) {
    return { isValid: false, message: passwordValidation.message }
  }

  // Check password confirmation
  if (data.password !== data.confirmPassword) {
    return { isValid: false, message: 'পাসওয়ার্ড মিলছে না' }
  }

  return { isValid: true }
}

/**
 * Login form validation utility
 * Validates login form
 */
export const validateLoginForm = (data: {
  email: string
  password: string
}): { isValid: boolean; message?: string } => {
  // Check if all fields are filled
  if (!data.email || !data.password) {
    return { isValid: false, message: 'সব ফিল্ড পূরণ করুন' }
  }

  // Validate email
  if (!isValidEmail(data.email)) {
    return { isValid: false, message: 'সঠিক ইমেইল ঠিকানা দিন' }
  }

  return { isValid: true }
}
