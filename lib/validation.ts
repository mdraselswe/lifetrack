import { t } from './i18n'

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
    return { isValid: false, message: t('validation.passwordMin') }
  }
  
  if (password.length > 128) {
    return { isValid: false, message: t('validation.passwordMax') }
  }
  
  return { isValid: true }
}

/**
 * Name validation utility
 * Validates name format
 */
export const isValidName = (name: string): { isValid: boolean; message?: string } => {
  if (name.trim().length < 2) {
    return { isValid: false, message: t('validation.nameMin') }
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, message: t('validation.nameMax') }
  }
  
  // Check for valid characters (letters, spaces, and common Bengali characters)
  const nameRegex = /^[a-zA-Z\u0980-\u09FF\s]+$/
  if (!nameRegex.test(name.trim())) {
    return { isValid: false, message: t('validation.nameChars') }
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
    return { isValid: false, message: t('validation.allFields') }
  }

  // Validate name
  const nameValidation = isValidName(data.name)
  if (!nameValidation.isValid) {
    return { isValid: false, message: nameValidation.message }
  }

  // Validate email
  if (!isValidEmail(data.email)) {
    return { isValid: false, message: t('validation.validEmail') }
  }

  // Validate password
  const passwordValidation = isValidPassword(data.password)
  if (!passwordValidation.isValid) {
    return { isValid: false, message: passwordValidation.message }
  }

  // Check password confirmation
  if (data.password !== data.confirmPassword) {
    return { isValid: false, message: t('validation.passwordMismatch') }
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
    return { isValid: false, message: t('validation.allFields') }
  }

  // Validate email
  if (!isValidEmail(data.email)) {
    return { isValid: false, message: t('validation.validEmail') }
  }

  return { isValid: true }
}
