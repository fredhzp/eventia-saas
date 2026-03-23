# Eventia 
### Multi-Tenant SaaS Event Management & AI-Powered Ticketing

Eventia is a scalable, multi-tenant Software-as-a-Service (SaaS) platform designed to modernize event management. It allows multiple organizations to securely manage events, venue capacities, and ticket sales within isolated data environments. 

A dedicated **Python microservice** provides AI-driven demand forecasting to optimize venue planning and provide "Social Proof" indicators to buyers.

> **Current Status:**  Active Development (University Capstone Project)  
> **Milestone:** ~70% MVP Complete

---

##  Core Features

* **Strict Multi-Tenancy:** Database-level logical isolation (Shared Schema) ensures strict data boundaries between different organizer tenants.
* **Atomic Transactions:** Secure, simultaneous generation of Orders and unique scannable QR-Code Tickets while strictly enforcing venue capacity limits.
* **AI Demand Forecasting:** Asynchronous Python microservice that analyzes event metadata to predict sell-out probabilities.
* **Organizer Dashboard:** Real-time data visualization of ticket sales and revenue using **Recharts**.
* **Buyer Storefront:** Modern, responsive UI with dynamic "Social Proof" scarcity badges driven by AI predictions.

---

##  Architecture & Tech Stack

The system utilizes a decoupled microservices architecture to separate standard transactional logic from heavy data-science computations.

| Component | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Recharts |
| **Backend (REST API)** | Node.js, Express.js (Controller-Service-Repository) |
| **Database & ORM** | PostgreSQL & Prisma ORM |
| **AI Microservice** | Python, FastAPI, Pandas, Scikit-Learn |

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js** (v18.0+)
* **Python** (v3.9+)
* **PostgreSQL** (Running on port `5432`)

### 1. Database & Backend Setup
```bash
cd backend
npm install

# Create a .env file with your database URL
# DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/eventia_db?schema=public"

# Initialize DB and generate Prisma Client
npx prisma migrate dev --name init
npx prisma generate

# Start the Node Server
npm run dev
```

### 2. AI Services
```bash
cd ai-service

# Create and activate virtual environment
# Windows:
python -m venv venv && .\venv\Scripts\activate
# Mac/Linux:
python3 -m venv venv && source venv/bin/activate

pip install fastapi uvicorn scikit-learn pandas

# Start the FastAPI Server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start the Vite Development Server
npm run dev
```
----
## Roadmap (Upcoming Features)
[ ] Authentication & RBAC: Implementation of JWT-based login and Role-Based Access Control (Admin, Organizer, Buyer).

[ ] Machine Learning Model: Training and integration of a real time-series forecasting model (Scikit-Learn/Prophet).

[ ] DevOps & CI/CD: Docker containerization of all services and deployment via GitHub Actions.

----
Developed by Freddy Heng Zi Ping — 2026
