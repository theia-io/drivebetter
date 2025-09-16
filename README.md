# DriveBetter

A modern web application built with Next.js, Turborepo, Zustand, Docker, and Docker Compose.

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Monorepo**: Turborepo
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **TypeScript**: Full TypeScript support
- **Containerization**: Docker & Docker Compose
- **Package Manager**: npm

## 📁 Project Structure

```
drivebetter/
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── shared/              # Shared utilities and API client
│   └── config/              # Configuration management
├── docker-compose.yml       # Production Docker Compose
├── docker-compose.dev.yml   # Development Docker Compose
├── Dockerfile               # Production Docker image
├── Dockerfile.dev           # Development Docker image
└── turbo.json              # Turborepo configuration
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Run linting**:
   ```bash
   npm run lint
   ```

5. **Type checking**:
   ```bash
   npm run type-check
   ```

### Docker Development

1. **Development with Docker**:
   ```bash
   npm run docker:dev
   ```

2. **Production build with Docker**:
   ```bash
   npm run docker:prod
   ```

3. **Build Docker image**:
   ```bash
   npm run docker:build
   ```

4. **Run Docker container**:
   ```bash
   npm run docker:run
   ```

## 📦 Packages

### @ui
Shared UI components including Button and Card components.

### @shared
Common utilities and API client for making HTTP requests.

### @config
Centralized configuration management for the application.

## 🐳 Docker

The project includes both development and production Docker configurations:

- **Development**: Uses `Dockerfile.dev` with hot reloading
- **Production**: Uses multi-stage `Dockerfile` for optimized builds

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build all packages and apps
- `npm run lint` - Run ESLint across all packages
- `npm run test` - Run tests across all packages
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts
- `npm run docker:dev` - Start development with Docker
- `npm run docker:prod` - Start production with Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

## 🌐 Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NODE_ENV=development
```

## 📝 Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript configuration
- ✅ Tailwind CSS styling
- ✅ Zustand state management
- ✅ Turborepo monorepo setup
- ✅ Docker containerization
- ✅ Shared UI components
- ✅ API client utilities
- ✅ Configuration management
- ✅ Development and production environments

## 🚀 Deployment

The application is ready for deployment with Docker. Use the production Docker Compose configuration:

```bash
docker-compose up --build
```

The application will be available at `http://localhost:3000`.

## 📄 License

This project is private and proprietary.
