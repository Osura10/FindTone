import sys
import os
import json
import re
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from llm_config import get_chat_llm, message_text
from .tools import get_listing_details, find_new_matches, detect_price_drop, prepare_notifications, backfill_search_matches

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

def _strip_code_fence(text: str) -> str:
    """Remove ```json fences that LLMs like to add around JSON."""
    if "```json" in text:
        return text.split("```json")[1].split("```")[0].strip()
    if "```" in text:
        return text.split("```")[1].strip()
    return text


def _keeps_numbers(template: str, candidate: str) -> bool:
    """True when every price/percent number from the template is still in the rewritten text."""
    numbers = [n for n in re.findall(r"\d[\d,.]*\d|\d", template) if len(n.replace(",", "")) >= 3]
    return all(n in candidate for n in numbers)


def _merge_rewritten_messages(base: list, rewritten: list) -> list:
    """
    The rule-based list decides WHO gets WHAT (user_id, type, title, saved_search_id).
    The LLM may only improve the message text, and only if it keeps all the numbers.
    """
    by_key = {}
    for n in rewritten or []:
        try:
            by_key[(int(n.get("user_id")), n.get("type"))] = n
        except (TypeError, ValueError):
            continue
    merged = []
    for b in base:
        msg = b["message"]
        cand = by_key.get((b["user_id"], b["type"]), {}).get("message")
        if isinstance(cand, str) and cand.strip() and _keeps_numbers(b["message"], cand):
            msg = cand.strip()
        merged.append({**b, "message": msg})
    return merged


def _rule_based_notifications(listing_id: int, event: str, old_price: float = None) -> list:
    """Deterministic pipeline: find matches or watchers, then build notification templates."""
    m_res = find_new_matches.invoke({"listing_id": listing_id}) if event == "NEW_LISTING" else {}
    p_res = detect_price_drop.invoke({"listing_id": listing_id, "old_price": old_price}) if event == "PRICE_DROP" else {}
    notif_res = prepare_notifications.invoke({
        "listing_id": listing_id,
        "event": event,
        "matches": m_res.get("matches", []),
        "watchers": p_res.get("watchers", []),
        "old_price": old_price
    })
    return notif_res.get("notifications", [])


def run_smart_alert(listing_id: int, event: str, old_price: float = None) -> dict:
    result = {
        "listing_id": listing_id,
        "event": event,
        "notifications": [],
        "matched_search_ids": [],
        "used_fallback": False
    }

    # 1. Rule-based list first (no LLM). If nobody should be notified we stop here.
    try:
        base = _rule_based_notifications(listing_id, event, old_price)
    except Exception as e:
        print(f"[SmartAlert] Rule-based pipeline failed: {e}")
        result["used_fallback"] = True
        return result
    if not base:
        print("[SmartAlert] No matches or watchers, skipping LLM.")
        return result

    # 2. Agent run: it calls the tools and rewrites the messages in friendly English.
    try:
        msg = f"Listing ID: {listing_id}\nEvent: {event}\nOld Price: {old_price}"
        response = alert_agent.invoke({"messages": [HumanMessage(content=msg)]})
        messages = response.get("messages", [])
        data = json.loads(_strip_code_fence(message_text(messages[-1])))
        result["notifications"] = _merge_rewritten_messages(base, data.get("notifications", []))
        print(f"[SmartAlert] used_fallback=False, notifications={len(result['notifications'])}")
    except Exception as e:
        print(f"[SmartAlert] Agent failed, using fallback: {e}")
        result["used_fallback"] = True
        notifications = base
        try:
            llm = get_chat_llm(temperature=0.1)
            prompt = f"""Rewrite ONLY the "message" field of each notification into a friendly message of max 2 sentences (simple English, one emoji at the start allowed). Keep every number, price, and name exactly as in the template. Return JSON with a "notifications" array where each object has "id" (the index) and "message".
Notifications: {json.dumps([{'id': i, 'message': n['message']} for i, n in enumerate(base)])}
Do not invent facts."""
            resp = llm.invoke([HumanMessage(content=prompt)])
            rewritten = json.loads(_strip_code_fence(message_text(resp))).get("notifications", [])
            as_keyed = []
            for r in rewritten:
                idx = r.get("id")
                if isinstance(idx, int) and 0 <= idx < len(base):
                    as_keyed.append({"user_id": base[idx]["user_id"], "type": base[idx]["type"], "message": r.get("message")})
            notifications = _merge_rewritten_messages(base, as_keyed)
        except Exception as llm_e:
            print(f"[SmartAlert] LLM failed to rewrite notifications, using templates: {llm_e}")
        result["notifications"] = notifications
        print(f"[SmartAlert] Fallback prepared {len(notifications)} notifications.")

    result["matched_search_ids"] = [n["saved_search_id"] for n in result["notifications"] if n.get("saved_search_id")]
    return result


def run_alert_backfill(saved_search_id: int) -> dict:
    """Match one saved alert against the existing LIVE listings (rules only, no LLM)."""
    try:
        return backfill_search_matches(saved_search_id)
    except Exception as e:
        print(f"[SmartAlert] Backfill failed for search {saved_search_id}: {e}")
        return {"saved_search_id": saved_search_id, "notifications": [], "checked_listings": 0, "error": str(e)}


ALLOWED_CONDITIONS = ["new", "like_new", "excellent", "good", "fair", "poor", "for_parts"]
USED_CONDITIONS = ["like_new", "excellent", "good", "fair"]

_MAX_WORDS = r"(?:under|below|max(?:imum)?|less than|up ?to|upto|within|<)"
_MIN_WORDS = r"(?:over|above|min(?:imum)?|more than|at least|from|>)"
_AMOUNT = r"\s*(?:lkr|rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|lakhs)?\b"


def _to_amount(number: str, unit) -> float:
    val = float(number.replace(",", ""))
    if unit == "k":
        val *= 1000
    elif unit in ("lakh", "lakhs"):
        val *= 100000
    return val


def _apply_price_rules(text: str, result: dict) -> None:
    """
    'under 40k' is always a MAX price and 'over 40k' a MIN price, whatever the LLM said.
    A price the LLM returns that is not written in the text at all is dropped (hallucination).
    """
    t = text.lower()
    written = {_to_amount(n, u) for n, u in re.findall(_AMOUNT, t)}
    for key in ("min_price", "max_price"):
        if result.get(key) is not None and float(result[key]) not in written:
            print(f"[SmartAlert] dropped {key}={result[key]} (not in the text)")
            result[key] = None

    between = re.search(r"between" + _AMOUNT + r"\s*(?:and|to|-)" + _AMOUNT, t)
    if between:
        result["min_price"] = _to_amount(between.group(1), between.group(2))
        result["max_price"] = _to_amount(between.group(3), between.group(4))
        return

    max_m = re.search(_MAX_WORDS + _AMOUNT, t)
    min_m = re.search(_MIN_WORDS + _AMOUNT, t)
    if max_m:
        val = _to_amount(max_m.group(1), max_m.group(2))
        result["max_price"] = val
        if result.get("min_price") == val and not min_m:
            result["min_price"] = None
    if min_m:
        val = _to_amount(min_m.group(1), min_m.group(2))
        result["min_price"] = val
        if result.get("max_price") == val and not max_m:
            result["max_price"] = None


def _clean_conditions(value):
    """Map LLM words ("used", "brand new", "Like New") to the allowed condition codes."""
    if not value:
        return None
    out = []
    for part in str(value).lower().replace(";", ",").split(","):
        code = "_".join(part.replace("-", " ").split())
        if code == "used":
            out.extend(USED_CONDITIONS)
        elif code in ("brand_new", "new"):
            out.append("new")
        elif code in ALLOWED_CONDITIONS:
            out.append(code)
    out = list(dict.fromkeys(out))
    return ",".join(out) if out else None


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
    except Exception as e:
        print(f"[SmartAlert] Could not load catalog categories/brands: {e}")
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
        parsed = json.loads(_strip_code_fence(message_text(response)))
        if isinstance(parsed, dict):
            for k in ["name", "category", "brand", "model_keyword", "conditions", "location"]:
                val = parsed.get(k) or parsed.get(k.replace('_', '').title()) or parsed.get(k.replace('_', '').lower())
                # LLMs sometimes write the word "null"/"none" instead of JSON null.
                if val is not None and str(val).strip().lower() not in ("", "null", "none", "n/a"):
                    result[k] = str(val).strip()
            for k in ["min_price", "max_price"]:
                val = parsed.get(k) or parsed.get(k.replace('_', '').title()) or parsed.get(k.replace('_', '').lower())
                if val is not None:
                    try:
                        result[k] = float(str(val).replace(',', ''))
                    except ValueError:
                        print(f"[SmartAlert] parse_alert_text ignored non-numeric {k}: {val!r}")
    except Exception as e:
        print(f"[SmartAlert] parse_alert_text LLM failed: {e}")
        used_fallback = True

    if used_fallback:
        result["name"] = text
        text_l = text.lower()

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

    # Rules always win over the LLM for price direction and condition names.
    _apply_price_rules(text, result)
    result["conditions"] = _clean_conditions(result.get("conditions"))
    result["used_fallback"] = used_fallback
    return result
