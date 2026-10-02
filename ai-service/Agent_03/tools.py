from langchain_core.tools import tool
import sys
import os
from typing import Optional

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db import fetch_one, fetch_all

def _clean(value) -> Optional[str]:
    """Return a trimmed string, or None when the value is missing or blank ("" or spaces)."""
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _norm(value) -> str:
    """Lower-case text with single spaces, used for case-insensitive compares."""
    return " ".join(str(value or "").split()).lower()


def match_listing_to_search(listing: dict, search: dict) -> dict:
    matched = True
    reasons = []
    failed = []

    # category (blank filters are ignored, compare is case-insensitive)
    category = _clean(search.get("Category"))
    if category is not None:
        if _norm(listing.get("category")) == _norm(category):
            reasons.append(f"Category {listing.get('category')}")
        else:
            matched = False
            failed.append("Category mismatch")

    # brand
    brand = _clean(search.get("Brand"))
    if brand is not None:
        if _norm(listing.get("brand")) == _norm(brand):
            reasons.append(f"Brand {listing.get('brand')}")
        else:
            matched = False
            failed.append("Brand mismatch")

    # model keyword
    model_keyword = _clean(search.get("ModelKeyword"))
    if model_keyword is not None:
        mk = _norm(model_keyword)
        title = _norm(listing.get("title"))
        model = _norm(listing.get("model"))
        if mk in title or mk in model:
            reasons.append(f"Keyword '{model_keyword}' found")
        else:
            matched = False
            failed.append("ModelKeyword mismatch")

    # price
    price = listing.get("price")
    min_price = search.get("MinPrice")
    max_price = search.get("MaxPrice")
    
    price_ok = True
    if price is not None:
        p = float(price)
        if min_price is not None:
            if p >= float(min_price):
                pass
            else:
                matched = False
                price_ok = False
                failed.append("Price below MinPrice")
        if max_price is not None:
            if p <= float(max_price):
                pass
            else:
                matched = False
                price_ok = False
                failed.append("Price above MaxPrice")
                
        if price_ok and (min_price is not None or max_price is not None):
            if max_price is not None:
                reasons.append(f"LKR {p:,.0f} is within your budget of LKR {float(max_price):,.0f}")
            else:
                reasons.append(f"LKR {p:,.0f} is above your minimum of LKR {float(min_price):,.0f}")

    # conditions ("" or ",," means no condition filter)
    conditions_str = _clean(search.get("Conditions"))
    conditions = [c.strip().lower() for c in conditions_str.split(",") if c.strip()] if conditions_str else []
    if conditions:
        listing_cond = _norm(listing.get("condition"))
        if listing_cond in conditions:
            reasons.append(f"Condition '{listing.get('condition')}' matches")
        else:
            matched = False
            failed.append("Condition mismatch")

    # location
    location = _clean(search.get("Location"))
    if location is not None:
        loc = _norm(location)
        if loc in _norm(listing.get("location")):
            reasons.append(f"Location '{listing.get('location')}' matches")
        else:
            matched = False
            failed.append("Location mismatch")

    if not matched:
        reasons = []

    return {"matched": matched, "reasons": reasons, "failed": failed}

def calculate_price_drop(old_price: float, new_price: float) -> dict:
    if old_price is None or new_price is None:
        return {"is_drop": False, "drop_amount": 0, "drop_percent": 0.0}
    
    old_p = float(old_price)
    new_p = float(new_price)
    
    if new_p < old_p:
        drop_amount = old_p - new_p
        drop_percent = round((drop_amount / old_p) * 100, 1) if old_p > 0 else 0.0
        return {"is_drop": True, "drop_amount": drop_amount, "drop_percent": drop_percent}
    else:
        return {"is_drop": False, "drop_amount": 0, "drop_percent": 0.0}

@tool
def get_listing_details(listing_id: int) -> dict:
    """
    Get the details of a listing.
    """
    sql = '''
        SELECT l."Title", l."Category", l."Brand", l."Model", l."Condition", l."Price", l."Location", l."Status", l."SellerId",
               u."Name" as "SellerName", l."PriceVerdict", l."FairPriceMin", l."FairPriceMax", l."TrustScore",
               (SELECT "Url" FROM "ListingImages" WHERE "ListingId" = l."Id" ORDER BY "SortOrder" LIMIT 1) as "FirstImageUrl"
        FROM "Listings" l
        LEFT JOIN "Users" u ON l."SellerId" = u."Id"
        WHERE l."Id" = %s
    '''
    row = fetch_one(sql, (listing_id,))
    if row:
        return {
            "title": row["Title"],
            "category": row["Category"],
            "brand": row["Brand"],
            "model": row["Model"],
            "condition": row["Condition"],
            "price": float(row["Price"]) if row["Price"] is not None else 0.0,
            "location": row["Location"],
            "status": row["Status"],
            "seller_id": row["SellerId"],
            "seller_name": row["SellerName"],
            "price_verdict": row["PriceVerdict"],
            "fair_price_min": float(row["FairPriceMin"]) if row["FairPriceMin"] is not None else None,
            "fair_price_max": float(row["FairPriceMax"]) if row["FairPriceMax"] is not None else None,
            "trust_score": row["TrustScore"],
            "first_image_url": row["FirstImageUrl"]
        }
    return {"error": "Listing not found"}

@tool
def find_new_matches(listing_id: int) -> dict:
    """
    Find active saved searches matching this listing.
    """
    listing = get_listing_details.invoke({"listing_id": listing_id})
    if listing.get("error") or listing.get("status") != "LIVE":
        return {"matches": [], "checked_searches": 0}
        
    sql = 'SELECT * FROM "SavedSearches" WHERE "IsActive" = true AND "UserId" != %s'
    searches = fetch_all(sql, (listing["seller_id"],))
    
    matches = []
    for search in searches:
        res = match_listing_to_search(listing, search)
        if res["matched"]:
            matches.append({
                "saved_search_id": search["Id"],
                "user_id": search["UserId"],
                "search_name": search["Name"],
                "reasons": res["reasons"]
            })
            
    return {"matches": matches, "checked_searches": len(searches)}

@tool
def detect_price_drop(listing_id: int, old_price: float) -> dict:
    """
    Check if the new price is a drop from the old price, and return wishlist users if it is.
    """
    listing = get_listing_details.invoke({"listing_id": listing_id})
    if listing.get("error") or listing.get("status") != "LIVE":
        return {"is_drop": False}
        
    res = calculate_price_drop(old_price, listing["price"])
    if not res["is_drop"]:
        return res
        
    sql = 'SELECT "UserId", "PriceWhenSaved" FROM "WishlistItems" WHERE "ListingId" = %s AND "UserId" != %s'
    watchers_rows = fetch_all(sql, (listing_id, listing["seller_id"]))
    
    watchers = [{"user_id": r["UserId"], "price_when_saved": float(r["PriceWhenSaved"])} for r in watchers_rows]
    
    return {
        "is_drop": True,
        "old_price": old_price,
        "new_price": listing["price"],
        "drop_amount": res["drop_amount"],
        "drop_percent": res["drop_percent"],
        "watchers": watchers
    }

@tool
def prepare_notifications(listing_id: int, event: str, matches: list, watchers: list, old_price: float = None) -> dict:
    """
    Prepare notification objects for the given users.
    """
    listing = get_listing_details.invoke({"listing_id": listing_id})
    if listing.get("error"):
        return {"notifications": []}
        
    title = listing.get("title", "")
    price_val = listing.get("price", 0.0)
    loc = listing.get("location", "")
    # The price verdict is private (owner/admin only), so it is never put in messages.

    notifications = []
    notified_users = set()
    
    # PRICE_DROP wins
    if event == "PRICE_DROP" and old_price is not None:
        drop_res = calculate_price_drop(old_price, price_val)
        if drop_res["is_drop"]:
            for w in watchers:
                uid = w["user_id"]
                if uid not in notified_users:
                    notified_users.add(uid)
                    notifications.append({
                        "user_id": uid,
                        "saved_search_id": None,
                        "type": "PRICE_DROP",
                        "title": f"Price Drop: {title}",
                        "message": f"{title} has dropped from LKR {old_price:,.0f} to LKR {price_val:,.0f} ({drop_res['drop_percent']}% drop) in {loc}."
                    })
                    
    # NEW_MATCH
    for m in matches:
        uid = m["user_id"]
        if uid not in notified_users:
            notified_users.add(uid)
            notifications.append({
                "user_id": uid,
                "saved_search_id": m["saved_search_id"],
                "type": "NEW_MATCH",
                "title": f"New Match: {title}",
                "message": f"A new listing matches your alert '{m['search_name']}': {title} for LKR {price_val:,.0f} in {loc}."
            })
            
    return {"notifications": notifications}


def backfill_search_matches(saved_search_id: int, limit: int = 20) -> dict:
    """
    Check the EXISTING LIVE listings against one saved alert (used when an alert is
    created, updated or enabled). Pure rules, no LLM, so it is fast and predictable.
    The user's own listings are never matched. Returns at most `limit` newest matches.
    """
    search = fetch_one('SELECT * FROM "SavedSearches" WHERE "Id" = %s', (saved_search_id,))
    if not search:
        return {"saved_search_id": saved_search_id, "notifications": [], "checked_listings": 0, "error": "Saved search not found"}
    if not search.get("IsActive"):
        return {"saved_search_id": saved_search_id, "notifications": [], "checked_listings": 0}

    rows = fetch_all('''
        SELECT l."Id", l."Title", l."Category", l."Brand", l."Model", l."Condition", l."Price", l."Location"
        FROM "Listings" l
        WHERE l."Status" = 'LIVE' AND l."SellerId" != %s
        ORDER BY l."CreatedAt" DESC
        LIMIT 500
    ''', (search["UserId"],))

    notifications = []
    for r in rows:
        listing = {
            "title": r["Title"], "category": r["Category"], "brand": r["Brand"], "model": r["Model"],
            "condition": r["Condition"], "location": r["Location"],
            "price": float(r["Price"]) if r["Price"] is not None else None,
        }
        res = match_listing_to_search(listing, search)
        if not res["matched"]:
            continue
        price_txt = f"LKR {listing['price']:,.0f}" if listing["price"] is not None else "an unknown price"
        notifications.append({
            "user_id": search["UserId"],
            "saved_search_id": search["Id"],
            "listing_id": r["Id"],
            "type": "NEW_MATCH",
            "title": f"New Match: {r['Title']}",
            "message": f"A listing matches your alert '{search['Name']}': {r['Title']} for {price_txt} in {r['Location']}.",
        })
        if len(notifications) >= limit:
            break

    return {"saved_search_id": saved_search_id, "notifications": notifications, "checked_listings": len(rows)}
