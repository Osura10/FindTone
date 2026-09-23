import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_core.tools import create_retriever_tool, tool
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage
from duckduckgo_search import DDGS

# --- 1. Configuration Settings --- #
# Note: Paths are relative to where main.py will run (ai-service folder)
PDF_PATH = "ChatBot/Doc/MusicMarket_Information_RAG_Knowledge_Document.pdf"
VECTOR_DB_DIR = "ChatBot/chroma_db"
OLLAMA_MODEL = "llama3.1:8b"
OLLAMA_EMBEDDING_MODEL = "nomic-embed-text" # Best local embedding model

# --- 2. RAG Pipeline Setup (Retrieval-Augmented Generation) --- #
def initialize_rag():
    """
    Sets up the RAG database. If the database already exists, it loads it.
    Otherwise, it reads the PDF, chunks the text, and creates new embeddings.
    """
    # Initialize the embedding model
    embeddings = OllamaEmbeddings(model=OLLAMA_EMBEDDING_MODEL)
    
    # Check if the database already exists to avoid re-creating it every time
    if os.path.exists(VECTOR_DB_DIR) and os.listdir(VECTOR_DB_DIR):
        print("[ChatBot] Loading existing Vector Database...")
        vectorstore = Chroma(persist_directory=VECTOR_DB_DIR, embedding_function=embeddings)
    else:
        print("[ChatBot] Creating new Vector Database from PDF...")
        # Step A: Load the PDF file
        loader = PyPDFLoader(PDF_PATH)
        docs = loader.load()

        # Step B: Split the text into smaller chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # Step C: Convert chunks to embeddings and save to disk
        vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=VECTOR_DB_DIR)
    
    # Return a retriever that fetches the top 3 most relevant chunks
    return vectorstore.as_retriever(search_kwargs={"k": 3})

# --- 3. Custom Web Search Tool --- #
@tool
def web_search_tool(query: str) -> str:
    """Use this tool to search the web for music-related questions not found in the PDF document."""
    try:
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=3)]
            if not results:
                return "No results found."
            return str(results)
    except Exception as e:
        return f"Error during web search: {e}"

# --- 4. Main Agent Creation --- #
def create_music_agent():
    """
    Builds the AI Agent with the RAG tool, Web Search tool, and Chat History memory.
    """
    # 1. Get the RAG retriever
    retriever = initialize_rag()
    
    # 2. Create the RAG tool for the agent to use
    rag_tool = create_retriever_tool(
        retriever,
        "music_knowledge_base",
        "Use this tool to answer questions based on the internal Music Market Information document."
    )
    
    # 3. Combine both tools in a list
    tools = [rag_tool, web_search_tool]

    # 4. Set up the Language Model
    llm = ChatOllama(model=OLLAMA_MODEL, temperature=0.1)

    # 5. Define the strict rules for the agent
    system_prompt = """You are a helpful AI assistant specialized ONLY in music.
You have access to a music knowledge base and a web search tool.

CRITICAL RULES:
1. GREETINGS: When the user greets you or tells you their name, you MUST reply ONLY with "Hello [Name], how can I help you?" (or just "Hello, how can I help you?" if no name is given). DO NOT use any tools. DO NOT output any other text. DO NOT introduce MusicMarket or its features. Your ENTIRE response must be just that single sentence!
2. YOU CAN ONLY DISCUSS MUSIC AND THE MusicMarket PLATFORM.
3. If the user asks about ANYTHING ELSE (like cars, BMW, science, etc.), you MUST NOT explain what the unrelated topic is. You MUST completely refuse. Reply EXACTLY with this message:
   "I can’t answer this question because it is not related to MusicMarket or music. Please ask me something related to music, musical instruments, or the MusicMarket platform."
4. Do NOT apologize. Do NOT explain what the unrelated topic is. Just give the exact rejection message and nothing else.
5. Always answer valid questions using simple English that everyone can understand.
"""

    # 6. Add Chat History Memory (MemorySaver keeps history in RAM for active sessions)
    memory = MemorySaver()

    # 7. Create and return the agent using LangGraph's create_agent function
    # Passing the checkpointer allows the agent to remember past messages if given a thread_id
    agent_executor = create_agent(
        llm, 
        tools=tools, 
        system_prompt=system_prompt,
        checkpointer=memory
    )
    
    return agent_executor
