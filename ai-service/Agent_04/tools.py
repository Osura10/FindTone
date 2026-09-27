from langchain_core.tools import tool
from typing import Optional, List, Union
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db import fetch_one, fetch_all

ALLOWED_CONDITIONS = {"new", "like_new", "excellent", "good", "fair", "poor", "for_parts"}

def validate_alert_criteria(
    name: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    model_keyword: Optional[str] = None,
    min_price: Optional[Union[float, int]] = None,
    max_price: Optional[Union[float, int]] = None,
    conditions: Optional[Union[str, List[str]]] = None,
    location: Optional[str] = None,
    allowed_categories: Optional[List[str]] = None,
    allowed_brands: Optional[List[str]] = None
) -> dict:
    """
    Pure validation function for alert/saved-search criteria.
    No DB or LLM dependencies.
    """
    errors: List[str] = []

    # 1. Price validation
    min_p: Optional[float] = None
    max_p: Optional[float] = None

    if min_price is not None:
        try:
            min_p = float(min_price)
            if min_p < 0:
                errors.append("MinPrice must be non-negative.")
        except (ValueError, TypeError):
            errors.append("MinPrice must be a valid number.")

    if max_price is not None:
        try:
            max_p = float(max_price)
            if max_p < 0:
                errors.append("MaxPrice must be non-negative.")
        except (ValueError, TypeError):
            errors.append("MaxPrice must be a valid number.")

    if min_p is not None and max_p is not None and min_p >= 0 and max_p >= 0:
        if max_p < min_p:
            errors.append("MaxPrice must be greater than or equal to MinPrice.")

    # 2. Conditions validation & normalization
    normalized_conditions: Optional[str] = None
    if conditions:
        raw_list: List[str] = []
        if isinstance(conditions, list):
            raw_list = conditions
        elif isinstance(conditions, str):
            raw_list = conditions.split(",")

        clean_conditions: List[str] = []
        for c in raw_list:
            cond_str = str(c).strip().lower()
            if not cond_str:
                continue
            if cond_str not in ALLOWED_CONDITIONS:
                errors.append(f"Invalid condition '{c}'. Allowed: {', '.join(sorted(ALLOWED_CONDITIONS))}.")
            else:
                clean_conditions.append(cond_str)

        if clean_conditions:
            # Deduplicate while preserving order
            seen = set()
            deduped = []
            for c in clean_conditions:
                if c not in seen:
                    seen.add(c)
                    deduped.append(c)
            normalized_conditions = ",".join(deduped)

    # 3. Category validation against catalog (if catalog list provided)
    clean_category: Optional[str] = None
    if category and str(category).strip():
        cat_str = str(category).strip()
        if allowed_categories:
            match = next((ac for ac in allowed_categories if ac.lower() == cat_str.lower()), None)
            if match:
                clean_category = match
            else:
                errors.append(f"Unknown category '{cat_str}'.")
        else:
            clean_category = cat_str

    # 4. Brand validation against catalog (if catalog list provided)
    clean_brand: Optional[str] = None
    if brand and str(brand).strip():
        brand_str = str(brand).strip()
        if allowed_brands:
            match = next((ab for ab in allowed_brands if ab.lower() == brand_str.lower()), None)
            if match:
                clean_brand = match
            else:
                errors.append(f"Unknown brand '{brand_str}'.")
        else:
            clean_brand = brand_str

    # 5. Model Keyword & Location
    clean_model_keyword = str(model_keyword).strip() if model_keyword and str(model_keyword).strip() else None
    clean_location = str(location).strip() if location and str(location).strip() else None

    # 6. Check that at least one search filter is present
    has_filter = bool(
        clean_category or clean_brand or clean_model_keyword or
        min_p is not None or max_p is not None or
        normalized_conditions or clean_location
    )
    if not has_filter:
        errors.append("At least one filter (category, brand, keyword, price, condition, or location) must be set.")

    # 7. Auto-generate name if missing
    clean_name = str(name).strip() if name and str(name).strip() else ""
    if not clean_name:
        parts = []
        if clean_brand:
            parts.append(clean_brand)
        if clean_model_keyword:
            parts.append(clean_model_keyword)
        elif clean_category:
            parts.append(clean_category)
        if clean_location:
            parts.append(f"in {clean_location}")
        if max_p is not None:
            parts.append(f"under LKR {max_p:,.0f}")
        clean_name = " ".join(parts).strip() if parts else "New Alert"

    if errors:
        return {
            "valid": False,
            "errors": errors,
            "alert": None
        }

    return {
        "valid": True,
        "errors": [],
        "alert": {
            "name": clean_name,
            "category": clean_category,
            "brand": clean_brand,
            "model_keyword": clean_model_keyword,
            "min_price": min_p,
            "max_price": max_p,
            "conditions": normalized_conditions,
            "location": clean_location
        }
    }


@tool
def search_listings(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    keyword: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 10
) -> list | dict:
    """
    Search LIVE listings in the marketplace matching the given filters.
    All filters are optional.
    
    Args:
        category: Musical instrument category (e.g. 'Electric Guitars', 'Keyboards')
        brand: Brand name (e.g. 'Fender', 'Yamaha')
        keyword: Search query matching title, model, or description
        min_price: Minimum price in LKR
        max_price: Maximum price in LKR
        condition: Condition (e.g. 'new', 'like_new', 'excellent', 'good', 'fair')
        location: City or area (e.g. 'Colombo', 'Kandy')
        limit: Maximum listings to return (default 10)
    """
    clauses = ['l."Status" = \'LIVE\'']
    params: list = []

    if category and category.strip():
        cat_clean = category.strip().rstrip("s").lower()
        clauses.append('(LOWER(l."Category") LIKE %s OR LOWER(l."Category") = LOWER(%s))')
        params.extend([f"%{cat_clean}%", category.strip()])

    if brand and brand.strip():
        clauses.append('LOWER(l."Brand") LIKE %s')
        params.append(f"%{brand.strip().lower()}%")

    if keyword and keyword.strip():
        kw = f"%{keyword.strip().lower()}%"
        clauses.append('(LOWER(l."Title") LIKE %s OR LOWER(l."Model") LIKE %s OR LOWER(l."Description") LIKE %s)')
        params.extend([kw, kw, kw])

    if min_price is not None:
        try:
            clauses.append('l."Price" >= %s')
            params.append(float(min_price))
        except (ValueError, TypeError):
            pass

    if max_price is not None:
        try:
            clauses.append('l."Price" <= %s')
            params.append(float(max_price))
        except (ValueError, TypeError):
            pass

    if condition and condition.strip():
        cond_list = [c.strip().lower() for c in condition.split(",") if c.strip()]
        if cond_list:
            clauses.append('LOWER(l."Condition") = ANY(%s)')
            params.append(cond_list)

    if location and location.strip():
        loc = f"%{location.strip().lower()}%"
        clauses.append('LOWER(l."Location") LIKE %s')
        params.append(loc)

    params.append(limit)

    sql = f"""
        SELECT 
            l."Id", l."Title", l."Brand", l."Model", l."Category", l."Condition",
            l."Year", l."Price", l."Location", l."Status", l."TrustScore",
            l."FairPrice", l."FairPriceMin", l."FairPriceMax", l."PriceVerdict",
            l."PriceExplanation", l."CreatedAt",
            (
                SELECT img."Url" 
                FROM "ListingImages" img 
                WHERE img."ListingId" = l."Id" 
                ORDER BY img."SortOrder" ASC 
                LIMIT 1
            ) AS "ImageUrl"
        FROM "Listings" l
        WHERE {" AND ".join(clauses)}
        ORDER BY l."CreatedAt" DESC
        LIMIT %s
    """
    try:
        rows = fetch_all(sql, tuple(params))
        results = []
        for r in rows:
            results.append({
                "id": r["Id"],
                "title": r["Title"],
                "brand": r["Brand"],
                "model": r["Model"],
                "category": r["Category"],
                "condition": r["Condition"],
                "year": r["Year"],
                "price": float(r["Price"]) if r["Price"] is not None else 0.0,
                "location": r["Location"],
                "status": r["Status"],
                "trust_score": r["TrustScore"],
                "fair_price": float(r["FairPrice"]) if r["FairPrice"] is not None else None,
                "fair_price_min": float(r["FairPriceMin"]) if r["FairPriceMin"] is not None else None,
                "fair_price_max": float(r["FairPriceMax"]) if r["FairPriceMax"] is not None else None,
                "price_verdict": r["PriceVerdict"],
                "price_explanation": r["PriceExplanation"],
                "image_url": r["ImageUrl"]
            })
        return results
    except Exception as e:
        print(f"[Agent 04] search_listings error: {e}")
        return {"error": "Listing search is temporarily unavailable."}


@tool
def compare_items(listing_ids: List[int]) -> dict:
    """
    Compare 2 to 4 listings side by side on price, condition, trust score, and fair price range.
    
    Args:
        listing_ids: List of 2 to 4 listing IDs to compare.
    """
    clean_ids = list(dict.fromkeys(int(i) for i in listing_ids))
    if not 2 <= len(clean_ids) <= 4 or len(clean_ids) != len(listing_ids):
        return {"error": "Please provide 2 to 4 different listing IDs to compare."}

    sql = """
        SELECT 
            l."Id", l."Title", l."Brand", l."Model", l."Category", l."Condition",
            l."Year", l."Price", l."Location", l."Status", l."TrustScore",
            l."FairPrice", l."FairPriceMin", l."FairPriceMax", l."PriceVerdict",
            l."PriceConfidence", l."PriceExplanation",
            (
                SELECT img."Url" 
                FROM "ListingImages" img 
                WHERE img."ListingId" = l."Id" 
                ORDER BY img."SortOrder" ASC 
                LIMIT 1
            ) AS "ImageUrl"
        FROM "Listings" l
        WHERE l."Id" = ANY(%s) AND l."Status" = 'LIVE'
    """
    try:
        rows = fetch_all(sql, (clean_ids,))
        if len(rows) != len(clean_ids):
            return {"error": "One or more listings are unavailable or not found."}

        items = []
        for r in rows:
            items.append({
                "id": r["Id"],
                "title": r["Title"],
                "brand": r["Brand"],
                "model": r["Model"],
                "category": r["Category"],
                "condition": r["Condition"],
                "year": r["Year"],
                "price": float(r["Price"]) if r["Price"] is not None else 0.0,
                "location": r["Location"],
                "trust_score": r["TrustScore"],
                "fair_price": float(r["FairPrice"]) if r["FairPrice"] is not None else None,
                "fair_range": {
                    "min": float(r["FairPriceMin"]) if r["FairPriceMin"] is not None else None,
                    "max": float(r["FairPriceMax"]) if r["FairPriceMax"] is not None else None
                },
                "price_verdict": r["PriceVerdict"],
                "price_explanation": r["PriceExplanation"],
                "image_url": r["ImageUrl"]
            })

        # Calculate comparison summary metrics
        prices = [item["price"] for item in items if item["price"] > 0]
        cheapest_item = min((item for item in items if item["price"] > 0), key=lambda x: x["price"], default=None)
        highest_trust = max(items, key=lambda x: x["trust_score"] or 0) if items else None

        price_diff = (max(prices) - min(prices)) if len(prices) > 1 else 0.0

        return {
            "items": items,
            "cheapest_id": cheapest_item["id"] if cheapest_item else None,
            "highest_trust_id": highest_trust["id"] if highest_trust else None,
            "price_difference": price_diff
        }
    except Exception as e:
        print(f"[Agent 04] compare_items error: {e}")
        return {"error": f"Failed to compare listings: {str(e)}"}


@tool
def get_price_insight(listing_id: int) -> dict:
    """
    Retrieve precomputed price fairness insight (FairPrice, FairPriceMin/Max, Verdict, Explanation)
    for a listing directly from the database without recalculating.
    
    Args:
        listing_id: The ID of the listing to evaluate.
    """
    sql = """
        SELECT 
            "Id", "Title", "Brand", "Model", "Category", "Condition", "Price",
            "FairPrice", "FairPriceMin", "FairPriceMax", "PriceVerdict",
            "PriceDeviationPercent", "PriceConfidence", "PriceExplanation"
        FROM "Listings"
        WHERE "Id" = %s AND "Status" = 'LIVE'
    """
    try:
        row = fetch_one(sql, (listing_id,))
        if not row:
            return {"error": f"Listing with ID {listing_id} not found."}

        price = float(row["Price"]) if row["Price"] is not None else 0.0
        fair_price = float(row["FairPrice"]) if row["FairPrice"] is not None else None
        fair_min = float(row["FairPriceMin"]) if row["FairPriceMin"] is not None else None
        fair_max = float(row["FairPriceMax"]) if row["FairPriceMax"] is not None else None

        return {
            "listing_id": row["Id"],
            "title": row["Title"],
            "brand": row["Brand"],
            "model": row["Model"],
            "category": row["Category"],
            "condition": row["Condition"],
            "asking_price": price,
            "fair_price": fair_price,
            "fair_range": {"min": fair_min, "max": fair_max},
            "price_verdict": row["PriceVerdict"] or "UNKNOWN",
            "deviation_percent": float(row["PriceDeviationPercent"]) if row["PriceDeviationPercent"] is not None else None,
            "confidence": row["PriceConfidence"] or "low",
            "explanation": row["PriceExplanation"] or "No price evaluation available for this listing."
        }
    except Exception as e:
        print(f"[Agent 04] get_price_insight error: {e}")
        return {"error": f"Failed to get price insight: {str(e)}"}


@tool
def create_alert_criteria(
    name: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    model_keyword: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    conditions: Optional[str] = None,
    location: Optional[str] = None
) -> dict:
    """
    Validate and package a buyer's 'notify me' / alert request into clean SavedSearch criteria.
    Does NOT write to the database. The client or backend can persist it.
    
    Args:
        name: Name for the alert (auto-generated if omitted).
        category: Musical instrument category to watch.
        brand: Brand to watch.
        model_keyword: Keyword or model to match.
        min_price: Minimum budget filter in LKR.
        max_price: Maximum budget filter in LKR.
        conditions: Comma-separated conditions (new, like_new, excellent, good, fair, poor, for_parts).
        location: Target city or area in Sri Lanka.
    """
    # Fetch distinct categories and brands from CatalogModels to validate
    allowed_categories: List[str] = []
    allowed_brands: List[str] = []
    try:
        cat_rows = fetch_all('SELECT DISTINCT "Category" FROM "CatalogModels"')
        allowed_categories = [r["Category"] for r in cat_rows if r.get("Category")]
        brand_rows = fetch_all('SELECT DISTINCT "Brand" FROM "CatalogModels"')
        allowed_brands = [r["Brand"] for r in brand_rows if r.get("Brand")]
    except Exception as e:
        print(f"[Agent 04] Catalog lookup for alert validation degraded gracefully: {e}")

    result = validate_alert_criteria(
        name=name,
        category=category,
        brand=brand,
        model_keyword=model_keyword,
        min_price=min_price,
        max_price=max_price,
        conditions=conditions,
        location=location,
        allowed_categories=allowed_categories if allowed_categories else None,
        allowed_brands=allowed_brands if allowed_brands else None
    )
    return result
