import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Agent_01.tools import calculate_fair_price, evaluate_and_flag

def test_calculate_fair_price():
    result = calculate_fair_price.invoke({
        "new_price": 45000.0,
        "condition": "good",
        "age_years": 2,
        "sold_prices": [30000.0, 28000.0, 31000.0],
        "is_collectible": False,
        "extras": [],
        "match_type": "exact"
    })
    
    assert result["fair_price"] == 27800
    assert result["min"] == 24500
    assert result["max"] == 31100
    assert result["confidence"] == "high"

def test_evaluate_and_flag_overpriced():
    result = evaluate_and_flag.invoke({
        "asking_price": 75000.0,
        "fair_price": 27800.0,
        "min_price": 24500.0,
        "max_price": 31100.0,
        "confidence": "high"
    })
    
    assert result["verdict"] == "OVERPRICED"
    assert result["flag_for_trust"] is False

def test_evaluate_and_flag_suspicious():
    result = evaluate_and_flag.invoke({
        "asking_price": 8000.0,
        "fair_price": 27800.0,
        "min_price": 24500.0,
        "max_price": 31100.0,
        "confidence": "high"
    })
    
    assert result["verdict"] == "SUSPICIOUSLY_LOW"
    assert result["flag_for_trust"] is True
