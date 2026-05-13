# Car Inventory Management System

A **full-stack Car Inventory Management System** — ASP.NET Core backend + Angular frontend — built following Clean Architecture principles. Manages vehicles, customers, and sales orders with automatic vehicle status tracking, JWT authentication, role-based access control, and real-time updates via SignalR.

---

## Monorepo Structure

```
CarInventory/
├── CarInventoryAPI/          ← ASP.NET Core backend (.NET 10)
└── car-inventory-client/     ← Angular frontend (Angular 19, in progress)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | .NET 10 |
| Framework | ASP.NET Core Web API |
| ORM | Entity Framework Core 8 |
| Database Driver | Npgsql 8.x (PostgreSQL) |
| Database | PostgreSQL via Supabase |
| Authentication | JWT Bearer + BCrypt.Net-Next |
| Real-Time | ASP.NET Core SignalR |
| API Docs | OpenAPI + Scalar UI |
| Frontend | Angular 19 (standalone components) |
| Real-time client | @microsoft/signalr 10.x |

---

## Architecture

3-project Clean Architecture solution:

```
CarInventory.API/           ← Controllers, Hubs, Services, Program.cs
CarInventory.Domain/        ← Models, DTOs (no dependencies on other layers)
CarInventory.Infrastructure/← EF Core DbContext, Migrations
```

**CarInventory.Domain** has no external dependencies — pure C# models and DTOs.  
**CarInventory.Infrastructure** depends only on Domain.  
**CarInventory.API** depends on both and wires everything together via DI.

---

## Frontend (car-inventory-client/)

**Framework:** Angular 19.2 — standalone components, lazy-loaded routes, Angular Signals for state (no NgRx)  
**Dev server:** `ng serve` → `http://localhost:4200`

### Folder Structure

```
car-inventory-client/src/app/
├── core/
│   ├── guards/         ← auth.guard.ts (CanActivateFn)
│   ├── interceptors/   ← jwt.interceptor.ts (auto-attaches Bearer token)
│   └── services/       ← auth, vehicle, order, signalr services
└── features/
    ├── auth/           ← login/, register/
    ├── dashboard/      ← live stats + event feed
    ├── vehicles/       ← vehicle-list/, vehicle-form/ (modal)
    └── orders/         ← order-list/, order-form/ (modal)
```

### Feature Status

| Page / Feature | Route | Status |
|---|---|---|
| Login | `/login` | Done |
| Register | `/register` | Done |
| Dashboard — live stats + event feed | `/dashboard` | Done |
| Vehicle list with status filters | `/vehicles` | Done |
| Add vehicle (modal form) | `/vehicles` | Done |
| Edit vehicle | `/vehicles` | Done |
| Delete vehicle (Admin only) | `/vehicles` | Done |
| Order list with status filters | `/orders` | Done |
| Create order | `/orders` | Done |
| Advance order / Mark as lost | `/orders` | Done |
| Delete order (Admin only) | `/orders` | Done |

### Authentication (frontend)

- JWT stored in `localStorage`; session persists across page refreshes
- `jwt.interceptor.ts` automatically injects `Authorization: Bearer <token>` on every HTTP request
- `auth.guard.ts` (CanActivateFn) protects `/dashboard`, `/vehicles`, and `/orders` — unauthenticated users are redirected to `/login`

### SignalR (frontend)

- Connection starts on login/register, stops on logout
- Auto-reconnect enabled
- Events handled: `StatsUpdated` (dashboard stat cards), `VehicleAdded`, `VehicleUpdated`, `OrderCreated` (live event banner in navbar)

CORS on the backend is pinned to `http://localhost:4200` with `AllowCredentials()` required for SignalR.

---

## Models & Relationships

### User
| Field | Type | Notes |
|---|---|---|
| Id | int | PK |
| FirstName / LastName | string | |
| Email | string | Unique index |
| PasswordHash | string | BCrypt hash, never plaintext |
| Role | UserRole | `Admin`, `SalesRep` (default: SalesRep) |
| CreatedAt | DateTime | Set server-side |

### Vehicle
| Field | Type | Notes |
|---|---|---|
| Id | int | PK |
| VIN | string(17) | Unique index |
| StockNumber | string | |
| Make / Model / Year / Trim / Color | string / int | |
| Mileage | int | |
| MSRP / SellingPrice | decimal(18,2) | |
| Status | VehicleStatus | `Available`, `Reserved`, `Sold`, `InService` |
| CreatedAt | DateTime | Set server-side |

### Customer
| Field | Type | Notes |
|---|---|---|
| Id | int | PK |
| FirstName / LastName | string | |
| Email | string(255) | Unique index |
| Phone | string | |
| CreatedAt | DateTime | Set server-side |

### Order
| Field | Type | Notes |
|---|---|---|
| Id | int | PK |
| VehicleId | int | FK → Vehicle (Restrict) |
| CustomerId | int | FK → Customer (Restrict) |
| Status | OrderStatus | `Inquiry`, `Negotiation`, `Financing`, `Closed`, `Lost` |
| Notes | string? | |
| CreatedAt | DateTime | Set server-side |
| ClosedAt | DateTime? | Set when Closed or Lost |

**Relationships:**
- Customer → Orders: one-to-many
- Vehicle → Orders: one-to-many (tracks history)
- Delete behavior: `Restrict` on both FKs (cannot delete a customer or vehicle that has orders)

---

## Business Logic

### Vehicle Status Transitions

Vehicle status is automatically managed when orders change:

| Event | Vehicle Status Change |
|---|---|
| Order created | `Available` → `Reserved` |
| Order status → `Closed` | `Reserved` → `Sold` |
| Order status → `Lost` | `Reserved` → `Available` |
| Order deleted | → `Available` |

Orders can only be created against `Available` vehicles.

### Authentication & Authorization

| Route category | Requirement |
|---|---|
| `POST /api/auth/register` | Public |
| `POST /api/auth/login` | Public |
| All other REST routes | Valid JWT Bearer token |
| `DELETE` on any resource | Admin role only |
| SignalR hub connection | Valid JWT (via query string) |

---

## API Endpoints

### Auth — `/api/auth`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register user, returns JWT token |
| POST | `/api/auth/login` | Public | Login, returns JWT token |

**Auth response:**
```json
{
  "token": "eyJ...",
  "email": "user@example.com",
  "role": "SalesRep",
  "expires": "2026-05-19T00:00:00Z"
}
```

### Vehicles — `/api/vehicles`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/vehicles` | Bearer | List all vehicles |
| GET | `/api/vehicles/{id}` | Bearer | Get vehicle by ID |
| GET | `/api/vehicles/stats` | Bearer | Live inventory counts by status |
| POST | `/api/vehicles` | Bearer | Create vehicle → broadcasts `VehicleAdded` + `StatsUpdated` |
| PUT | `/api/vehicles/{id}` | Bearer | Update vehicle → broadcasts `VehicleUpdated` + `StatsUpdated` |
| DELETE | `/api/vehicles/{id}` | Admin | Delete vehicle → broadcasts `VehicleDeleted` + `StatsUpdated` |

**Stats response:**
```json
{ "total": 42, "available": 18, "reserved": 5, "sold": 17, "inService": 2 }
```

### Customers — `/api/customers`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/customers` | Bearer | List all customers |
| GET | `/api/customers/{id}` | Bearer | Get customer with their orders |
| POST | `/api/customers` | Bearer | Create customer |
| PUT | `/api/customers/{id}` | Bearer | Update customer |
| DELETE | `/api/customers/{id}` | Admin | Delete customer |

### Orders — `/api/orders`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/orders` | Bearer | List all orders (includes Vehicle + Customer) |
| GET | `/api/orders/{id}` | Bearer | Get order with relationships |
| POST | `/api/orders` | Bearer | Create order → broadcasts `OrderCreated` + `VehicleUpdated` + `StatsUpdated` |
| PUT | `/api/orders/{id}/status` | Bearer | Update status → broadcasts `OrderUpdated` + `VehicleUpdated` + `StatsUpdated` |
| DELETE | `/api/orders/{id}` | Bearer | Delete order → broadcasts `OrderDeleted` + `VehicleUpdated` + `StatsUpdated` |

Interactive API docs available at `/scalar/v1` when running in Development.

---

## Real-Time Events (SignalR)

**Hub URL:** `ws://localhost:5219/hubs/inventory`

Connect with your JWT token via query string — the standard `Authorization` header is not supported over WebSockets:
```
ws://localhost:5219/hubs/inventory?access_token=<your-jwt>
```

### Server → Client Events

| Event | Payload | Triggered by |
|---|---|---|
| `Connected` | `string` confirmation message | On successful hub connection |
| `VehicleAdded` | `Vehicle` object | POST /api/vehicles |
| `VehicleUpdated` | `Vehicle` object | PUT /api/vehicles, order status changes |
| `VehicleDeleted` | `int` vehicle ID | DELETE /api/vehicles |
| `OrderCreated` | `Order` object | POST /api/orders |
| `OrderUpdated` | `Order` object | PUT /api/orders/{id}/status |
| `OrderDeleted` | `int` order ID | DELETE /api/orders |
| `StatsUpdated` | Stats object (see below) | Any write operation on vehicles or orders |

**`StatsUpdated` payload:**
```json
{ "total": 42, "available": 18, "reserved": 5, "sold": 17, "inService": 2 }
```

`StatsUpdated` fires after every mutating operation, making it easy to drive a live dashboard without polling.

---

## Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- A PostgreSQL database (or a [Supabase](https://supabase.com) project)

### Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd CarInventoryAPI
   ```

2. **Add your connection string and JWT config**  
   Create `CarInventory.API/appsettings.Development.json` (gitignored):
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=...;Port=5432;Database=postgres;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
     },
     "Jwt": {
       "Key": "your-secret-key-minimum-32-characters-long",
       "Issuer": "CarInventoryAPI",
       "Audience": "CarInventoryClient"
     }
   }
   ```
   The `appsettings.json` in the repo contains `PLACEHOLDER` values — it's a safe template only.

3. **Apply migrations**
   ```bash
   cd CarInventory.API
   dotnet ef database update
   ```

4. **Run the API**
   ```bash
   dotnet run
   ```
   API: `http://localhost:5219` / `https://localhost:7173`  
   SignalR hub: `ws://localhost:5219/hubs/inventory`  
   Scalar docs: `https://localhost:7173/scalar/v1`

5. **Register your first user**  
   Open `http://localhost:4200/register` in the browser (after step 7 below), or call the API directly:
   ```http
   POST /api/auth/register
   Content-Type: application/json

   {
     "firstName": "Aaron",
     "lastName": "Smith",
     "email": "you@example.com",
     "password": "yourpassword"
   }
   ```
   Use the returned `token` as `Authorization: Bearer <token>` on all subsequent REST requests, or append `?access_token=<token>` for the SignalR connection.

6. **Install frontend dependencies**
   ```bash
   cd car-inventory-client
   npm install
   ```

7. **Run the Angular dev server**
   ```bash
   ng serve
   # or: npm start
   ```
   App available at `http://localhost:4200`

---

## Deployment

### Backend (Railway)

The API is deployable as a Docker container. A multi-stage `Dockerfile` is included in `CarInventoryAPI/`:

- **Build stage**: `mcr.microsoft.com/dotnet/sdk:10.0` — copies all three projects, restores, and publishes to `/app/out`
- **Runtime stage**: `mcr.microsoft.com/dotnet/aspnet:10.0` — copies published artifacts, runs on port 8080

`railpack.json` configures Railway's build/start commands for the dotnet provider.

Set the following environment variables in Railway (or equivalent host):

| Variable | Value |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `Jwt__Key` | Signing key — minimum 32 characters |
| `Jwt__Issuer` | `CarInventoryAPI` |
| `Jwt__Audience` | `CarInventoryClient` |

### Frontend (Angular)

Update `car-inventory-client/src/environments/environment.prod.ts` with your deployed backend URL before building:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.up.railway.app',
  hubUrl: 'https://your-backend.up.railway.app/hubs/inventory'
};
```

Build for production:

```bash
cd car-inventory-client
ng build --configuration production
```

The output in `dist/car-inventory-client/browser/` can be served as a static site (Netlify, Vercel, Railway static, etc.).

---

## Notable Implementation Details

**SignalR JWT via query string** — WebSockets cannot send custom headers, so the `JwtBearerEvents.OnMessageReceived` hook reads the token from `?access_token=` when the path starts with `/hubs`. Standard header auth still works for REST routes.

**CORS requires `AllowCredentials()`** — SignalR's WebSocket handshake requires credentials to be allowed on the CORS policy. `AllowAnyOrigin()` is incompatible with this; the Angular origin is pinned explicitly.

**`StatsUpdated` after every write** — Both `VehiclesController` and `OrdersController` share a private `BroadcastStats()` helper that fires a live inventory count snapshot to all connected clients after any mutation.

**BCrypt password hashing** — Passwords are hashed with BCrypt.Net-Next before storage. Plaintext passwords are never persisted.

**JWT signed with HS512** — Tokens carry claims for `userId`, `email`, `role`, and `name`. Expiry is 7 days. The signing key, issuer, and audience are all configuration-driven.

**Middleware order matters** — `UseAuthentication()` is registered before `UseAuthorization()` in the pipeline. Reversing these breaks auth silently.

**Npgsql downgrade to 8.x** — Npgsql 10.x had a breaking bug with this setup; pinned to `8.0.10` across EF Core and the Npgsql provider for stability.

**Angular environment files for API URL** — `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod) define `apiUrl` and `hubUrl`. All services import from this file. `angular.json` is configured with `fileReplacements` so `ng build --configuration production` automatically substitutes the prod file, pointing the app at the Railway backend without any code changes.

**JSON circular reference** — `Customer.Orders` navigation property is decorated with `[JsonIgnore]`, and `ReferenceHandler.IgnoreCycles` is set globally in `Program.cs` to prevent serialization loops.

**Server-side timestamps** — `CreatedAt` is always set in the controller, never accepted from the client.

---

## Known Security Limitations

These are known issues in the current frontend implementation, accepted for now during development. Each entry notes the affected file and the intended fix.

> **Note:** Documenting vulnerabilities like this is fine for a portfolio or local-dev project. In a production app with real users, do not list specific security gaps in a public README — fix them instead.

**JWT stored in `localStorage`** — Severity: Medium  
File: `core/services/auth.service.ts`  
Any XSS on the page can read and exfiltrate the token via `localStorage.getItem('token')`. Fix: switch to `HttpOnly` cookies (requires backend support) or a memory-only token store.

**No 401 interceptor — expired tokens stay "logged in"** — Severity: Medium  
File: `core/interceptors/jwt.interceptor.ts`  
When the 7-day JWT expires, API calls silently fail with 401 but `isLoggedIn` stays `true`. Users are stuck on protected pages with no feedback. Fix: add a `catchError` response handler in the interceptor that calls `authService.logout()` on 401.

**Raw server error body shown to users** — Severity: Low-Medium  
Files: `features/auth/login/login.component.ts`, `features/auth/register/register.component.ts`  
`err.error` is passed directly to the displayed error message; backend stack traces or internal details could surface in the UI. Fix: use a fixed user-friendly string and log `err` to the console only.

**`accessTokenFactory` captures a stale token snapshot** — Severity: Low  
File: `core/services/signalr.service.ts`  
The token is captured in a `const` before being passed to `accessTokenFactory`, so SignalR reconnects always use that original snapshot. Fix: `accessTokenFactory: () => this.authService.getToken() ?? ''`.

**Private `hubConnection` accessed via bracket notation** — Severity: Low  
Files: `features/vehicles/vehicle-list/vehicle-list.component.ts`, `features/orders/order-list/order-list.component.ts`  
Bypasses TypeScript access control. If the hub hasn't connected yet when a component initializes, `hub` is `undefined` and SignalR listeners are silently never registered. Fix: expose a public method in `SignalrService` for registering event handlers.

**No error feedback on order action buttons** — Severity: Low  
File: `features/orders/order-list/order-list.component.ts`  
`advanceStatus()` and `markLost()` have no `error` callback; failed requests silently leave the UI in stale state with no user feedback. Fix: add an `error` handler that displays an inline message.

**`alert()` used for delete error messages** — Severity: Low  
File: `features/vehicles/vehicle-list/vehicle-list.component.ts`  
Browser-native `alert()` is used to surface delete errors. It blocks the UI thread and its appearance varies by OS/browser. Fix: replace with an inline error signal, consistent with how other components handle errors.

**No VIN format or numeric range validation on vehicle form** — Severity: Low  
File: `features/vehicles/vehicle-form/vehicle-form.component.ts`  
VIN accepts any string (should be exactly 17 alphanumeric characters, excluding I, O, Q). Mileage, MSRP, and Selling Price have no minimum validator and will accept negative numbers. Fix: add `Validators.pattern(/^[A-HJ-NPR-Z0-9]{17}$/)` for VIN and `Validators.min(0)` for numeric fields. The backend should also validate, but the form should catch it first.

**Raw `HttpClient` calls in order form — bypasses service layer** — Severity: Low  
File: `features/orders/order-form/order-form.component.ts`  
Vehicle list and customer list/creation are fetched directly via `HttpClient` using `environment.apiUrl`, bypassing the service layer. A dedicated `CustomerService` and injecting `VehicleService` into the form would centralize this logic. Fix: create a `CustomerService` and route all HTTP calls through the service layer.

**No confirmation before advancing order status or marking as lost** — Severity: Low  
File: `features/orders/order-list/order-list.component.ts`  
"Advance →" and "Lost" buttons fire immediately on click with no confirmation. Marking an order as Lost effectively closes it — a misclick cannot be easily undone. Delete already uses a confirm dialog; status mutations should too, at minimum for "Mark as Lost." Fix: reuse the existing `ConfirmDialogComponent` before executing these mutations.
