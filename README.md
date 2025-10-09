# DriveBetter Application Stack

This repository contains the full stack application for DriveBetter, consisting of a Next.js frontend (`web`), an Express/Node.js backend (`api`), and a MongoDB database (`mongo`), all orchestrated with Docker Compose.

## 🚀 Getting Started

You have two primary options for running the application: **Containerized** (recommended for production parity) or **Independently** (for deep local development).

### Prerequisites

| Component | Containerized (Docker) | Independent (Local) |
| :--- | :--- | :--- |
| **Containers** | Docker, Docker Compose | N/A |
| **Backend** | N/A | Node.js (v20+), npm |
| **Frontend** | N/A | Node.js (v20+), npm |
| **Database** | N/A | Local MongoDB instance (v7+) |

-----

## 🐳 Option 1: Running with Docker Compose (Recommended)

This method builds and runs all three services (`web`, `api`, `mongo`) within isolated containers.

### 1. Configure Environment Variables

**[optional]** Before running, you can replace the placeholder values in the `api` service within the `docker-compose.yml` file.

```yaml
    environment:
      # ... other variables
      GOOGLE_CLIENT_ID: <YOUR_ACTUAL_GOOGLE_CLIENT_ID>.apps.googleusercontent.com
      GOOGLE_CLIENT_SECRET: <YOUR_ACTUAL_GOOGLE_CLIENT_SECRET>
      GOOGLE_CALLBACK_URL: http://localhost:3000/api/v1/oauth/google/callback
```

### 2. Run the Stack

Execute the following command in the root directory:

```bash
docker compose up --build
```

This command will:

1.  Build the `web` and `api` Docker images.
2.  Pull the `mongo:7` image.
3.  Start all services, connecting them via an internal network.

### 3. Access the Application

The services are exposed via the following host ports:

| Service | Container Name | Port | Access URL |
| :------ | :--- | :--- | :--- |
| **Web (Next.js)** | `drivebetter_web` | `4200` | **http://localhost:4200** |
| **API (Node/Express)** | `drivebetter_api` | `3000` | **http://localhost:3000** |
| **Database** | `drivebetter_mongo` | `27017` | N/A (Internal) |

### 4. Stopping and Cleaning Up

| Command | Description |
| :--- | :--- |
| `docker compose stop` | Stops the running containers without removing them (quick restart). |
| `docker compose down` | Stops and removes containers and networks. |
| `docker compose down -v` | **Stops, removes all, AND removes the `mongo_data` volume (clears the database).** |

-----

## 💻 Option 2: Running Independently (Local Host)

To run without Docker, you must manage dependencies, ports, and environment variables locally.

### 1\. Environment Setup

1.  **Start MongoDB:** Ensure a local instance of MongoDB is running on **port 27017**.
    `docker compose up --build mongo`
2.  **API Environment:** In the `./api` directory, create a **`.env`** file with the following variables, ensuring the `MONGODB_URI` points to your local MongoDB:

    ```env
    NODE_ENV=development
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/drivebetter # Note: using localhost
    JWT_SECRET=dev_super_secret
    ```

### 2\. Install Dependencies

Run this command in **both** the `./api` and `./web/ui` directories:

```bash
# In ./api
npm install

# In ./web/ui
npm install
```

### 3\. Start Services

| Service | Directory | Command |
| :--- | :--- | :--- |
| **API (Backend)** | `./api` | `npm run dev` |
| **Web (Frontend)** | `./web/ui` | `npm run dev` |

-----

## 🛠️ API Management Commands

The API application includes scripts for building and managing the local database. These commands are executed **inside the API environment** (either the Docker container or the local API directory).

| Command | Location/Usage | Description |
| :--- | :--- | :--- |
| **`npm run dev`** | Local: `./api` or Docker: `docker compose exec api npm run dev` | Starts the API server with **hot-reloading** for development. |
| **`npm run build`** | Local: `./api` or Docker: `docker compose exec api npm run build` | Compiles the server-side TypeScript code to optimized JavaScript (in `dist`). |
| **`npm run start`** | Local: `./api` or Docker: `docker compose exec api npm run start` | Runs the compiled application from the `dist` folder in **production mode**. |
| --- | --- | --- |
| **`npm run seed:dev`** | Local: `./api` or Docker: `docker compose exec api npm run seed:dev` | **Seed Development Data** - Populates the database with test data. |
| **`npm run clear:dev`**| Local: `./api` or Docker: `docker compose exec api npm run clear:dev` | **Clear Development Data** - Removes all development data from the database. |
| **`npm run seed`** | Local: `./api` or Docker: `docker compose exec api npm run seed` | **Seed Production Data** - Executes the main seeding script (use with caution). |

## 🌐 Web Application Commands

The Web application is a standard Next.js project.

| Command | Location/Usage | Description |
| :--- | :--- | :--- |
| **`npm run dev`** | Local: `./web/ui` or Docker: `docker compose exec web npm run dev` | Starts Next.js in development mode on **port 4200**. |
| **`npm run build`** | Local: `./web/ui` or Docker: `docker compose exec web npm run build` | Creates an optimized production build (output to `.next`). |
| **`npm run start`** | Local: `./web/ui` or Docker: `docker compose exec web npm run start` | Runs the production-built application on **port 4200**. |
| **`npm run type-check`**| Local: `./web/ui` or Docker: `docker compose exec web npm run type-check` | Manually runs the TypeScript compiler check. |