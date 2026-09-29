import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from Agent_04.agent import run_shopping_assistant
import json

def run_tests():
    print("Test 1: hi")
    res1 = run_shopping_assistant("hi")
    print(json.dumps(res1, indent=2))
    print("\n---")
    
    session = res1["session_id"]
    
    print("Test 2: Show me Yamaha acoustic guitars under 40000")
    res2 = run_shopping_assistant("Show me Yamaha acoustic guitars under 40000", session_id=session)
    print(json.dumps(res2, indent=2))
    print("\n---")
    
    # We don't know the exact IDs, so just say 'compare the first two'
    print("Test 3: Compare the first two")
    if res2["listings"] and len(res2["listings"]) >= 2:
        l1, l2 = res2["listings"][0]["id"], res2["listings"][1]["id"]
        res3 = run_shopping_assistant(f"Compare listing {l1} and {l2}", session_id=session)
    else:
        res3 = run_shopping_assistant("Compare the first two", session_id=session)
    print(json.dumps(res3, indent=2))
    print("\n---")
    
    print("Test 4: Is the first one a good price?")
    if res2["listings"]:
        l1 = res2["listings"][0]["id"]
        res4 = run_shopping_assistant(f"Is listing {l1} a good price?", session_id=session)
    else:
        res4 = run_shopping_assistant("Is the first one a good price?", session_id=session)
    print(json.dumps(res4, indent=2))
    print("\n---")
    
    print("Test 5: Tell me when a Fender Stratocaster under 150000 appears")
    res5 = run_shopping_assistant("Tell me when a Fender Stratocaster under 150000 appears", session_id=session)
    print(json.dumps(res5, indent=2))
    print("\n---")
    
    print("Done")

if __name__ == "__main__":
    run_tests()
