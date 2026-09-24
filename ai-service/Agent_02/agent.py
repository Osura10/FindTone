import sys
import os
import json
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, ToolMessage
from llm_config import get_chat_llm, message_text
from .tools import verify_images, check_price_signals, get_seller_history, calculate_trust_and_route

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db import fetch_one

def create_trust_agent():
    tools = [verify_images, check_price_signals, get_seller_history, calculate_trust_and_route]
    llm = get_chat_llm(temperature=0.1)
    system_prompt = """You are a Trust and Fraud Check agent.
You receive a listing_id.

Steps you MUST follow in order:
1) Call verify_images to check for duplicate images and category matches.
2) Call check_price_signals to check for suspiciously low prices or frequent changes.
3) Call get_seller_history to get account age and previous rejections.
4) Call calculate_trust_and_route using the results from the above tools (category_mismatch is true if category_check == "mismatch").
5) Write a short reason (max 3 sentences, simple English) for the admin that explains the decision using ONLY the applied signals. You MUST NEVER invent numbers.
"""
    agent = create_agent(llm, tools=tools, system_prompt=system_prompt)
    return agent

agent = create_trust_agent()

def run_trust_check(listing_id: int) -> dict:
    listing = fetch_one('SELECT "Id" FROM "Listings" WHERE "Id" = %s', (listing_id,))
    if not listing:
        return {"error": "Listing not found", "status_code": 404}
        
    result = {
        "listing_id": listing_id,
        "trust_score": 100,
        "decision": "LIVE",
        "warning": False,
        "signals": [],
        "reason": "",
        "image_hashes": [],
        "duplicate_listing_ids": [],
        "used_fallback": False
    }

    try:
        response = agent.invoke({"messages": [HumanMessage(content=f"Listing ID: {listing_id}")]})
        messages = response.get("messages", [])
        
        verify_res = None
        calc_res = None
        
        for msg in messages:
            if isinstance(msg, ToolMessage):
                if msg.name == "verify_images":
                    verify_res = json.loads(msg.content)
                elif msg.name == "calculate_trust_and_route":
                    calc_res = json.loads(msg.content)

        if verify_res and calc_res:
            result["trust_score"] = calc_res.get("trust_score", 100)
            result["decision"] = calc_res.get("decision", "LIVE")
            result["warning"] = calc_res.get("warning", False)
            result["signals"] = calc_res.get("signals", [])
            result["image_hashes"] = verify_res.get("image_hashes", [])
            result["duplicate_listing_ids"] = verify_res.get("duplicate_listing_ids", [])
            result["reason"] = message_text(messages[-1])
            return result
        else:
            raise Exception("LLM did not call the required tools.")
            
    except Exception as e:
        print(f"Trust Agent failed or fallback triggered: {e}")
        
        try:
            verify_res = verify_images.invoke({"listing_id": listing_id})
            price_res = check_price_signals.invoke({"listing_id": listing_id})
            seller_res = get_seller_history.invoke({"listing_id": listing_id})
            
            calc_res = calculate_trust_and_route.invoke({
                "duplicate_found": verify_res.get("duplicate_found", False),
                "category_mismatch": verify_res.get("category_check") == "mismatch",
                "suspicious_low": price_res.get("suspicious_low", False),
                "frequent_changes": price_res.get("frequent_changes", False),
                "is_new_account": seller_res.get("is_new_account", False),
                "rejected_listings": seller_res.get("rejected_listings", 0),
                "asking_price": price_res.get("asking_price", 0.0)
            })
            
            result["trust_score"] = calc_res.get("trust_score", 100)
            result["decision"] = calc_res.get("decision", "LIVE")
            result["warning"] = calc_res.get("warning", False)
            result["signals"] = calc_res.get("signals", [])
            result["image_hashes"] = verify_res.get("image_hashes", [])
            result["duplicate_listing_ids"] = verify_res.get("duplicate_listing_ids", [])
            result["used_fallback"] = True
            
            if calc_res.get("signals"):
                signal_details = [s["detail"] for s in calc_res["signals"]]
                result["reason"] = f"Fallback generated reason. Applied penalties: {'; '.join(signal_details)}"
            else:
                result["reason"] = "Fallback generated reason. No penalties applied."
                
        except Exception as fallback_e:
            print(f"Trust Fallback also failed: {fallback_e}")
            result["reason"] = "Could not perform trust check due to an error."
            result["used_fallback"] = True
            
    return result
