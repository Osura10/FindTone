import sys
import os
import json
from datetime import datetime
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, ToolMessage
from llm_config import get_chat_llm, message_text
from .tools import search_catalog, get_market_prices, calculate_fair_price, evaluate_and_flag

def create_fair_price_agent():
    tools = [search_catalog, get_market_prices, calculate_fair_price, evaluate_and_flag]
    llm = get_chat_llm(temperature=0.1)
    system_prompt = """You are a Fair Price evaluation agent.
You receive one listing with fields: brand, model, category, condition, year, asking_price, and description.

Steps you MUST follow in order:
1) Read the description and detect extras (e.g. hard_case, gig_bag, stand, pedal, cable) and problems that suggest a worse condition (e.g. cracks, repairs, not working).
2) Call `search_catalog` to get the catalog match and new_price.
3) Call `get_market_prices` with the model_id and category.
4) Call `calculate_fair_price` using the new_price, condition, age_years (current year minus year, 0 if year is missing), sold_prices, is_collectible, extras, and match_type.
5) Call `evaluate_and_flag` using asking_price, fair_price, min_price, max_price, and confidence.
6) Finally write a short, simple-English explanation for the seller (max 3 sentences) that mentions the fair range in LKR and, if needed, a suggested price.

You MUST NEVER invent numbers. ALL numbers must come from the tool results.
"""
    agent = create_agent(llm, tools=tools, system_prompt=system_prompt)
    return agent

# Initialize once
agent = create_fair_price_agent()

def run_fair_price(listing: dict) -> dict:
    current_year = datetime.now().year
    year = listing.get("year")
    age_years = current_year - year if year else 0
    
    result = {
        "fair_price": 0.0,
        "fair_range": {"min": 0.0, "max": 0.0},
        "asking_price": float(listing.get("asking_price", 0)),
        "deviation_percent": 0.0,
        "verdict": "UNKNOWN",
        "confidence": "low",
        "flag_for_trust": False,
        "extras_detected": [],
        "explanation": "",
        "used_fallback": False
    }

    try:
        content_str = (
            f"Brand: {listing.get('brand')}\n"
            f"Model: {listing.get('model')}\n"
            f"Category: {listing.get('category')}\n"
            f"Condition: {listing.get('condition')}\n"
            f"Year: {listing.get('year')}\n"
            f"Asking Price: {listing.get('asking_price')}\n"
            f"Description: {listing.get('description')}\n"
        )
        
        response = agent.invoke({"messages": [HumanMessage(content=content_str)]})
        messages = response.get("messages", [])
        
        calc_result = None
        eval_result = None
        
        for msg in messages:
            if isinstance(msg, ToolMessage):
                if msg.name == "calculate_fair_price":
                    calc_result = json.loads(msg.content)
                elif msg.name == "evaluate_and_flag":
                    eval_result = json.loads(msg.content)

        if calc_result and eval_result:
            result["fair_price"] = calc_result.get("fair_price", 0.0)
            result["fair_range"]["min"] = calc_result.get("min", 0.0)
            result["fair_range"]["max"] = calc_result.get("max", 0.0)
            result["confidence"] = calc_result.get("confidence", "low")
            
            result["verdict"] = eval_result.get("verdict", "UNKNOWN")
            result["deviation_percent"] = eval_result.get("deviation_percent", 0.0)
            result["flag_for_trust"] = eval_result.get("flag_for_trust", False)
            
            result["explanation"] = message_text(messages[-1])
            return result
        else:
            raise Exception("LLM did not call the required tools.")
            
    except Exception as e:
        print(f"Agent failed or fallback triggered: {e}")
        
        try:
            desc = (listing.get("description") or "").lower()
            extras = []
            for ex in ["hard_case", "gig_bag", "stand", "pedal", "cable"]:
                if ex.replace("_", " ") in desc:
                    extras.append(ex)
                    
            cat_match = search_catalog.invoke({
                "brand": listing.get("brand", ""),
                "model": listing.get("model", ""),
                "category": listing.get("category", "")
            })
            
            market = get_market_prices.invoke({
                "model_id": cat_match.get("model_id"),
                "category": listing.get("category", "")
            })
            
            calc = calculate_fair_price.invoke({
                "new_price": cat_match.get("new_price", 0.0),
                "condition": listing.get("condition", "good"),
                "age_years": age_years,
                "sold_prices": market.get("sold_prices", []),
                "is_collectible": cat_match.get("is_collectible", False),
                "extras": extras,
                "match_type": cat_match.get("match_type", "none")
            })
            
            ev = evaluate_and_flag.invoke({
                "asking_price": float(listing.get("asking_price", 0)),
                "fair_price": calc.get("fair_price", 0.0),
                "min_price": calc.get("min", 0.0),
                "max_price": calc.get("max", 0.0),
                "confidence": calc.get("confidence", "low")
            })
            
            fp = calc.get("fair_price", 0.0)
            result["fair_price"] = fp
            result["fair_range"]["min"] = calc.get("min", 0.0)
            result["fair_range"]["max"] = calc.get("max", 0.0)
            result["confidence"] = calc.get("confidence", "low")
            result["verdict"] = ev.get("verdict", "UNKNOWN")
            result["deviation_percent"] = ev.get("deviation_percent", 0.0)
            result["flag_for_trust"] = ev.get("flag_for_trust", False)
            result["extras_detected"] = extras
            result["used_fallback"] = True

            if fp <= 0:
                result["explanation"] = (
                    "We could not find a reference price for this instrument, "
                    "so no price evaluation could be performed."
                )
            else:
                result["explanation"] = (
                    f"Based on market data, a fair price is around {fp:,.0f} LKR. "
                    f"The fair range is between {result['fair_range']['min']:,.0f} "
                    f"and {result['fair_range']['max']:,.0f} LKR."
                )
        except Exception as fallback_e:
            print(f"Fallback also failed: {fallback_e}")
            result["explanation"] = "Could not calculate fair price due to an error."
            
    return result
