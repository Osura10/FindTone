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
from Agent_03.agent import run_smart_alert, parse_alert_text
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
async def api_fair_price(request: FairPriceRequest, _ = Depends(verify_internal_key)):
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
async def api_trust_check(request: TrustCheckRequest, _ = Depends(verify_internal_key)):
    result = run_trust_check(request.listing_id)
    if "error" in result and result.get("status_code") == 404:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

class SmartAlertRequest(BaseModel):
    listing_id: int
    event: str
    old_price: Optional[float] = None

@app.post("/api/agents/smart-alert")
async def api_smart_alert(request: SmartAlertRequest, _ = Depends(verify_internal_key)):
    result = run_smart_alert(request.listing_id, request.event, request.old_price)
    return result

class ParseAlertRequest(BaseModel):
    text: str

@app.post("/api/agents/parse-alert")
async def api_parse_alert(request: ParseAlertRequest, _ = Depends(verify_internal_key)):
    result = parse_alert_text(request.text)
    return result

class ChatRequest(BaseModel):
    message: str
    session_id: str = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

@app.post("/api/chat")
async def chat(request: ChatRequest):
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
