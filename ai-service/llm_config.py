"""
Central LLM configuration for all MusicMarket agents.

Switch provider with ONE line in .env:
    LLM_PROVIDER=ollama   -> local testing (no API limits, no cost)
    LLM_PROVIDER=gemini   -> hosting / final demo (needs GOOGLE_API_KEY)

Every agent must get its models from here - never import ChatOllama or
ChatGoogleGenerativeAI directly inside an agent file.
"""
import base64
import os

import requests
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

load_dotenv()

PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()

# Ollama (local) models
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.1:8b")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "gemma3:4b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# Gemini (hosted) models
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.6-flash")
GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-3.6-flash")
GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "models/gemini-embedding-001")



def get_chat_llm(temperature: float = 0.1):
    """Text LLM used by agents (supports tool calling)."""
    if PROVIDER == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=GEMINI_CHAT_MODEL, temperature=temperature)

    from langchain_ollama import ChatOllama
    return ChatOllama(model=OLLAMA_CHAT_MODEL, temperature=temperature)


def get_vision_llm(temperature: float = 0.1):
    """Multimodal LLM that can look at photos (Listing Quality Agent etc.)."""
    if PROVIDER == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=GEMINI_VISION_MODEL, temperature=temperature)

    from langchain_ollama import ChatOllama
    return ChatOllama(model=OLLAMA_VISION_MODEL, temperature=temperature)


def get_embeddings():
    """Embedding model for the RAG vector database."""
    if PROVIDER == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(model=GEMINI_EMBED_MODEL)

    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=OLLAMA_EMBED_MODEL)


def vector_db_dir(base_dir: str) -> str:
    """
    Each provider's embeddings have a different size, so each gets its own
    Chroma folder. Otherwise switching provider breaks the saved database.
    """
    return f"{base_dir}_{PROVIDER}"


def image_message(prompt: str, image_urls: list[str]) -> HumanMessage:
    """
    Build one message with text + photos that works for BOTH Ollama and Gemini.
    Images are downloaded (e.g. from Cloudinary) and sent as base64.
    """
    content = [{"type": "text", "text": prompt}]
    for url in image_urls:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        mime = resp.headers.get("Content-Type", "image/jpeg").split(";")[0]
        b64 = base64.b64encode(resp.content).decode("utf-8")
        content.append({"type": "image_url", "image_url": f"data:{mime};base64,{b64}"})
    return HumanMessage(content=content)
