# Eventia
### Multi-Tenant SaaS Event Management & AI-Powered Ticketing

Eventia is a full-stack, multi-tenant SaaS platform for event management. Multiple independent organisations manage events, venues, and ticket sales in isolated data environments. A Python microservice provides AI-driven demand forecasting using a Gradient Boosting model trained on synthetic sales data.

---

## Live Demo

The platform is deployed on Render.com and available at:

| Service | URL |
| :--- | :--- |
| Frontend | https://eventia.onrender.com |
| Backend API | https://eventia-backend.onrender.com |
| AI Service | https://eventia-ai.onrender.com |

> **Note:** The free-tier instances spin down after 15 minutes of inactivity. The first request after an idle period takes ~30 seconds to wake up.

**Demo credentials:**

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | admin@eventia.com | Admin1234! |
| Organiser (Tenant A) | alice@musicco.com | Organiser1234! |
| Organiser (Tenant B) | bob@sportsfest.com | Organiser1234! |

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 19, Vite, Tailwind CSS, Recharts |
| Backend API | Node.js, Express, Prisma ORM |
| Database | PostgreSQL 15 |
| AI Microservice | Python, FastAPI, Scikit-Learn, Pandas |
| CI/CD | GitHub Actions → Render.com |

---

## Running Locally

### Option A — Docker (recommended, single command)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

| Service | Local URL |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| AI Service | http://localhost:8000 |

The backend container runs `prisma migrate deploy` automatically on startup, so the database schema is applied without any manual steps.

To stop and remove all containers and volumes:
```bash
docker compose down -v
```

---

### Option B — Manual setup

**Prerequisites:** Node.js 20+, Python 3.11+, PostgreSQL 15 running on port 5432.

**1. Backend**
```bash
cd backend
npm install
# Copy and edit the example env file
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET in .env

npx prisma migrate deploy
node src/index.js
```

**2. AI Service**
```bash
cd ai-service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --port 8000
```

**3. Frontend**
```bash
cd frontend
npm install
# VITE_API_URL defaults to http://localhost:4000
npm run dev
```

---

## Running Tests

```bash
cd backend
npm test
```

All 46 tests (7 suites) run against a dedicated test database (`eventia_test`). The `DATABASE_URL_TEST` variable in `.env` controls the test database connection.

---

## Project Structure

```
eventia-saas/
├── backend/          Node.js Express API (Controller-Service-Repository)
│   ├── prisma/       Schema and migrations
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── tests/    Jest + Supertest integration and unit tests
│   └── Dockerfile
├── frontend/         React + Vite SPA
│   └── Dockerfile
├── ai-service/       Python FastAPI demand-forecasting microservice
│   ├── main.py
│   ├── tests/        pytest unit and integration tests
│   └── Dockerfile
├── .github/
│   └── workflows/ci.yml   GitHub Actions CI
├── render.yaml            Render.com deployment blueprint
└── docker-compose.yml
```

---

Developed by Freddy Heng Zi Ping — 2026
