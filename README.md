# Car Inventory API

A **Car Inventory Management System** built with ASP.NET Core following Clean Architecture principles. Manages vehicles, customers, and sales orders with automatic vehicle status tracking.

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
| API Docs | OpenAPI + Scalar UI |
| Frontend (planned) | Angular |

---

## Architecture

3-project Clean Architecture solution:

```
CarInventory.API/           ← Controllers, Program.cs, API configuration
CarInventory.Domain/        ← Models, DTOs (no dependencies on other layers)
CarInventory.Infrastructure/← EF Core DbContext, Migrations
```

**CarInventory.Domain** has no external dependencies — pure C# models and DTOs.  
**CarInventory.Infrastructure** depends only on Domain.  
**CarInventory.API** depends on both and wires everything together via DI.

---

## Models & Relationships

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

Vehicle status is automatically managed when orders change:

| Event | Vehicle Status |
|---|---|
| Order created | `Available` → `Reserved` |
| Order status set to `Closed` | `Reserved` → `Sold` |
| Order status set to `Lost` | `Reserved` → `Available` |
| Order deleted | returns to `Available` |

Orders can only be created against `Available` vehicles.

---

## API Endpoints

### Vehicles — `/api/vehicles`
| Method | Route | Description |
|---|---|---|
| GET | `/api/vehicles` | List all vehicles |
| GET | `/api/vehicles/{id}` | Get vehicle by ID |
| POST | `/api/vehicles` | Create vehicle (status defaults to `Available`) |
| PUT | `/api/vehicles/{id}` | Update vehicle |
| DELETE | `/api/vehicles/{id}` | Delete vehicle |

### Customers — `/api/customers`
| Method | Route | Description |
|---|---|---|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/{id}` | Get customer with their orders |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/{id}` | Update customer |
| DELETE | `/api/customers/{id}` | Delete customer |

### Orders — `/api/orders`
| Method | Route | Description |
|---|---|---|
| GET | `/api/orders` | List all orders (includes Vehicle + Customer) |
| GET | `/api/orders/{id}` | Get order with relationships |
| POST | `/api/orders` | Create order (reserves vehicle) |
| PUT | `/api/orders/{id}/status` | Update order status (syncs vehicle status) |
| DELETE | `/api/orders/{id}` | Delete order (releases vehicle) |

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

2. **Add your connection string**  
   Create `CarInventory.API/appsettings.Development.json` (gitignored):
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=...;Port=5432;Database=postgres;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
     }
   }
   ```
   The `appsettings.json` in the repo contains a `PLACEHOLDER` password — it's a safe template only.

3. **Apply migrations**
   ```bash
   cd CarInventory.API
   dotnet ef database update
   ```

4. **Run the API**
   ```bash
   dotnet run
   ```
   API is available at `http://localhost:5219` (HTTP) or `https://localhost:7173` (HTTPS).  
   Scalar docs: `https://localhost:7173/scalar/v1`

---

## Notable Implementation Details

**Npgsql downgrade to 8.x** — Npgsql 10.x had a breaking bug with this setup; pinned to `8.0.10` across EF Core and the Npgsql provider for stability.

**JSON circular reference** — `Customer.Orders` navigation property is decorated with `[JsonIgnore]`, and `JsonSerializerOptions.ReferenceHandler = IgnoreCycles` is set globally in `Program.cs` to prevent serialization loops.

**CORS** — Configured to allow requests from `http://localhost:4200` for the Angular frontend.

**Server-side timestamps** — `CreatedAt` is always set in the controller, never accepted from the client.
