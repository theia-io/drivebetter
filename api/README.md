# DriveBetter API

Next.js (LTS, Pages Router) + Express + MongoDB + Swagger

This service provides both:
- A **web frontend** (Next.js)
- A **REST API** (Express) with **auto-generated Swagger docs**

---

## Features
- **Next.js 14 LTS** (Pages Router, React 18)
- **Express server** (custom server.ts) for API + Swagger
- **MongoDB via Mongoose**
- **JWT auth + Google OAuth (extensible)**
- **Swagger docs** at [/api/docs](http://localhost:3000/api/docs) (generated with swagger-jsdoc)
- **Seed scripts** to populate test data
- **Dockerized** (app + db with `docker-compose`)

---

## Getting Started (Local Dev)

### 1. Install dependencies
```bash
npm install
````

### 2. Start MongoDB + app (Docker)

```bash
docker-compose up --build
```

* API & web: [http://localhost:3000](http://localhost:3000)
* Swagger docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* MongoDB: mongodb://localhost:27017/drivebetter

### 3. Dev mode (without Docker)

```bash
npm run dev
```

---

## Scripts

* `npm run dev` → start Express + Next.js with hot reload
* `npm run dev:next` → run Next.js only (frontend debug)
* `npm run build` → build Next.js + compile `server.ts` → `dist/`
* `npm run start` → run production server (`dist/server.js`)
* `npm run seed` → seed test data into MongoDB
* `npm test` → run Jest tests

---

## Project Structure

```
api/
├─ pages/                # Next.js Pages Router (frontend)
├─ public/               # static assets
├─ src/
│  ├─ lib/               # db, auth, models, oauth, seeding
│  ├─ routes/            # Express routes (REST API)
│  ├─ scripts/           # dev helper scripts
│  └─ types/             # shared TypeScript types
├─ tests/                # unit + integration tests
├─ config/               # env examples, seed configs
├─ server.ts             # Express + Next.js entrypoint
├─ docker-compose.yml    # local dev (app + mongo)
├─ Dockerfile            # production build
└─ README.md
```

---

## Swagger & API Docs

* **Swagger UI** → [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* **OpenAPI JSON** → [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)

API specs are generated automatically from JSDoc comments in `src/routes/*.ts`.

---

## Testing

* Unit tests in `tests/unit/`
* Integration tests in `tests/integration/`

Run:

```bash
npm test
```

---

## Deployment

The Dockerfile is multi-stage:

1. Install deps
2. Build Next.js + compile server
3. Create a slim runtime image

To build & run:

```bash
docker build -t drivebetter-api .
docker run -p 3000:3000 drivebetter-api
```
