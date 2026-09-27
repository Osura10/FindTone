import sys
import os
import json
import re
import uuid
from typing import Optional, List
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, ToolMessage
from llm_config import get_chat_llm
from .tools import search_listings, compare_items, get_price_insight, create_alert_criteria

# Shared in-memory checkpointer across sessions
checkpointer = MemorySaver()

def create_shopping_assistant():
    tools = [search_listings, compare_items, get_price_insight, create_alert_criteria]
    llm = get_chat_llm(temperature=0.1)
    
    system_prompt = """You are the FindTone Shopping Assistant for musical instrument buyers on the FindTone platform.
You MUST follow these rules strictly:
1. Whenever the user is looking for, searching for, or asking about musical instruments or gear, you MUST call `search_listings` with the extracted parameters. NEVER answer with made-up items or prices.
2. Whenever the user asks to compare 2 to 4 listings, you MUST call `compare_items` with their listing IDs.
3. Whenever the user asks if a price is fair, good value, or asks about valuation for a listing, you MUST call `get_price_insight`.
4. Whenever the user wants to set up an alert, notify them, or save search criteria, you MUST call `create_alert_criteria`.
5. NEVER invent numbers, listings, or prices. ALL numbers and listing data MUST come strictly from tool results.
6. Provide short, helpful, plain-English replies (2 to 3 sentences max).
7. If the user only says a greeting (like 'hi' or 'hello'), warmly welcome them and ask what music gear they are looking for without calling any tools.
"""
    return create_agent(llm, tools=tools, system_prompt=system_prompt, checkpointer=checkpointer)

# Initialize once
assistant_agent = create_shopping_assistant()

def is_greeting(text: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', text.strip().lower())
    return clean in {"hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings"}

def run_shopping_assistant(
    message: str,
    session_id: Optional[str] = None,
    user_id: Optional[int] = None
) -> dict:
    session_id = session_id.strip() if session_id and session_id.strip() else str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}

    result = {
        "reply": "",
        "listings": [],
        "comparison": None,
        "price_insight": None,
        "alert_to_create": None,
        "session_id": session_id,
        "used_fallback": False
    }

    try:
        # Check pure greeting first
        if is_greeting(message):
            result["reply"] = "Hello! I'm your FindTone Shopping Assistant. What musical instrument or gear are you looking for today?"
            return result

        response = assistant_agent.invoke(
            {"messages": [HumanMessage(content=message)]},
            config=config
        )
        messages = response.get("messages", [])
        last_user = max((i for i, msg in enumerate(messages) if isinstance(msg, HumanMessage)), default=-1)
        tool_results = {}
        for msg in messages[last_user + 1:]:
            if isinstance(msg, ToolMessage):
                content = msg.content
                if isinstance(content, str):
                    try:
                        content = json.loads(content)
                    except json.JSONDecodeError:
                        pass
                tool_results[msg.name] = content

        if "search_listings" in tool_results:
            listings = tool_results["search_listings"]
            if isinstance(listings, dict) and listings.get("error"):
                result["reply"] = "Listing search is temporarily unavailable. Please try again."
            elif isinstance(listings, list):
                result["listings"] = listings
                result["reply"] = f"Found {len(listings)} live listing(s). See the results below." if listings else "I couldn't find any live listings matching those criteria."
            else:
                raise ValueError("Invalid listing search result.")
        elif "compare_items" in tool_results:
            result["comparison"] = tool_results["compare_items"]
            comparison = result["comparison"]
            result["reply"] = comparison.get("error", f"Here is the comparison of {len(comparison.get('items', []))} live listings.")
        elif "get_price_insight" in tool_results:
            result["price_insight"] = tool_results["get_price_insight"]
            insight = result["price_insight"]
            result["reply"] = insight.get("error", f"Price insight for {insight.get('title', 'this listing')}: {insight.get('price_verdict', 'UNKNOWN')}.")
        elif "create_alert_criteria" in tool_results:
            alert_result = tool_results["create_alert_criteria"]
            if alert_result.get("valid") and alert_result.get("alert"):
                result["alert_to_create"] = alert_result["alert"]
                result["reply"] = "Alert criteria are ready. Confirm below to create the alert."
            else:
                result["reply"] = "Could not prepare the alert: " + ", ".join(alert_result.get("errors", ["Invalid criteria"]))
        else:
            raise ValueError("LLM did not return a supported tool result.")

        print(f"[Agent 04] Shopping Assistant responded for session {session_id}")
        return result

    except Exception as e:
        print(f"[Agent 04] Shopping Assistant tool-calling fallback triggered: {e}")
        print("[Agent 04] Running deterministic pipeline fallback")
        result["used_fallback"] = True

        try:
            msg_lower = message.lower()

            # Deterministic parameter extraction
            # 1. Price extraction
            max_price = None
            min_price = None
            m_max = re.search(r'(?:under|below|max|budget|up to)\s*(?:lkr|rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)(\s*k)?', msg_lower)
            if m_max:
                val = float(m_max.group(1).replace(",", ""))
                if m_max.group(2): val *= 1000
                max_price = val

            m_min = re.search(r'(?:above|over|min|at least)\s*(?:lkr|rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)(\s*k)?', msg_lower)
            if m_min:
                val = float(m_min.group(1).replace(",", ""))
                if m_min.group(2): val *= 1000
                min_price = val

            # 2. Location extraction
            common_locations = ["colombo", "kandy", "gampaha", "malabe", "galle", "jaffna", "kurunegala", "negombo", "matara"]
            matched_loc = next((loc for loc in common_locations if loc in msg_lower), None)

            # 3. Category extraction
            common_categories = [
                ("acoustic guitar", "Acoustic Guitar"),
                ("electric guitar", "Electric Guitar"),
                ("bass guitar", "Bass Guitar"),
                ("guitar", "Guitar"),
                ("keyboard", "Keyboard"),
                ("piano", "Piano"),
                ("drum", "Drums"),
                ("amplifier", "Amplifier"),
                ("amp", "Amplifier"),
                ("pedal", "Effect Pedal"),
                ("accessory", "Accessory")
            ]
            matched_cat_phrase, matched_cat = next(((word, category) for word, category in common_categories if word in msg_lower), (None, None))

            # 4. Brand extraction
            common_brands = ["yamaha", "fender", "gibson", "ibanez", "roland", "korg", "boss", "casio", "taylor", "martin", "epiphone"]
            matched_brand = next((b for b in common_brands if b in msg_lower), None)
            matched_conditions = [c for c in ["new", "like_new", "excellent", "good", "fair", "poor", "for_parts"] if c.replace("_", " ") in msg_lower]
            keyword = msg_lower
            for price_match in (m_max, m_min):
                if price_match:
                    keyword = keyword.replace(price_match.group(0), " ")
            for phrase in ["find", "search", "show", "me", "looking", "for", "under", "below", "max", "budget", "up to", "above", "over", "min", "at least", "in", "lkr", "rs.", matched_cat_phrase, matched_brand, matched_loc, *[c.replace("_", " ") for c in matched_conditions]]:
                if phrase:
                    keyword = re.sub(rf"\b{re.escape(phrase)}s?\b", " ", keyword)
            matched_keyword = re.sub(r"\s+", " ", keyword).strip() or None

            # Branch 1: Alert / Notify intent
            if any(w in msg_lower for w in ["alert", "notify", "watch", "saved search"]):
                alert_res = create_alert_criteria.invoke({
                    "name": message.strip()[:50],
                    "category": matched_cat,
                    "brand": matched_brand,
                    "model_keyword": matched_keyword,
                    "min_price": min_price,
                    "max_price": max_price,
                    "conditions": ",".join(matched_conditions) or None,
                    "location": matched_loc
                })
                if alert_res.get("valid") and alert_res.get("alert"):
                    result["alert_to_create"] = alert_res["alert"]
                    result["reply"] = f"I've prepared an alert for '{alert_res['alert']['name']}'. Click 'Create this alert' below to confirm."
                else:
                    err_msg = ", ".join(alert_res.get("errors", ["Invalid alert criteria"]))
                    result["reply"] = f"Could not create alert: {err_msg}."

            # Branch 2: Compare intent
            elif any(w in msg_lower for w in ["compare", "vs", "versus"]):
                ids = [int(i) for i in re.findall(r'\b(?:listing|item)\s*#?\s*(\d+)\b', msg_lower)]
                if len(ids) < 2:
                    compare_text = re.split(r'\b(?:under|below|budget|up to|above|over|at least)\b', msg_lower)[0]
                    ids = [int(i) for i in re.findall(r'\b\d+\b', compare_text)]
                if len(ids) >= 2:
                    cmp_res = compare_items.invoke({"listing_ids": ids[:4]})
                    result["comparison"] = cmp_res
                    result["reply"] = cmp_res.get("error", f"Here is the comparison of {len(cmp_res.get('items', []))} live listings.")
                else:
                    result["reply"] = "To compare items, please provide at least two listing IDs."

            # Branch 3: Price insight intent
            elif any(w in msg_lower for w in ["fair", "worth", "price insight", "verdict", "valuation", "good deal"]):
                ids = [int(i) for i in re.findall(r'\b(?:listing|item)\s*#?\s*(\d+)\b', msg_lower)]
                if ids:
                    pi_res = get_price_insight.invoke({"listing_id": ids[0]})
                    result["price_insight"] = pi_res
                    verdict = pi_res.get("price_verdict", "UNKNOWN")
                    result["reply"] = f"Listing #{ids[0]} has a price verdict of {verdict}. {pi_res.get('explanation', '')}"
                else:
                    result["reply"] = "Please provide the listing ID you would like me to check the fair price for."

            # Branch 4: Search intent (default)
            else:
                # Clean keyword: remove stop words
                search_res = search_listings.invoke({
                    "category": matched_cat,
                    "brand": matched_brand,
                    "keyword": matched_keyword,
                    "min_price": min_price,
                    "max_price": max_price,
                    "condition": ",".join(matched_conditions) or None,
                    "location": matched_loc,
                    "limit": 6
                })
                if isinstance(search_res, dict) and search_res.get("error"):
                    result["reply"] = "Listing search is temporarily unavailable. Please try again."
                elif search_res:
                    result["listings"] = search_res
                    result["reply"] = f"Found {len(search_res)} live listing(s). See the results below."
                else:
                    result["reply"] = "I couldn't find any live listings matching those criteria right now. Would you like me to set up an alert for this search?"

        except Exception as fb_err:
            print(f"[Agent 04] Fallback execution error: {fb_err}")
            result["reply"] = "I encountered an error processing your request. Please try again."

        return result
