# CLAUDE.md – FindTone / MusicMarket

University group project (SLIIT SE3090). A music-instrument marketplace with AI agents.
Read this file before changing anything.

## Folder map

```text
FindTone/
├── .github/workflows/          CI: backend-ci, ai-service-ci, frontend-ci (web), mobile-ci (flutter)
├── backend/MusicMarket.Tests/  xUnit tests (in-memory SQLite + fake AI HTTP handler)
├── backend/MusicMarket.Api/    ASP.NET Core 8 Web API (port 5036)
│   ├── Controllers/            Auth, Listings, Orders, Wishlist, Alerts, Notifications,
│   │                           Admin, Dashboard, ShoppingAssistant
│   ├── Data/AppDbContext.cs    EF Core + Npgsql (Supabase Postgres), catalog seed data
│   ├── Migrations/             EF Core migrations (applied automatically on startup)
│   ├── Models/ Dtos/           Entities and request/response DTOs
│   │                           (Public* DTOs = no trust/fair-price fields)
│   ├── Helpers/                ApiError (`this.Error(status, msg)` -> {"message"}), TextNormalizer
│   ├── Services/               AiServiceClient (typed HttpClient -> ai-service),
│   │                           ListingCheckService (runs Agent 01 + 02 and sets the status),
│   │                           ListingMapper (public vs owner/admin DTOs),
│   │                           SmartAlertService (NEW_MATCH / PRICE_DROP, update-in-place)
│   └── Program.cs              DI, JWT, CORS, Cloudinary, Swagger, auto-migrate
├── ai-service/                 FastAPI + LangChain (port 8000)
│   ├── api.py                  All HTTP routes (/api/agents/*, /api/chat)
│   ├── llm_config.py           LLM_PROVIDER switch: ollama | gemini (only place that builds LLMs)
│   ├── db.py                   Direct read-only Postgres access for agents
│   ├── ChatBot/                RAG chatbot (landing page) + Chroma vector DB
│   ├── Agent_01/               Fair Price agent        POST /api/agents/fair-price
│   ├── Agent_02/               Trust & Fraud agent     POST /api/agents/trust-check
│   ├── Agent_03/               Smart Alert agent       POST /api/agents/smart-alert, /smart-alert/backfill, /parse-alert
│   ├── Agent_04/               Shopping Assistant      POST /api/agents/shopping-assistant
│   └── tests/                  pytest
├── frontend-web/               React + Vite (port 5173) – buyer, shop AND admin
│   └── src/{pages,components,services/api.js}
└── frontend-mobile/music_market/  Flutter (provider, go_router, dio) – buyer + shop ONLY
    └── lib/{core,features/*}      features: auth, marketplace, wishlist, alerts,
                                   notifications, assistant, buyer, shop
```

## Product spec (source of truth)

### Roles
- **buyer** – active right after registration.
- **shop** – needs admin approval before login works.
- **admin** – web only. Admins cannot log in on mobile.

### Buyer AND shop can
- Browse the marketplace, search/filter, open listing details (photos, map, seller name + phone).
- Wishlist.
- My Alerts: create manually, or "Fill with AI" from free text (Agent 03 parse).
- Notifications: `NEW_MATCH`, `PRICE_DROP`, `ITEM_SOLD`, `ORDER_PLACED`, `LISTING_REMOVED`.
- Shopping Assistant chat (Agent 04).
- Buy Now -> checkout (demo card `1234 1234 1234 1234`, or Cash on Delivery) -> My Orders.
- Profile.
- Create posts (sell items) and manage My Listings.

### Create post
- Fields: title, description, **free-text category** (with suggestions, any music item),
  **free-text brand** (with suggestions), model, condition, year, price,
  **one** location section (OSM map pin that fills the location text), photos.
- "Check Price" (Agent 01) shows the fair range + verdict + a "Use Suggested Price" button.
- On submit: Fair Price + Trust check (Agent 02) decide the status:
  - trust 70+ -> `LIVE`
  - trust 40-69 -> `LIVE` + warning
  - trust < 40 **or** price > LKR 200,000 -> `FLAGGED` (admin review)

### My Listings
- Owner sees status, trust score, fair-price verdict.
- Owner can EDIT (form opens pre-filled; change only what you need), change price, delete.
- `SOLD` items cannot be edited.

### Privacy
- Trust score and fair verdict are visible **only to the owner and the admin**.
  Never in public lists or public details.

### Notifications
- Price drop on a wishlisted item -> `PRICE_DROP` to every watcher, **on every drop**.
- A new `LIVE` listing matching a saved alert -> `NEW_MATCH`.
  Existing listings must also be checked when an alert is created.

### Orders
- `POST /api/orders` runs in one transaction.
- `409` if the listing is already sold.
- Card -> `PAID` (store only the last 4 digits). COD -> `CONFIRMED_COD`.
- The listing becomes `SOLD`. Both buyer and seller get a notification.
- A user cannot buy their own listing. An admin cannot buy.

### Admin (web)
- Dashboard stats, approve shops, flagged/pending review, re-check.
- View any listing (details + Delete only, no Buy).
- Delete listings (not ones that have orders).

## Running locally on Windows

Start in this order: ai-service -> backend -> web / mobile.

| Part | Port | Commands (PowerShell, from repo root) |
| --- | --- | --- |
| ai-service | 8000 | `cd ai-service; python -m venv .venv; .venv\Scripts\activate; pip install -r requirements.txt; uvicorn api:app --host 127.0.0.1 --port 8000 --reload` |
| backend | 5036 | `cd backend\MusicMarket.Api; dotnet restore; dotnet run --launch-profile http` (Swagger: http://localhost:5036/swagger) |
| web | 5173 | `cd frontend-web; npm install; npm run dev` |
| mobile | – | `cd frontend-mobile\music_market; flutter pub get; flutter run` (Android emulator uses `10.0.2.2:5036`) |

Config (names only – never print the values):
- `backend/MusicMarket.Api/.env`: `DATABASE_URI`, `CLOUDINARY_URL`, `AI_SERVICE_URL`, `AI_INTERNAL_KEY` (optional).
  JWT settings come from `appsettings.json` (`Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`).
- `ai-service/.env` (see `.env.example`): `LLM_PROVIDER`, `GOOGLE_API_KEY`, `DATABASE_URI`, `ENABLE_CLIP`,
  `X_INTERNAL_KEY` (optional, must equal the backend's `AI_INTERNAL_KEY`).
- Set `ENABLE_CLIP=false` for fast local start-up.

## Build / test commands

| Part | Commands |
| --- | --- |
| backend | `cd backend\MusicMarket.Api; dotnet build` then `cd ..; dotnet test MusicMarket.Tests` |
| ai-service | `cd ai-service; .venv\Scripts\python -m pytest tests -v` (no LLM or DB needed: tests mock them) |
| web | `cd frontend-web; npm ci; npm run lint; npm run build` |
| mobile | `cd frontend-mobile\music_market; flutter pub get; flutter analyze; flutter test` |

Run the health check for every part you touched before saying a task is done.

## Rules

### Git
- Never use `git add .` or `git add -A`. Stage files by name.
- Never commit: `.env`, `appsettings.Development.json`, secrets/keys/connection strings,
  `bin/`, `obj/`, `build/`, `dist/`, `node_modules/`, `.dart_tool/`, `venv/`/`.venv/`,
  `__pycache__/`, `.pytest_cache/`, test output dumps.
- Never print secrets (env values, connection strings, JWT keys, API keys) in output, logs or commits.

### Database
- Migrations must be **additive** (add tables/columns/indexes; do not drop or rename data).
- Every new migration must be tested: `dotnet build`, then apply it to a local/test DB before pushing.
- Keep `AppDbContext`, the migration and `AppDbContextModelSnapshot.cs` in sync.

### API
- Every API error returns JSON `{"message": "..."}` – never a bare string, never an empty body.
  In controllers use `return this.Error(400, "...")` (Helpers/ApiError.cs); never `Forbid()`/`NotFound()`.
- No silent catch blocks. Every catch must log the error and/or show it to the user.

### Code style
- Keep simple English comments, matching the surrounding code.
- JSON is camelCase between backend and frontends.
  snake_case is used **only** for the AI-service DTOs (`[JsonPropertyName("snake_case")]` in
  `AiServiceClient.cs` / `SmartAlertDtos.cs`, Pydantic models in `ai-service/api.py`).
- LLMs are created only through `ai-service/llm_config.py`.
