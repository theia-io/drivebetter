import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log(process.env);

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/drivebetter',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/oauth/google/callback',
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200,http://localhost:4201',
  
  // API
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
} as const;

// Validation function
export function validateEnv() {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !env[key as keyof typeof env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}

// Helper function to get CORS origins
export function getCorsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',').map(origin => origin.trim());
}

// Helper function to check if in development
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

// Helper function to check if in production
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}
