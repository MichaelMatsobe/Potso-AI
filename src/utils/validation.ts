import { ValidationError, ValidationResult } from '../types';

// ==================== EMAIL VALIDATION ====================
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!email || email.trim() === '') {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED',
    });
  } else if (!isValidEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
      code: 'INVALID_FORMAT',
    });
  } else if (email.length > 254) {
    errors.push({
      field: 'email',
      message: 'Email is too long (max 254 characters)',
      code: 'TOO_LONG',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ==================== PASSWORD VALIDATION ====================
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!password || password === '') {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED',
    });
  } else {
    if (password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters',
        code: 'TOO_SHORT',
      });
    }
    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'NO_UPPERCASE',
      });
    }
    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'NO_LOWERCASE',
      });
    }
    if (!/[0-9]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'NO_NUMBER',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== NAME VALIDATION ====================
export const validateDisplayName = (name: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!name || name.trim() === '') {
    errors.push({
      field: 'displayName',
      message: 'Display name is required',
      code: 'REQUIRED',
    });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'displayName',
      message: 'Display name must be at least 2 characters',
      code: 'TOO_SHORT',
    });
  } else if (name.length > 50) {
    errors.push({
      field: 'displayName',
      message: 'Display name must not exceed 50 characters',
      code: 'TOO_LONG',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== MESSAGE VALIDATION ====================
export const validateMessage = (content: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!content || content.trim() === '') {
    errors.push({
      field: 'content',
      message: 'Message cannot be empty',
      code: 'REQUIRED',
    });
  } else if (content.length > 10000) {
    errors.push({
      field: 'content',
      message: 'Message is too long (max 10,000 characters)',
      code: 'TOO_LONG',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== FILE VALIDATION ====================
export const validateFile = (
  file: File,
  maxSizeInMB: number = 5,
  allowedMimeTypes: string[] = ['image/*', 'application/pdf']
): ValidationResult => {
  const errors: ValidationError[] = [];
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  if (!file) {
    errors.push({
      field: 'file',
      message: 'File is required',
      code: 'REQUIRED',
    });
    return { isValid: false, errors };
  }

  if (file.size > maxSizeInBytes) {
    errors.push({
      field: 'file',
      message: `File is too large (max ${maxSizeInMB}MB)`,
      code: 'TOO_LARGE',
    });
  }

  const mimeTypeValid = allowedMimeTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0];
      return file.type.startsWith(baseType + '/');
    }
    return file.type === type;
  });

  if (!mimeTypeValid) {
    errors.push({
      field: 'file',
      message: `File type not supported. Allowed: ${allowedMimeTypes.join(', ')}`,
      code: 'INVALID_TYPE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== COMBINED VALIDATION ====================
export const validateLoginForm = (email: string, password: string) => {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);

  return {
    isValid: emailResult.isValid && passwordResult.isValid,
    errors: [...emailResult.errors, ...passwordResult.errors],
  };
};

export const validateSignupForm = (
  email: string,
  password: string,
  displayName: string,
  passwordConfirm: string
) => {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const nameResult = validateDisplayName(displayName);
  const allErrors = [...emailResult.errors, ...passwordResult.errors, ...nameResult.errors];

  if (password !== passwordConfirm) {
    allErrors.push({
      field: 'passwordConfirm',
      message: 'Passwords do not match',
      code: 'MISMATCH',
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
};
