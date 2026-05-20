# D'Cart

**D'Cart: E-commerce Management System for Decolores Grocery Store (Rodriguez, Rizal)**

## Abstract

D'Cart is a full stack e-commerce management system designed for Decolores Grocery Store to support online grocery ordering, same-day delivery coordination, inventory management, and order monitoring. The system is intended for a geographically limited service area and enforces a strict delivery rule: only addresses within **Rodriguez, Rizal** are allowed to complete checkout.

The application serves two primary user groups:

* **Customers**, who can register, log in, browse products, manage a cart, place orders, and track delivery status.
* **Administrators**, who can manage inventory, update order status, monitor sales activity, and oversee store operations from a dedicated dashboard.

This project was built using a clean, modular, production-oriented structure with a service-driven backend and a React frontend tailored for practical day-to-day grocery operations.

## Project Context

Decolores Grocery Store requires a digital ordering system that reduces manual order intake, improves visibility into stock availability, and supports local fulfillment for nearby customers. D'Cart addresses this need by combining customer ordering features with operational tools for store staff.

Rather than functioning as a generic marketplace, the system is designed around a real business rule and a constrained delivery zone. That constraint is not only presented in the user interface but is also enforced in the backend business logic to prevent invalid orders from being accepted.

## Objectives

The system aims to:

* digitize grocery ordering for local customers
* support same-day delivery workflows
* enforce service-area restrictions for operational feasibility
* provide administrators with product, inventory, and order management tools
* maintain a scalable backend architecture suitable for future enhancement

## Scope of the System

### Customer Scope

* account registration and login
* product browsing
* cart creation and updates
* checkout with delivery address submission
* address validation for Rodriguez, Rizal only
* order history and order tracking

### Admin Scope

* administrative dashboard
* product creation, update, and deletion
* stock visibility and inventory management
* order status updates
* sales and order activity monitoring

## Business Rule

The core delivery rule of the system is:

> Orders are only accepted when the submitted delivery address contains `"Rodriguez, Rizal"`.

If the address does not satisfy that condition, checkout is rejected by the backend service layer.

## Technology Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* Prisma ORM
* JWT Authentication
* Zod validation

### Frontend

* React.js
* React Router
* TailwindCSS
* Axios
* Vite

## System Architecture

The application follows a **clean architecture-inspired modular structure**. Responsibilities are separated so that routing, request handling, business logic, validation, and domain modeling remain independent and maintainable.

### Backend Layers

* **Routes** define HTTP endpoints only.
* **Controllers** receive validated requests and return responses.
* **Services** contain business logic and coordinate data access.
* **Models** represent domain objects and OOP behavior.
* **Middlewares** handle authentication, authorization, validation, and errors.
* **Validators** define request schemas using Zod.

### Frontend Layers

* **Pages** represent route-level views.
* **Components** provide reusable UI elements.
* **API modules** encapsulate backend requests through Axios.
* **Context** manages authentication state.
* **Routes** protect customer and admin-only pages.

## OOP Design Implementation

The system explicitly applies the four pillars of object-oriented programming.

### 1\. Encapsulation

Sensitive internal state is protected inside class instances through private fields.

* `Product` uses a private `#stock` field
* `Cart` uses a private `#items` field
* `Delivery` uses private address and status fields

### 2\. Inheritance

The system defines a shared base `User` model and specialized user types:

* `User` as the abstract base class
* `Customer` extending `User`
* `Admin` extending `User`

### 3\. Polymorphism

Delivery behavior is handled through interchangeable strategy classes:

* `StandardDeliveryStrategy`
* `SameDayDeliveryStrategy`

Both follow the same abstraction but produce different delivery scheduling behavior.

### 4\. Abstraction

Controllers do not contain business rules. Instead, services hide the implementation details of authentication, cart handling, product management, and checkout processing.

## Core Functional Modules

### Authentication Module

The authentication module supports:

* customer registration
* user login
* JWT issuance
* authenticated session retrieval through `/auth/me`

Passwords are hashed before storage using `bcryptjs`.

### Product Module

This module supports:

* public product listing
* single product retrieval
* admin product creation
* admin product updates
* admin product deletion

Each product belongs to a category and includes stock information.

### Cart Module

The cart module supports:

* automatic cart creation per user
* add-to-cart functionality
* quantity updates
* item removal
* cart clearing

The service layer prevents cart quantities from exceeding available product stock.

### Order and Delivery Module

This module supports:

* checkout from cart contents
* creation of order and order items
* stock deduction
* delivery creation
* order tracking
* admin order status updates

Checkout is transaction-based using Prisma to help preserve data consistency.

### Admin Dashboard Module

The dashboard summarizes:

* total orders
* delivered orders
* pending operational workload
* product count
* aggregate sales
* recent order activity

## Database Design

The system uses PostgreSQL with Prisma ORM.

### Main Tables

* `users`
* `categories`
* `products`
* `carts`
* `cart\\\_items`
* `orders`
* `order\\\_items`
* `deliveries`

### Entity Relationships

* one user has one cart
* one user can have many orders
* one category can have many products
* one cart can have many cart items
* one order can have many order items
* one order has one delivery

The Prisma schema is located at `backend/prisma/schema.prisma`.

## API Overview

### Authentication Endpoints

* `POST /api/auth/register`
* `POST /api/auth/login`
* `POST /api/auth/google`
* `GET /api/auth/me`

### Category Endpoints

* `GET /api/categories`

### Product Endpoints

* `GET /api/products`
* `GET /api/products/:id`
* `POST /api/products`
* `PUT /api/products/:id`
* `DELETE /api/products/:id`

### Cart Endpoints

* `GET /api/cart`
* `POST /api/cart/items`
* `PATCH /api/cart/items/:productId`
* `DELETE /api/cart/items/:productId`
* `DELETE /api/cart`

### Order Endpoints

* `GET /api/orders`
* `GET /api/orders/:id`
* `POST /api/orders/checkout`
* `PATCH /api/orders/:id/status`

### Admin Endpoints

* `GET /api/admin/dashboard`

## Frontend Pages

The frontend includes the following major pages:

* Login Page
* Register Page
* Products Page
* Cart Page
* Checkout Page
* Orders Page
* Admin Dashboard Page

These pages are implemented inside `frontend/src/pages`.

## Phase 2 API Integrations

The current presentation-ready external integrations focus on:

* **Google Login API** using Google Identity Services on the frontend and backend ID token verification with the official Google Auth Library.
* **PayMongo GCash Checkout API** using hosted checkout sessions, secure webhook verification, and backend-controlled payment state updates.

Supporting integrations kept stable in this phase:

* **SMTP email notifications** through Nodemailer with a safe JSON transport fallback when SMTP is not configured.
* **Socket.IO realtime order updates** for customers and operations users.
* **Browser Geolocation API** for delivery radius validation during checkout.

## Security and Validation

The application includes several important safeguards:

* JWT-based authentication
* role-based authorization for admin-only routes
* request validation using Zod
* password hashing with bcrypt
* backend enforcement of service-area restrictions
* stock checks before cart updates and checkout

## Folder Structure

```text
D'Cart/
|-- backend/
|   |-- prisma/
|   |-- src/
|   |   |-- config/
|   |   |-- constants/
|   |   |-- controllers/
|   |   |-- middlewares/
|   |   |-- models/
|   |   |   `-- strategies/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- validators/
|   |-- .env.example
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- routes/
|   |   `-- utils/
|   |-- .env.example
|   `-- package.json
|-- .gitignore
`-- README.md
```

## Local Setup Instructions

### 1\. Clone the Repository

```bash
git clone https://github.com/Kakashimoto14/D-Cart-.git
cd D-Cart-
```

### 2\. Backend Setup

Create the backend environment file based on the example:

```bash
cd backend
npm install
```

Set the database connection in `.env`:

```env
DATABASE\\\_URL="postgresql://postgres:postgres@localhost:5432/dcart\\\_db?schema=public"
DIRECT\\\_URL="postgresql://postgres:postgres@localhost:5432/dcart\\\_db?schema=public"
JWT\\\_SECRET=your\\\_strong\\\_secret\\\_here
GOOGLE_CLIENT_ID=your_google_web_client_id
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_WEBHOOK_SECRET=your_paymongo_webhook_secret
```

If you use Supabase, keep `DATABASE_URL` pointed at the Prisma pooler connection and set `DIRECT_URL` to the direct database connection for migrations.

Redis is optional for local development. The backend continues without Redis when it is disabled or unavailable. To exercise BullMQ queues, reservation expiry jobs, and Redis-backed realtime coordination locally:

```bash
docker run --name dcart-redis -p 6379:6379 -d redis:7-alpine
```

Then set:

```env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Run Prisma and seed the database:

```bash
npx prisma migrate dev
npm run seed
npm run dev
```

### 3\. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Set the frontend environment file based on `frontend/.env.example` and add:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
VITE_GOOGLE_AUTHORIZED_ORIGINS=http://localhost:5173
```

Google Login local notes:

* Add `http://localhost:5173` as an authorized JavaScript origin in your Google Cloud OAuth client.
* `VITE_GOOGLE_AUTHORIZED_ORIGINS` is an optional local allowlist. If you set it, keep it aligned with the origins configured in Google Cloud; if you leave it empty, Google Identity Services initializes normally with `VITE_GOOGLE_CLIENT_ID`.
* Use a **Web application** client ID for Google Identity Services.

PayMongo local notes:

* Use test keys in `backend/.env`.
* Point your PayMongo webhook to `POST /api/payments/paymongo/webhook`.
* Payment completion in D'Cart is finalized by the webhook, not by the browser redirect alone.

### 4\. Docker Compose Setup

For a production-like local stack with PostgreSQL, Redis, backend, worker, and frontend:

```bash
cp .env.docker.example .env
docker compose up --build
```

This starts:

* `postgres` for application data
* `redis` for reservations, queues, and realtime coordination
* `backend` on `http://localhost:5000`
* `worker` for BullMQ jobs
* `frontend` on `http://localhost:8080`

Operational notes:

* the backend container runs `prisma migrate deploy` and `node prisma/seed.js` before startup
* the worker container runs queue processors for notifications and reservation expiry
* Redis must be available if you want BullMQ jobs and Redis-backed reservations to run through their real runtime path
* legacy MySQL migration files are preserved under `backend/prisma/mysql-migrations-legacy` for reference, while new PostgreSQL environments use the baseline migration in `backend/prisma/migrations`

## Default Development URLs

* Backend API: `http://localhost:5000`
* Frontend App: `http://localhost:5173`
* Health Check: `http://localhost:5000/api/health`

## Production Deployment

The recommended deployment setup for this project is:

* **Frontend** on Vercel
* **Backend API** on Railway
* **PostgreSQL database** on Railway PostgreSQL, Supabase, or another managed PostgreSQL provider
* **Redis** on a managed Redis provider or a colocated Redis instance for queues and reservation coordination

### Backend Deployment on Railway

The backend already includes a Railway config file at `backend/railway.toml` with:

* a start command of `npm start`
* a health check path of `/api/health`
* restart behavior for failed deployments

When deploying this repository as a monorepo on Railway:

1. Create a new Railway project
2. Add a PostgreSQL service
3. Add a backend service connected to this GitHub repository
4. Set the backend service **Root Directory** to `/backend`
5. If using config-as-code, set the Railway config file path to `/backend/railway.toml`

### Railway Environment Variables

Set these environment variables on the Railway backend service:

```env
NODE\\\_ENV=production
PORT=5000
DATABASE\\\_URL=postgresql://USER:PASSWORD@HOST:PORT/dcart\\\_db?schema=public
DIRECT\\\_URL=postgresql://USER:PASSWORD@HOST:PORT/dcart\\\_db?schema=public
JWT\\\_SECRET=your\\\_strong\\\_secret\\\_here
JWT\\\_EXPIRES\\\_IN=1d
FRONTEND\\\_URL=https://decolores-cart.vercel.app
FRONTEND\\\_URLS=https://decolores-cart.vercel.app,http://localhost:5173
ADMIN\\\_NAME=Store Admin
ADMIN\\\_EMAIL=admin@dcart.local
ADMIN\\\_PASSWORD=ChangeMe123!
REDIS\\\_ENABLED=true
REDIS\\\_URL=redis://YOUR-REDIS-HOST:6379
STORE\\\_UTC\\\_OFFSET\\\_MINUTES=480
```

If you use Supabase, use the pooled connection for `DATABASE_URL` and the direct connection for `DIRECT_URL`. On DigitalOcean, Railway, or another production host, set `REDIS_ENABLED=true` and `REDIS_URL` in the backend service environment. Do not hardcode Redis credentials in source files.

### Database Deployment

After the backend service is configured, run the Prisma migration and seed process against the production database:

```bash
npm run prisma:deploy
npm run seed
```

### Frontend Connection

Because the frontend is already deployed on Vercel, update the Vercel environment variable:

```env
VITE\\\_API\\\_URL=https://your-backend-domain.up.railway.app/api
```

After changing the variable, redeploy the Vercel project so the frontend rebuilds with the new API base URL.

### Health Check

Once Railway finishes deploying, verify the backend at:

```text
https://your-backend-domain.up.railway.app/api/health
```

The expected response is:

```json
{ "status": "ok", "service": "dcart-backend" }
```

## Development Notes

* `.env` files are intentionally excluded from version control
* Prisma migrations should be committed
* the backend must be running before customer and admin flows work in the frontend
* the admin seed account is controlled through backend environment variables

## Current Implementation Status

The current system includes:

* backend API scaffolding and modular architecture
* Prisma schema and migration support
* seed script for categories and optional admin account
* customer ordering flow
* admin product and order management views
* frontend integration using Axios

## Recommended Next Enhancements

* add automated tests for services and API routes
* implement image upload for products
* add inventory alerts for low-stock items
* add pagination and filtering for products and orders
* integrate payment processing if required by the business
* improve audit logging for admin activity

## Authors and Purpose

This project was developed as a production-oriented academic and business system prototype for **Decolores Grocery Store**. It is structured not as a demo landing page, but as a real operational application foundation that can be extended into a deployed local commerce platform.
