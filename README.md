# RMA Dashboard

A production-grade **MERN stack** internal tool for customer support teams to manage order return lifecycles.

![Stack](https://img.shields.io/badge/Stack-MERN-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green) ![Node](https://img.shields.io/badge/Node-22-green)

## Features

- 🔄 **Finite State Machine** — 8-state order lifecycle (PENDING → REFUNDED) with guard conditions
- ⚡ **Real-time updates** — Socket.IO broadcasts every RMA transition to all connected agents
- 📊 **Analytics dashboard** — Recharts visualizations: order volume, revenue trends, return reasons
- 🔐 **JWT Auth + RBAC** — Access/refresh tokens, silent refresh, role-based route guards
- 💳 **MongoDB Transactions** — Atomic wallet credit + order update + audit log on refund
- 🎯 **Optimistic UI** — TanStack Query snapshot → update → rollback pattern
- 🛡️ **Rate Limiting** — 20 req/15min on auth, 200 req/min on API
- 🌙 **Dark / Light mode** — Toggle with localStorage persistence
- 🔔 **Toast notifications** — Animated, auto-dismissing, 4 types
- 🔍 **Customer name search** — Debounced real-time filtering across 500+ orders
- 🐳 **Docker Compose** — One-command full stack deployment

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TanStack Table v8, TanStack Query v5, Recharts, Socket.IO client |
| Backend | Node.js, Express, Socket.IO, express-rate-limit |
| Database | MongoDB 8 (Replica Set for transactions) |
| Auth | JWT (access 15min + refresh 7d, httpOnly cookie) |
| Deploy | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/rma-dashboard.git
cd rma-dashboard

# 2. Install all dependencies
cd server && npm install && cd ../client && npm install && cd ..

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB Atlas URI + JWT secrets

# 4. Start MongoDB replica set (required for transactions)
mongod --replSet rs0 --port 27018 --dbpath ~/mongodb-rma --bind_ip 127.0.0.1

# 5. Initialize replica set (first time only)
mongosh --port 27018 --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27018' }] })"

# 6. Seed database
cd server && npm run seed && cd ..

# 7. Start both servers
# Terminal 1:
cd server && npm run dev
# Terminal 2:
cd client && npm run dev
```

Open **http://localhost:5173**

## Docker Deployment

```bash
docker-compose up --build
```

Open **http://localhost**

## Demo Credentials

| Role | Email | Password | Can trigger refund |
|---|---|---|---|
| Admin | `admin@rma.dev` | `Admin@123` | ✅ |
| Support | `support@rma.dev` | `Support@123` | ❌ |

## Order State Machine

```
PENDING → PROCESSING → SHIPPED → DELIVERED
                                     ↓
                             RETURN_REQUESTED
                              ↙           ↘
                     RETURN_APPROVED   RETURN_REJECTED
                           ↓
                    REFUND_INITIATED  (admin only)
                           ↓
                        REFUNDED ◼   (atomic transaction)
```

## Project Structure

```
rma-dashboard/
├── server/                 # Express API
│   ├── models/             # Mongoose schemas (Order, User, AuditLog)
│   ├── services/           # stateMachine.js, walletService.js, socketService.js
│   ├── controllers/        # auth, orders, rma
│   ├── middleware/         # JWT auth, RBAC
│   ├── routes/
│   └── seed/               # Generates 500 orders + staff users
├── client/                 # React + Vite
│   └── src/
│       ├── api/            # TanStack Query hooks + axios client
│       ├── auth/           # AuthContext, ProtectedRoute
│       ├── contexts/       # ThemeContext, ToastContext, SocketContext
│       ├── components/     # OrdersTable, OrderDetail, RMAPanel, FilterBar...
│       └── pages/          # Login, Dashboard, Orders, RMAQueue, Analytics
├── docker-compose.yml
└── render.yaml
```

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for step-by-step instructions to deploy on MongoDB Atlas + Render + Vercel.
