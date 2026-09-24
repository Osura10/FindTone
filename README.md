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

---

## Agent 02 - Trust & Fraud Check Agent

**Purpose:**  
To automatically evaluate the safety, authenticity, and pricing of musical instrument listings, identifying potential scams, duplicates, or severely miscategorized items before they mislead buyers.

**Where it runs in the app:**  
- Triggered immediately after a **Create Listing** or **Update Price** operation in the backend, right after the Fair Price agent has evaluated the listing.
- Available on-demand for manual re-runs via the **Admin Recheck** endpoint.

### Tools

| Tool Name | What it does | Input | Output |
| --- | --- | --- | --- |
| `verify_images` | Downloads images, calculates their perceptual hashes to find duplicates, and uses zero-shot CLIP inference to verify the instrument matches the stated category. | `listing_id` (int) | Duplicate IDs found, category match state (e.g. "match" or "mismatch"), and a list of PHashes. |
| `check_price_signals` | Evaluates if the requested price is suspiciously low compared to the fair market range. | `listing_id` (int) | `price_mismatch` (boolean indicating if it's too low). |
| `get_seller_history` | Calculates seller reputation based on total sales and the frequency of previously rejected or flagged listings. | `listing_id` (int) | Total listings, rejected listings count. |
| `calculate_trust_and_route` | Applies standard logic rules against the gathered tool signals, calculates a final score, and determines the routing decision. | `category_mismatch` (bool), `duplicate_count` (int), `price_mismatch` (bool), `rejected_count` (int) | `trust_score` (int), `decision` (string), and itemized signal penalties. |

### Penalty & Routing Rules

**Scoring:**  
- **Base Score:** 100
- **Image Category Mismatch:** -30 pts
- **Price Suspiciously Low:** -20 pts
- **Previously Rejected Listings:** -15 pts per listing
- **Duplicate Images Found:** -40 pts

**Routing Decision:**  
- **LIVE (Score 70+):** The listing is approved and immediately visible to buyers.
- **LIVE with Warning (Score 40-69):** The listing is visible but flagged with a "Low Trust" badge for buyers.
- **FLAGGED (Score < 40 or Price > LKR 200,000):** The listing is hidden from buyers and placed in a queue for manual Admin review.

### Image Verification & Category Check

**Duplicate Detection (PHash):**  
Using the `imagehash` library, each image is downloaded and converted to a perceptual hash (PHash) string. These hashes are compared against the database using a Hamming distance threshold to confidently identify visually similar or identical photos already used by other listings.

**Zero-Shot Category Verification (CLIP):**  
The `transformers` CLIP model is used to compare each image against a textual prompt (e.g., "a photo of a {category}"). If the visual features strongly diverge from the listed category text, the model returns a low similarity score, signaling a potential scam or upload mistake.

### ENABLE_CLIP

Since the CLIP model is resource-intensive and large, it is only loaded into memory if `ENABLE_CLIP=true` is set in the environment variables. If `ENABLE_CLIP=false`, the agent skips category checking and defaults to a "match" for all images.

### Data Flow & Fallback Strategy

**Why numbers come from tools:**  
LLMs can be unpredictable when calculating exact penalty points. Therefore, the Agent calls `calculate_trust_and_route`, and the final numeric score and structured signals are extracted *directly* from the tool's output dictionary rather than relying on the LLM's raw text generation. The LLM only writes a human-readable "reason".

**Fallback:**  
If the AI encounters a Python exception, rate limit, or timeout, a deterministic fallback kicks in. It assigns a base score of 50, marks it as "PENDING" (meaning it defaults to manual review), and records that the fallback was triggered.

### Admin Review Flow

Flagged and pending listings appear on the Admin Dashboard under "Flagged Listings". From there, admins can:
1. **Approve:** Force the listing to "LIVE".
2. **Reject:** Mark the listing as "REJECTED" and append a note detailing the reason.
3. **Re-check:** Send the listing back through the AI pipeline to re-evaluate it against updated rules or market data.

### Running Tests

To run the agent's unit tests:
```bash
cd ai-service
pytest tests/test_trust_tools.py -v
```
*(Ensure your virtual environment is active).*

### Example Request/Response

**Request:** `POST /api/agents/trust-check`
```json
{
  "listing_id": 142
}
```

**Response:**
```json
{
  "listing_id": 142,
  "trust_score": 50,
  "decision": "FLAGGED",
  "warning": false,
  "signals": [
    {
      "code": "IMG_CATEGORY_MISMATCH",
      "points": -30,
      "detail": "Images do not appear to match the category 'Electric Guitar'."
    },
    {
      "code": "PRICE_SUSPICIOUSLY_LOW",
      "points": -20,
      "detail": "Price is suspiciously lower than the fair market minimum."
    }
  ],
  "reason": "This listing has been flagged because the provided photos do not resemble an Electric Guitar. Additionally, the asking price is suspiciously low compared to typical market values.",
  "image_hashes": [
    {
      "image_id": 412,
      "phash": "a8c2f1b4d6e9c8f0"
    }
  ],
  "duplicate_listing_ids": [],
  "used_fallback": false
}
```
