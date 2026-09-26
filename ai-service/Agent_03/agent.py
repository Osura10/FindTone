import sys
import os
import json
import re
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, ToolMessage
from llm_config import get_chat_llm, message_text
from .tools import get_listing_details, find_new_matches, detect_price_drop, prepare_notifications

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db import fetch_all

def create_alert_agent():
    tools = [get_listing_details, find_new_matches, detect_price_drop, prepare_notifications]
    llm = get_chat_llm(temperature=0.1)
    system_prompt = """You are a Smart Alert Agent.
You receive a listing_id, event ("NEW_LISTING" or "PRICE_DROP"), and optionally old_price.
Steps you MUST follow in order:
1) Call get_listing_details with the listing_id.
2) If event is NEW_LISTING, call find_new_matches. If PRICE_DROP, call detect_price_drop (pass old_price).
3) Call prepare_notifications with the results of step 2.
4) Rewrite ONLY the "message" field of each notification into a friendly message of max 2 sentences (simple English, one emoji at the start allowed). Keep every number, price, and name exactly as in the template. Do not change the "title" or "user_id" or "saved_search_id".
5) Return ONLY a JSON object containing a "notifications" array.
"""
    return create_agent(llm, tools=tools, system_prompt=system_prompt)

alert_agent = create_alert_agent()

def run_smart_alert(listing_id: int, event: str, old_price: float = None) -> dict:
    result = {
        "listing_id": listing_id,
        "event": event,
        "notifications": [],
        "matched_search_ids": [],
        "used_fallback": False
    }
    
    # 1. Quick check without LLM
    try:
        if event == "NEW_LISTING":
            m_res = find_new_matches.invoke({"listing_id": listing_id})
            if not m_res.get("matches"):
                print("[SmartAlert] No matches, skipping LLM.")
                return result
        else:
            p_res = detect_price_drop.invoke({"listing_id": listing_id, "old_price": old_price})
            if not p_res.get("is_drop") or not p_res.get("watchers"):
                print("[SmartAlert] No watchers or not a drop, skipping LLM.")
                return result
    except Exception as e:
        print(f"[SmartAlert] Quick check failed: {e}")

    # 2. Run agent
    try:
        msg = f"Listing ID: {listing_id}\nEvent: {event}\nOld Price: {old_price}"
        response = alert_agent.invoke({"messages": [HumanMessage(content=msg)]})
        messages = response.get("messages", [])
        
        final_text = message_text(messages[-1])
        if "```json" in final_text:
            final_text = final_text.split("```json")[1].split("```")[0].strip()
        elif "```" in final_text:
            final_text = final_text.split("```")[1].strip()
            
        data = json.loads(final_text)
        notifications = data.get("notifications", [])
        result["notifications"] = notifications
        
        for n in notifications:
            if n.get("saved_search_id"):
                result["matched_search_ids"].append(n["saved_search_id"])
                
        print(f"[SmartAlert] Agent prepared {len(notifications)} notifications.")
        print(f"[SmartAlert] used_fallback=False, notifications={len(notifications)}")
    except Exception as e:
        print(f"[SmartAlert] Agent failed, using fallback: {e}")
        print("[SmartAlert] LLM did not call tools (ollama) -> deterministic pipeline, LLM wrote the reason")
        result["used_fallback"] = True
        try:
            m_res = find_new_matches.invoke({"listing_id": listing_id}) if event == "NEW_LISTING" else {}
            p_res = detect_price_drop.invoke({"listing_id": listing_id, "old_price": old_price}) if event == "PRICE_DROP" else {}
            matches = m_res.get("matches", [])
            watchers = p_res.get("watchers", [])
            
            notif_res = prepare_notifications.invoke({
                "listing_id": listing_id,
                "event": event,
                "matches": matches,
                "watchers": watchers,
                "old_price": old_price
            })
            raw_notifications = notif_res.get("notifications", [])
            
            # Rewrite messages with LLM in the fallback as requested
            try:
                if raw_notifications:
                    llm = get_chat_llm(temperature=0.1)
                    prompt = f"""Rewrite ONLY the "message" field of each notification into a friendly message of max 2 sentences (simple English, one emoji at the start allowed). Keep every number, price, and name exactly as in the template. Return JSON with a "notifications" array where each object has "id" (the index) and "message".
Notifications: {json.dumps([{'id': i, 'message': n['message']} for i, n in enumerate(raw_notifications)])}
Do not invent facts."""
                    resp = llm.invoke([HumanMessage(content=prompt)])
                    text_resp = message_text(resp)
                    if "```json" in text_resp:
                        text_resp = text_resp.split("```json")[1].split("```")[0].strip()
                    elif "```" in text_resp:
                        text_resp = text_resp.split("```")[1].strip()
                    rewritten = json.loads(text_resp).get("notifications", [])
                    for r in rewritten:
                        idx = r.get("id")
                        if idx is not None and 0 <= idx < len(raw_notifications) and r.get("message"):
                            raw_notifications[idx]["message"] = r["message"]
            except Exception as llm_e:
                print(f"[SmartAlert] LLM failed to rewrite notifications: {llm_e}")
                
            notifications = raw_notifications
            result["notifications"] = notifications
            
            for n in notifications:
                if n.get("saved_search_id"):
                    result["matched_search_ids"].append(n["saved_search_id"])
                    
            print(f"[SmartAlert] Fallback prepared {len(notifications)} notifications.")
        except Exception as e2:
            print(f"[SmartAlert] Fallback also failed: {e2}")
            
    return result

def parse_alert_text(text: str) -> dict:
    used_fallback = False
    result = {
        "name": text,
        "category": None,
        "brand": None,
        "model_keyword": None,
        "min_price": None,
        "max_price": None,
        "conditions": None,
        "location": None
    }
    
    try:
        categories = [r["Category"] for r in fetch_all('SELECT DISTINCT "Category" FROM "CatalogModels"')]
        brands = [r["Brand"] for r in fetch_all('SELECT DISTINCT "Brand" FROM "CatalogModels"')]
    except Exception:
        categories = []
        brands = []
    
    try:
        llm = get_chat_llm(temperature=0.1)
        prompt = f"""You extract search filters from the following text: "{text}"
Allowed categories: {', '.join(categories) if categories else 'Electric Guitar, Acoustic Guitar, Bass, Drums, Keyboards, Amp, Effect Pedal, Accessory'}
Allowed brands: {', '.join(brands) if brands else 'Fender, Gibson, Yamaha, Ibanez, Roland, Boss, Korg, Pearl, Tama, Zildjian'}
Rules:
- "40k" means 40000.
- "used" means conditions: "like_new,excellent,good,fair".
- "new" means conditions: "new".
- Return ONLY valid JSON with keys: name, category, brand, model_keyword, min_price, max_price, conditions, location.
- Set null for fields not mentioned.
"""
        response = llm.invoke([HumanMessage(content=prompt)])
        text_resp = response.content
        if "```json" in text_resp:
            text_resp = text_resp.split("```json")[1].split("```")[0].strip()
        elif "```" in text_resp:
            text_resp = text_resp.split("```")[1].strip()
            
        parsed = json.loads(text_resp)
        result.update(parsed)
    except Exception as e:
        print(f"[SmartAlert] parse_alert_text LLM failed: {e}")
        used_fallback = True
        
    if used_fallback:
        result["name"] = text
        text_l = text.lower()
        
        m = re.search(r'(?:under|below|max)\s*(\d+)(k)?', text_l)
        if m:
            val = int(m.group(1))
            if m.group(2) == 'k':
                val *= 1000
            result["max_price"] = val
            
        if "used" in text_l:
            result["conditions"] = "like_new,excellent,good,fair"
        elif "new" in text_l:
            result["conditions"] = "new"
            
        for c in categories:
            if c.lower() in text_l:
                result["category"] = c
                break
        for b in brands:
            if b.lower() in text_l:
                result["brand"] = b
                break
                
    result["used_fallback"] = used_fallback
    return result
