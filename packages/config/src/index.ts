export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: 10000,
  },
  app: {
    name: 'DriveBetter',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableDebugMode: process.env.NODE_ENV === 'development',
  },
} as const

export type Config = typeof config
