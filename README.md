# 🔗 SwiftLink — URL Shortener

A fast, lightweight URL shortener built with **Node.js**, **Express**, **PostgreSQL**, and **Redis**. Paste any long URL and get a compact short link instantly. The entire stack is containerized with **Docker Compose** for effortless setup.

---

## ✨ Features

- **Instant URL shortening** — converts long URLs into clean short codes using a Base62 encoding algorithm
- **Persistent storage** — short URL mappings stored in PostgreSQL
- **Redis counter** — atomic, fast counter for unique short code generation
- **URL validation** — rejects non-http/https URLs on both frontend and backend
- **Redirect engine** — `GET /r/:shortCode` resolves and redirects to the original URL
- **Clean UI** — responsive frontend with copy-to-clipboard, toast notifications, and inline validation
- **Fully Dockerized** — one command to spin up the entire stack (Postgres + Redis + App + Migrations)

---

## 🗂️ Project Structure

```
url-shortner/
├── docker-compose.yaml       # Orchestrates all services
└── app/
    ├── Dockerfile            # Node.js app image (node:22-alpine)
    ├── index.js              # Express server — routes & shortening logic
    ├── db.js                 # PostgreSQL connection pool (pg)
    ├── redis-client.js       # Redis client (ioredis-compatible)
    ├── .env                  # Environment variables (not committed)
    ├── package.json
    ├── migrations/
    │   └── *_my-migration.js # Creates the `urls` table via node-pg-migrate
    └── public/
        ├── index.html        # Frontend UI
        ├── script.js         # Frontend logic (fetch, clipboard, toasts)
        └── style.css         # Styling
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 22+](https://nodejs.org/) *(only needed for local development without Docker)*

---

### Running with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/radhechaudhary/URL_SHORTNER.git
   cd URL_SHORTNER
   ```

2. **Create the environment file:**
   ```bash
   cp app/.env.example app/.env
   # Then edit app/.env with your values (see Environment Variables section)
   ```

3. **Start all services:**
   ```bash
   docker compose up --build
   ```

   This will:
   - Start a **PostgreSQL** container on port `5433`
   - Start a **Redis** container on port `6379`
   - Run **database migrations** automatically
   - Start the **Express app** on port `3000`

4. **Open the app:**
   ```
   http://localhost:3000
   ```

---

### Running Locally (Without Docker)

1. Make sure you have PostgreSQL and Redis running locally.

2. Install dependencies:
   ```bash
   cd app
   npm install
   ```

3. Set up your `.env` file (see below).

4. Run migrations:
   ```bash
   npm run migrate up
   ```

5. Start the server:
   ```bash
   node index.js
   ```

---

## ⚙️ Environment Variables

Create a file at `app/.env` with the following:

| Variable       | Description                          | Example                                              |
|----------------|--------------------------------------|------------------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string         | `postgres://admin:password@localhost:5433/url_shortner` |
| `REDIS_URL`    | Redis connection URL                 | `redis://localhost:6379`                             |

---

## 🛠️ Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Runtime    | Node.js 22 (ESM)            |
| Framework  | Express 5                   |
| Database   | PostgreSQL (via `pg`)       |
| Cache      | Redis 7 (via `redis`)       |
| Migrations | `node-pg-migrate`           |
| Frontend   | Vanilla HTML / CSS / JS     |
| Container  | Docker + Docker Compose     |

---

## 📡 API Reference

### `POST /shorten`

Shortens a long URL.

**Request body:**
```json
{ "url": "https://www.example.com/very/long/path?with=params" }
```

**Response `201`:**
```json
{ "shortUrl": "http://localhost:3000/r/abc123" }
```

**Response `400`:**
```json
{ "message": "Please provide a valid http/https URL." }
```

---

### `GET /r/:shortCode`

Redirects to the original long URL.

| Status | Meaning                  |
|--------|--------------------------|
| `302`  | Redirect to original URL |
| `404`  | Short code not found     |

---

## 🧠 How It Works

1. A **Redis counter** (`counter` key) is initialized at `134537` on first run.
2. When a URL is shortened, the counter is atomically incremented.
3. The counter value is encoded to **Base62** (`0-9 a-z A-Z`) to produce a short, unique code.
4. The mapping `(short_code → long_url)` is saved in the `urls` PostgreSQL table.
5. On redirect, the short code is looked up in PostgreSQL and the user is forwarded to the original URL.

---

## 🐳 Docker Services

| Service     | Image              | Port (host→container) |
|-------------|--------------------|-----------------------|
| `postgres`  | `postgres:latest`  | `5433:5432`           |
| `redis`     | `redis:7`          | `6379:6379`           |
| `migration` | Built from `./app` | — (runs and exits)    |

> The app service is **not** in `docker-compose.yaml` by default — run it separately with `node index.js` or add your own service entry.

---

## 📄 License

ISC
