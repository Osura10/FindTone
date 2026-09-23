import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from ChatBot.agent_01 import create_music_agent

app = FastAPI(title="MusicMarket AI Service")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the agent once
print("Initializing Agent 01...")
agent_01 = create_music_agent()
print("Agent 01 is ready!")

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
        final_answer = response["messages"][-1].content
        return ChatResponse(response=final_answer, session_id=session_id)
    except Exception as e:
        return ChatResponse(response=f"Error: {str(e)}", session_id=session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
