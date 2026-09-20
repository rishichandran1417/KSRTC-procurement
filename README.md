# KSRTC Supply Chain Intelligence

A React + TypeScript frontend that unifies five separate systems into one
supply-chain planning workflow:

```
ML Forecasting -> PuLP Optimization -> Database -> Power BI -> Gemini AI
```

This app is **only the frontend integration layer**. It does not contain any
ML, optimization, database, or Gemini backend logic - those are systems you
connect separately.

## Getting started

```bash
npm install
npm run dev
```

By default the app runs in **demo mode** (`VITE_DEMO_MODE=true` in `.env`),
using realistic mock data from `src/mock/` so the whole app works before any
backend is connected.

## Connecting your real systems

1. Copy `.env.example` values into `.env.local` for each service you have
   ready:
   - `VITE_API_BASE_URL` - your database-backed API (inventory, purchase
     orders, suppliers, chat/Gemini)
   - `VITE_FORECAST_API_URL` - your ML forecasting model's endpoint
   - `VITE_OPTIMIZATION_API_URL` - your PuLP optimization endpoint
   - `VITE_POWERBI_EMBED_URL` - your Power BI report embed URL
2. Set `VITE_DEMO_MODE=false`.
3. Restart the dev server.

Every external call goes through a service module in `src/services/` - no
component calls `fetch` directly. Swapping a mock for a real endpoint never
requires touching a page or component.

## Structure

```
src/
  types/            Shared TypeScript types for the whole domain
  services/         Integration layer (forecastApi, procurementApi, inventoryApi,
                     purchaseOrderApi, supplierApi, priceApi, powerbiApi, chatApi,
                     dashboardApi) - all API calls live here
  mock/             Demo-mode data, used automatically when a real endpoint
                     isn't configured
  components/       Sidebar, top bar, KPI cards, status badges, loading/error
                     states, Power BI embed component
  state/            Global filters (depot, category, date range, horizon)
  pages/            Dashboard, Forecast, Procurement, Inventory, Purchase Orders,
                     Suppliers, Analytics (Power BI), AI Assistant, Settings
```

## Notes

- The Power BI page embeds whatever URL you configure in
  `VITE_POWERBI_EMBED_URL` (Settings -> Integrations) in an iframe - it does
  not attempt to recreate the report.
- The AI Assistant page sends messages to `POST {VITE_API_BASE_URL}/chat`
  and renders whatever structured response type comes back (`text`,
  `forecast`, `procurement`, `inventory`, `purchase_orders`,
  `price_analysis`). Your Gemini backend is expected to do the orchestration
  across forecast/inventory/price/PuLP data - React only displays the result.
- Secrets (Power BI access tokens, API keys) should never be put in
  `VITE_*` variables, since those are bundled into the client. Keep them
  server-side.
# KSRTC-procurement
