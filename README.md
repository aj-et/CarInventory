# Car Inventory API

A **Car Inventory Management System** built with ASP.NET Core following Clean Architecture principles. Manages vehicles, customers, and sales orders with automatic vehicle status tracking, JWT authentication, and role-based access control.

> **This is the backend half of a planned full-stack application.** An Angular frontend is in progress and will live alongside this folder in the same repository.

---

## Planned Monorepo Structure

```
CarInventoryApp/
├── CarInventoryAPI/        ← ASP.NET Core backend (this repo, current root)
└── CarInventoryAngular/    ← Angular frontend (in progress)
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
| API Docs | OpenAPI + Scalar UI |
| Frontend (planned) | Angular |

---

## Architecture

3-project Clean Architecture solution:

```
CarInventory.API/           ← Controllers, Services, Program.cs, API configuration
CarInventory.Domain/        ← Models, DTOs (no dependencies on other layers)
CarInventory.Infrastructure/← EF Core DbContext, Migrations
```

**CarInventory.Domain** has no external dependencies — pure C# models and DTOs.  
**CarInventory.Infrastructure** depends only on Domain.  
**CarInventory.API** depends on both and wires everything together via DI.

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

| Event | Vehicle Status |
|---|---|
| Order created | `Available` → `Reserved` |
| Order status set to `Closed` | `Reserved` → `Sold` |
| Order status set to `Lost` | `Reserved` → `Available` |
| Order deleted | returns to `Available` |

Orders can only be created against `Available` vehicles.

### Authentication & Authorization

| Route category | Requirement |
|---|---|
| `POST /api/auth/register` | Public |
| `POST /api/auth/login` | Public |
| All other routes | Valid JWT Bearer token |
| `DELETE` on any resource | Admin role only |

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
| POST | `/api/vehicles` | Bearer | Create vehicle (status defaults to `Available`) |
| PUT | `/api/vehicles/{id}` | Bearer | Update vehicle |
| DELETE | `/api/vehicles/{id}` | Admin | Delete vehicle |

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
| POST | `/api/orders` | Bearer | Create order (reserves vehicle) |
| PUT | `/api/orders/{id}/status` | Bearer | Update order status (syncs vehicle status) |
| DELETE | `/api/orders/{id}` | Admin | Delete order (releases vehicle) |

Interactive API docs available at `/scalar/v1` when running in Development.

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
   Scalar docs: `https://localhost:7173/scalar/v1`

5. **Register your first user**
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
   Use the returned `token` as `Authorization: Bearer <token>` on all subsequent requests.

---

## Notable Implementation Details

**BCrypt password hashing** — Passwords are hashed with BCrypt.Net-Next before storage. Plaintext passwords are never persisted.

**JWT signed with HS512** — Tokens carry claims for `userId`, `email`, `role`, and `name`. Expiry is 7 days. The signing key, issuer, and audience are all configuration-driven.

**Middleware order matters** — `UseAuthentication()` is registered before `UseAuthorization()` in the pipeline. Reversing these breaks auth silently.

**TokenService is Scoped** — Registered as `AddScoped<TokenService>()` so it resolves configuration correctly within the request lifecycle.

**Npgsql downgrade to 8.x** — Npgsql 10.x had a breaking bug with this setup; pinned to `8.0.10` across EF Core and the Npgsql provider for stability.

**JSON circular reference** — `Customer.Orders` navigation property is decorated with `[JsonIgnore]`, and `ReferenceHandler.IgnoreCycles` is set globally in `Program.cs` to prevent serialization loops.

**CORS** — Configured to allow requests from `http://localhost:4200` for the Angular frontend.

**Server-side timestamps** — `CreatedAt` is always set in the controller, never accepted from the client.
