# ORD-32 / ORD-33 — Financial dashboard

## Contract and accounting scope

- `/api/admin/statistics/orders` and `/top-selling`: ADMIN, SALES, WAREHOUSE, MARKETING.
- `/revenue`: ADMIN, SALES, MARKETING. Returns revenue-only daily points; no cost/profit fields.
- `/financial-report`: ADMIN only. Responses use `ApiResponse<T>`.
- `from` and `to` must be provided together; UTC timestamps, exclusive `to`. Finance/revenue accept at most 366 days. `period=day|week|month|year` is used when bounds are omitted.
- The existing revenue-only `period=all` option remains supported (since 2000); it is the exception to the range cap. It does not expose financial costs or profits.
- Database order timestamps are UTC. Daily chart buckets use Asia/Ho_Chi_Minh (+07:00). The UI converts local month boundaries into UTC before sending requests.
- Gross revenue is `sum(totalAmount)` for orders currently `PAID`, selected by order creation time. Discounts and shipping are separate aggregates; order totals are not joined to details, preventing duplicate sums.
- Net revenue = gross revenue − discounts. Shipping is excluded from merchandise revenue. Refunds with status `COMPLETED` are reported separately by `refundedAt`; they are **not subtracted again**. The existing refund workflow changes order payment status to `REFUNDED`, excluding those orders from PAID revenue and COGS.
- This is a current-status operational report, not an immutable accounting ledger. A later payment/refund can change a historical order-created-period report. Do not interpret it as settlement-date cashflow or a closed accounting period.
- Gross profit = net revenue − COGS. Margin = profit / net revenue × 100, rounded half-up to two decimals; zero revenue gives zero margin.

## Cost snapshots

Migration V25 adds nullable `order_detail.unit_cost` and indexes for payment/date and refund/date filtering. Previous migrations are unchanged. Apply V25 through the normal Flyway deployment process; no production migration is executed by this task.

At order creation, while the existing variant write lock is held, the service snapshots:

`sum(unit_cost × quantity_received) / sum(quantity_received)`

Only RECEIVED POs and positive received quantities participate. This is the cumulative quantity-weighted average of received purchases, across warehouses; it is not FIFO or a perpetual moving-average inventory valuation. Six decimal places are retained. Later PO receipts cannot alter stored order costs.

Order creation uses READ_COMMITTED so a purchase receipt committed while waiting for the variant lock is visible to the cost query. Existing variant locks, transaction rollback and idempotency behavior remain in place.

Historical orders and sales of seeded stock without a received-PO cost retain NULL. Reports expose `uncostedQuantity`; aggregate COGS, profit and margin are NULL while costs are incomplete. A chart point with incomplete costs has a gap in its profit line. No historic prices are fabricated or backfilled.

## Frontend and exports

ADMIN sees financial KPIs, revenue/profit lines and a payment-method donut. SALES/MARKETING see revenue only. WAREHOUSE sees order counts and top products, with no monetary data or monetary API calls. Top-product responses contain quantities rather than financial values.

Queries include account, role and date scope. Both fetching and rendering are gated by role, so cached admin data is not rendered/exported after switching roles. Excel/PDF are built from the same authorized metric rows. Export buttons are disabled during loading or failed requests. PDF uses a canvas image to preserve Vietnamese glyphs without relying on the default PDF font; text is rasterized rather than selectable.

Payment breakdown shows paid merchandise revenue after discounts and before separately reported refunds; unknown payment method codes are retained instead of silently discarded.

## Verification

- Backend: `gradlew test` and `gradlew build`.
- Frontend: `npm test -- --run`, `npm run build`.
- Browser: `npx playwright test e2e/dashboard-rbac.spec.ts --project=chromium`.
- MySQL integration tests verify real aggregate queries, excluded UNPAID/FAILED orders, nonduplicated totals, Vietnam date buckets, weighted cost snapshots, immutable historical costs, and additive V24→V25 migration.
- A successful small-fixture test does not establish the 1.5-second production latency target; benchmark results must state dataset size and environment.
