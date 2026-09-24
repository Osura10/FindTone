import uuid
from langchain_core.messages import HumanMessage
from ChatBot.agent_01 import create_music_agent
from llm_config import message_text

def main():
    print("Initializing AI Service...")
    
    # 1. Initialize Agent 01
    agent_01 = create_music_agent()
    print("Agent 01 (Music/RAG) is ready!\n")
    
    # 2. Create a unique session ID for this chat
    # This allows the agent to remember the history of this specific conversation.
    # If a new user connects, you generate a new thread_id for them.
    session_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}

    print("========================================")
    print("Welcome to MusicMarket AI Assistant")
    print("Type 'quit' or 'exit' to stop the chat.")
    print("========================================\n")

    # 3. Simple Chat Loop
    while True:
        user_input = input("You: ")
        
        if user_input.lower() in ['quit', 'exit']:
            print("Goodbye!")
            break
            
        try:
            # 4. Run the agent with the user's message and the config (for memory)
            print("\nAgent is thinking...")
            response = agent_01.invoke(
                {"messages": [HumanMessage(content=user_input)]}, 
                config=config
            )
            
            # The agent returns a list of messages. The last one is the final answer.
            final_answer = message_text(response["messages"][-1])
            print(f"\nAgent: {final_answer}\n")
            
        except Exception as e:
            print(f"\n[Error]: {e}\n")

if __name__ == "__main__":
    main()
