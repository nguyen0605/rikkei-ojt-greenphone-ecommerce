# BE3 — Warehouse management

Admin-only warehouse directory API at `/api/v1/admin/warehouses`.
This manages branches, not stock quantities per warehouse or shipping allocation.

## Prerequisites

- MySQL schema migrated through Flyway V5 or later. Keep existing migrations unchanged.
- Authenticate via `/api/auth/login` and use the ADMIN access token as a Bearer token.
- V5 supplies `WH-HN-MAIN` and `WH-HCM-Q1`; the service does not create demo records.
- A Hibernate-only demo database with Flyway disabled will not contain these seeds automatically.

## Endpoints

| Method | Path | Response |
|---|---|---|
| GET | `/api/v1/admin/warehouses` | 200, `ApiResponse<List<WarehouseResponse>>`, sorted by id; includes inactive branches |
| GET | `/api/v1/admin/warehouses/{id}` | 200, `ApiResponse<WarehouseResponse>` |
| POST | `/api/v1/admin/warehouses` | 201, `ApiResponse<WarehouseResponse>`; status defaults to ACTIVE |
| PUT | `/api/v1/admin/warehouses/{id}` | 200, replaces code/name/address while preserving status |
| PATCH | `/api/v1/admin/warehouses/{id}/status` | 200, explicitly sets ACTIVE or INACTIVE |

There is no DELETE endpoint. Deactivation retains the warehouse and its identifiers.

Create/update body:

```json
{
  "code": "WH-DN-HAI-CHAU",
  "name": "Kho Chi Nhánh Đà Nẵng",
  "address": "Hải Châu, Đà Nẵng"
}
```

Status body:

```json
{"status": "INACTIVE"}
```

Code is required, at most 50 characters, and matches `^[A-Z0-9]+(?:-[A-Z0-9]+)*$`.
Name and address are required. The trimmed name must contain 3–150 characters; the trimmed address is limited to 255 characters. Display fields
are trimmed. Codes are validated as supplied, not silently uppercased.

WarehouseResponse contains id, code, name, address, status, createdAt and updatedAt.
Request DTOs cannot set ids or audit timestamps. No phone/email field exists in V5.

## Errors

- 400: invalid input, malformed JSON/id, or duplicate warehouse code.
- Duplicate codes use errorCode `WAREHOUSE_CODE_DUPLICATE`; the existing MySQL unique
  constraint also protects concurrent requests that pass the initial existence check.
- 401: authentication required; 403: authenticated account without ADMIN role.
- 404: warehouse id not found.
- Business, validation and warehouse request/security errors use `ApiResponse`.

## Demo

1. GET list and confirm the two V5 codes.
2. POST the Da Nang warehouse; verify HTTP 201 and the generated id.
3. GET the generated id; PUT an updated address.
4. PATCH status to INACTIVE, GET again and confirm the record still exists.
5. POST with `WH-HN-MAIN`; verify HTTP 400.
6. Repeat GET/POST using a customer token; verify HTTP 403.

Use a dedicated test database for repeated demos. Repeating step 2 with the same
code intentionally produces a duplicate error; do not delete records to reset it.

## Verification commands (Windows)

Use JDK 17 and a running Docker Desktop for MySQL Testcontainers:

```powershell
.\gradlew.bat test --tests '*AdminWarehouseServiceTest' --tests '*AdminWarehouseControllerTest' --tests '*WarehouseMigrationIT' --max-workers=2
.\gradlew.bat test build --max-workers=2
```

WarehouseMigrationIT migrates an isolated MySQL database through the actual V5,
validates the Warehouse mapping against that schema, reads both seeds and tests
the database unique constraint. It does not reset the developer database.

Measure HTTP response times separately on the running application after warm-up.
Unit tests are not evidence of the <500 ms HTTP acceptance criterion.
