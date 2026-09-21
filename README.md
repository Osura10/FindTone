# FindTone

FindTone is a music marketplace platform with an Agentic AI assistant, an ASP.NET Core backend API, a React web frontend, and a Flutter mobile app.

---

## Project Structure

```text
FindTone/
├── ai-service/       # Python FastAPI service (Agentic AI)
├── backend/          # ASP.NET Core 8 Web API
├── frontend-web/     # React 19 + Vite web app
├── mobile-app/       # Flutter mobile app
└── docs/             # Documentation
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Osura10/FindTone.git
cd FindTone
```

---

### 2. Run the Services

#### Backend (.NET 8 Web API)

```bash
cd backend/MusicMarket.Api
dotnet restore
dotnet run
```
- API runs at: `http://localhost:5036`
- Swagger UI: `http://localhost:5036/swagger`

---

#### Frontend Web (React + Vite)

```bash
cd frontend-web
npm install
npm run dev
```
- Web app runs at: `http://localhost:5173`

---

#### AI Service (Python)

```bash
cd ai-service
python -m venv .venv
```

Activate the virtual environment:
- **Windows:** `.venv\Scripts\activate`
- **macOS/Linux:** `source .venv/bin/activate`

Install dependencies:
```bash
pip install -r requirements.txt
```

Run the service:
```bash
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```
- Service runs at: `http://localhost:8000`

---

#### Mobile App (Flutter)

```bash
cd mobile-app
flutter pub get
flutter run
```
