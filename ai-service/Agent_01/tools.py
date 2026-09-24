from langchain_core.tools import tool
from typing import Optional, List
import statistics
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db import fetch_one, fetch_all

@tool
def search_catalog(brand: str, model: str, category: str) -> dict:
    """
    Search the music gear catalog for a specific brand and model to find its original price, tier, and collectibility.
    If an exact match is not found, it tries to match just the model name.
    If no match is found, it provides a fallback average price based on the category.
    """
    sql_exact = """
        SELECT "Id", "Brand", "Model", "Category", "Tier", "NewPriceLkr", "IsCollectible"
        FROM "CatalogModels"
        WHERE LOWER("Brand") = LOWER(%s) AND LOWER("Model") = LOWER(%s)
    """
    row = fetch_one(sql_exact, (brand, model))
    if row:
        return {
            "model_id": row["Id"],
            "brand": row["Brand"],
            "model": row["Model"],
            "category": row["Category"],
            "tier": row["Tier"],
            "new_price": float(row["NewPriceLkr"]),
            "is_collectible": row["IsCollectible"],
            "match_type": "exact"
        }
    
    sql_partial = """
        SELECT "Id", "Brand", "Model", "Category", "Tier", "NewPriceLkr", "IsCollectible"
        FROM "CatalogModels"
        WHERE LOWER("Model") LIKE %s
        LIMIT 1
    """
    row_partial = fetch_one(sql_partial, (f"%{model.lower()}%",))
    if row_partial:
        return {
            "model_id": row_partial["Id"],
            "brand": row_partial["Brand"],
            "model": row_partial["Model"],
            "category": row_partial["Category"],
            "tier": row_partial["Tier"],
            "new_price": float(row_partial["NewPriceLkr"]),
            "is_collectible": row_partial["IsCollectible"],
            "match_type": "partial"
        }
    
    sql_fallback = """
        SELECT AVG("NewPriceLkr") as avg_price
        FROM "CatalogModels"
        WHERE LOWER("Category") = LOWER(%s) AND "Tier" = 'budget'
    """
    row_fallback = fetch_one(sql_fallback, (category,))
    if row_fallback and row_fallback["avg_price"]:
        return {
            "model_id": None,
            "new_price": float(row_fallback["avg_price"]),
            "tier": "budget",
            "is_collectible": False,
            "match_type": "fallback"
        }
    
    sql_fallback_all = """
        SELECT AVG("NewPriceLkr") as avg_price
        FROM "CatalogModels"
        WHERE LOWER("Category") = LOWER(%s)
    """
    row_fallback_all = fetch_one(sql_fallback_all, (category,))
    if row_fallback_all and row_fallback_all["avg_price"]:
        return {
            "model_id": None,
            "new_price": float(row_fallback_all["avg_price"]),
            "tier": "unknown",
            "is_collectible": False,
            "match_type": "fallback"
        }
        
    return {"match_type": "none"}

@tool
def get_market_prices(model_id: Optional[int], category: str, days: int = 90) -> dict:
    """
    Fetch market prices for sold and active listings of the same model (or category if model is unknown).
    
    Args:
        model_id: The ID of the catalog model (from search_catalog). Can be None.
        category: The category of the instrument.
        days: Number of days to look back for sold listings.
    """
    if model_id is not None:
        catalog_row = fetch_one('SELECT "Brand", "Model" FROM "CatalogModels" WHERE "Id" = %s', (model_id,))
        if not catalog_row:
            return {"sold_prices": [], "active_prices": [], "sold_count": 0}
            
        brand = catalog_row["Brand"]
        model = catalog_row["Model"]
        
        sql_sold = """
            SELECT "SoldPrice"
            FROM "Listings"
            WHERE "Status" = 'SOLD' 
              AND "Brand" = %s 
              AND "Model" = %s
              AND "SoldAt" >= CURRENT_DATE - CAST(%s AS INTEGER) * INTERVAL '1 day'
        """
        sold_rows = fetch_all(sql_sold, (brand, model, days))
        
        sql_active = """
            SELECT "Price"
            FROM "Listings"
            WHERE "Status" = 'LIVE'
              AND "Brand" = %s 
              AND "Model" = %s
        """
        active_rows = fetch_all(sql_active, (brand, model))
    else:
        sql_sold = """
            SELECT "SoldPrice"
            FROM "Listings"
            WHERE "Status" = 'SOLD' 
              AND LOWER("Category") = LOWER(%s)
              AND "SoldAt" >= CURRENT_DATE - CAST(%s AS INTEGER) * INTERVAL '1 day'
        """
        sold_rows = fetch_all(sql_sold, (category, days))
        
        sql_active = """
            SELECT "Price"
            FROM "Listings"
            WHERE "Status" = 'LIVE'
              AND LOWER("Category") = LOWER(%s)
        """
        active_rows = fetch_all(sql_active, (category,))
        
    sold_prices = [float(r["SoldPrice"]) for r in sold_rows if r["SoldPrice"] is not None]
    active_prices = [float(r["Price"]) for r in active_rows if r["Price"] is not None]
    
    return {
        "sold_prices": sold_prices,
        "active_prices": active_prices,
        "sold_count": len(sold_prices)
    }

@tool
def calculate_fair_price(new_price: float, condition: str, age_years: int,
                         sold_prices: List[float], is_collectible: bool,
                         extras: List[str], match_type: str) -> dict:
    """
    Calculate a fair market price based on depreciation, condition, and market data.
    Pure math, does not use LLM.
    """
    breakdown = []

    if new_price is None or new_price <= 0:
        return {
            "fair_price": 0,
            "min": 0,
            "max": 0,
            "confidence": "low",
            "breakdown": ["No reference price was found for this instrument."]
        }

    price = new_price
    breakdown.append(f"Base new price: {new_price}")
    
    multipliers = {
        "new": 1.0,
        "like_new": 0.85,
        "excellent": 0.75,
        "good": 0.65,
        "fair": 0.5,
        "poor": 0.35,
        "for_parts": 0.15
    }
    
    cond_mult = multipliers.get(condition.lower(), 0.65)
    price *= cond_mult
    breakdown.append(f"Applied condition multiplier '{condition}': x{cond_mult} -> {price}")
    
    if not is_collectible:
        age_depreciation = min(0.05 * age_years, 0.30)
        age_mult = 1 - age_depreciation
        price *= age_mult
        breakdown.append(f"Applied age depreciation ({age_years} years): x{age_mult} -> {price}")
    else:
        breakdown.append("Item is collectible, skipping age depreciation.")
        
    if len(sold_prices) >= 3:
        med = statistics.median(sold_prices)
        price = 0.6 * price + 0.4 * med
        breakdown.append(f"Blended with median sold price ({med}): 60/40 split -> {price}")
        
    extras_value = {
        "hard_case": 5000,
        "gig_bag": 2000,
        "stand": 1500,
        "pedal": 4000,
        "cable": 500
    }
    
    extras_total = 0
    for e in extras:
        val = extras_value.get(e.lower(), 0)
        extras_total += val
    
    if extras_total > 0:
        price += extras_total
        breakdown.append(f"Added value for extras: +{extras_total} -> {price}")
        
    price = round(price)
    min_price = round(price * 0.88 / 100) * 100
    max_price = round(price * 1.12 / 100) * 100
    fair_price = round(price / 100) * 100
    breakdown.append(f"Rounded range: {min_price} to {max_price} (Center: {fair_price})")
    
    confidence = "low"
    if match_type == "exact":
        if len(sold_prices) >= 3:
            confidence = "high"
        else:
            confidence = "medium"
            
    return {
        "fair_price": fair_price,
        "min": min_price,
        "max": max_price,
        "confidence": confidence,
        "breakdown": breakdown
    }

@tool
def evaluate_and_flag(asking_price: float, fair_price: float, min_price: float,
                      max_price: float, confidence: str) -> dict:
    """
    Evaluate the asking price against the fair price to produce a verdict.
    Flags suspiciously low prices if confidence is not low.
    """
    if fair_price is None or fair_price <= 0:
        return {"verdict": "UNKNOWN", "deviation_percent": 0.0, "flag_for_trust": False}

    deviation = (asking_price - fair_price) / fair_price * 100
    
    if deviation < -40:
        verdict = "SUSPICIOUSLY_LOW"
    elif -40 <= deviation < -15:
        verdict = "GREAT_DEAL"
    elif -15 <= deviation <= 15:
        verdict = "FAIR"
    elif 15 < deviation <= 40:
        verdict = "SLIGHTLY_HIGH"
    else:
        verdict = "OVERPRICED"
        
    flag = verdict == "SUSPICIOUSLY_LOW" and confidence != "low"
    
    return {
        "verdict": verdict,
        "deviation_percent": round(deviation, 1),
        "flag_for_trust": flag
    }
