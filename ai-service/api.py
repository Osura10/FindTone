import uuid
import os
from typing import Optional, List
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from ChatBot.agent_01 import create_music_agent
from llm_config import message_text
from Agent_01.agent import run_fair_price
from Agent_02.agent import run_trust_check
from Agent_02.tools import get_clip_model
from Agent_03.agent import run_smart_alert, parse_alert_text, run_alert_backfill
from Agent_04.agent import run_shopping_assistant, create_shopping_assistant
app = FastAPI(title="MusicMarket AI Service")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the agents once
agent_01 = create_music_agent()

clip_status = "off"
if os.getenv("ENABLE_CLIP", "true").lower() != "false":
    get_clip_model()
    clip_status = "on"

provider = os.getenv("LLM_PROVIDER", "ollama")
model_name = os.getenv("OLLAMA_MODEL", "llama3.1:8b") if provider == "ollama" else os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

print("\n" + "="*50)
print(f"     [ChatBot] RAG assistant ready")
print(f"     [Agent 01] Fair Price Agent ready")
print(f"     [Agent 02] Trust & Fraud Agent ready (CLIP: {clip_status})")
print(f"     [Agent 03] Smart Alert Agent ready")

if create_shopping_assistant:
    print(f"     [Agent 04] Shopping Assistant ready")
    
print(f"     LLM provider: {provider} ({model_name})")
print("="*50 + "\n")

def verify_internal_key(x_internal_key: Optional[str] = Header(None)):
    expected_key = os.getenv("X_INTERNAL_KEY")
    if expected_key:
        if x_internal_key != expected_key:
            raise HTTPException(status_code=403, detail="Invalid X-Internal-Key")
    return True

class FairRange(BaseModel):
    min: float
    max: float

class FairPriceRequest(BaseModel):
    listing_id: Optional[int] = None
    brand: str
    model: str
    category: str
    condition: str
    year: Optional[int] = None
    asking_price: float
    description: str

class FairPriceResponse(BaseModel):
    fair_price: float
    fair_range: FairRange
    asking_price: float
    deviation_percent: float
    verdict: str
    confidence: str
    flag_for_trust: bool
    extras_detected: List[str] = []
    explanation: str
    used_fallback: bool

@app.post("/api/agents/fair-price", response_model=FairPriceResponse)
def api_fair_price(request: FairPriceRequest, _ = Depends(verify_internal_key)):
    result = run_fair_price(request.model_dump() if hasattr(request, 'model_dump') else request.dict())
    return result

class TrustCheckRequest(BaseModel):
    listing_id: int

class TrustCheckResponse(BaseModel):
    listing_id: int
    trust_score: int
    decision: str
    warning: bool
    signals: list = []
    reason: str
    image_hashes: list = []
    duplicate_listing_ids: list = []
    used_fallback: bool

@app.post("/api/agents/trust-check", response_model=TrustCheckResponse)
def api_trust_check(request: TrustCheckRequest, _ = Depends(verify_internal_key)):
    result = run_trust_check(request.listing_id)
    if "error" in result and result.get("status_code") == 404:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

class SmartAlertRequest(BaseModel):
    listing_id: int
    event: str
    old_price: Optional[float] = None

@app.post("/api/agents/smart-alert")
def api_smart_alert(request: SmartAlertRequest, _ = Depends(verify_internal_key)):
    result = run_smart_alert(request.listing_id, request.event, request.old_price)
    return result

class AlertBackfillRequest(BaseModel):
    saved_search_id: int

@app.post("/api/agents/smart-alert/backfill")
def api_smart_alert_backfill(request: AlertBackfillRequest, _ = Depends(verify_internal_key)):
    # Called when an alert is created, updated or enabled: match it against existing LIVE listings.
    result = run_alert_backfill(request.saved_search_id)
    if result.get("error") == "Saved search not found":
        raise HTTPException(status_code=404, detail=result["error"])
    return result

class ParseAlertRequest(BaseModel):
    text: str

@app.post("/api/agents/parse-alert")
def api_parse_alert(request: ParseAlertRequest, _ = Depends(verify_internal_key)):
    result = parse_alert_text(request.text)
    return result

class ShoppingAssistantRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[int] = None

class ShoppingAssistantListing(BaseModel):
    id: int
    title: str
    brand: str
    model: str
    category: str
    condition: str
    year: Optional[int] = None
    price: float
    location: str
    status: str
    trust_score: Optional[int] = None
    fair_price: Optional[float] = None
    fair_price_min: Optional[float] = None
    fair_price_max: Optional[float] = None
    price_verdict: Optional[str] = None
    price_explanation: Optional[str] = None
    image_url: Optional[str] = None

class ShoppingAssistantResponse(BaseModel):
    reply: str
    listings: List[ShoppingAssistantListing] = []
    comparison: Optional[dict] = None
    price_insight: Optional[dict] = None
    alert_to_create: Optional[dict] = None
    session_id: str
    used_fallback: bool

@app.post("/api/agents/shopping-assistant", response_model=ShoppingAssistantResponse)
def api_shopping_assistant(request: ShoppingAssistantRequest, _ = Depends(verify_internal_key)):
    result = run_shopping_assistant(
        message=request.message,
        session_id=request.session_id,
        user_id=request.user_id
    )
    
    # Logging
    tools_called = []
    if result.get("listings"): tools_called.append("search_listings")
    if result.get("comparison"): tools_called.append("compare_items")
    if result.get("price_insight"): tools_called.append("get_price_insight")
    if result.get("alert_to_create"): tools_called.append("create_alert_criteria")
    
    tools_str = ", ".join(tools_called) if tools_called else "none"
    listings_count = len(result.get("listings", []))
    print(f"[Shopping] tools called: [{tools_str}] | listings={listings_count} | used_fallback={result.get('used_fallback', False)}")
    
    return result

class ChatRequest(BaseModel):
    message: str
    session_id: str = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

@app.post("/api/chat")
def chat(request: ChatRequest):
    # Generate a session ID if not provided
    session_id = request.session_id if request.session_id else str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}

    try:
        response = agent_01.invoke(
            {"messages": [HumanMessage(content=request.message)]}, 
            config=config
        )
        final_answer = message_text(response["messages"][-1])
        return ChatResponse(response=final_answer, session_id=session_id)
    except Exception as e:
        return ChatResponse(response=f"Error: {str(e)}", session_id=session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
