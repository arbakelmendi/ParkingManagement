# ParkingHub - Parking Management System Frontend

Modern React frontend for parking management with authentication, reservations, and admin dashboard.

## Quick Start

```bash
npm install
npm run dev  # Runs on port 8080 with API proxying
```

## Docker

```bash
docker build -t parking-frontend .
docker run -p 5173:80 parking-frontend
```

See `docker-compose.frontend.yml` for integration with backend services.

## API Proxy Configuration

**Dev (Vite):** Configured in `vite.config.ts`
**Prod (nginx):** Configured in `nginx.conf`

| Route | Target |
|-------|--------|
| `/api/auth` | `auth-service:3001` |
| `/api/parkings` | `parking-service:3002` |
| `/api/spots` | `parking-service:3002` |
| `/api/reservations` | `reservation-service:3003` |
| `/api/admin` | `auth-service:3001` |

## Auth

Stores in localStorage: `token` (JWT), `user` (object with role: "admin" or "user")

## Tech Stack

React 18, TypeScript, Vite, TailwindCSS, React Query, Framer Motion, Shadcn/UI
