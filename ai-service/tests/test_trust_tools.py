import pytest
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Agent_02.tools import calculate_trust_and_route

def test_calculate_trust_and_route_clean():
    res = calculate_trust_and_route.invoke({
        "duplicate_found": False,
        "category_mismatch": False,
        "suspicious_low": False,
        "frequent_changes": False,
        "is_new_account": False,
        "rejected_listings": 0,
        "asking_price": 50000
    })
    assert res["trust_score"] == 100
    assert res["decision"] == "LIVE"
    assert res["warning"] is False
    assert len(res["signals"]) == 0

def test_calculate_trust_and_route_new_account_only():
    res = calculate_trust_and_route.invoke({
        "duplicate_found": False,
        "category_mismatch": False,
        "suspicious_low": False,
        "frequent_changes": False,
        "is_new_account": True,
        "rejected_listings": 0,
        "asking_price": 50000
    })
    assert res["trust_score"] == 85
    assert res["decision"] == "LIVE"
    assert res["warning"] is False
    assert len(res["signals"]) == 1
    assert res["signals"][0]["code"] == "NEW_ACCOUNT"

def test_calculate_trust_and_route_multiple_penalties():
    res = calculate_trust_and_route.invoke({
        "duplicate_found": True,
        "category_mismatch": False,
        "suspicious_low": True,
        "frequent_changes": False,
        "is_new_account": True,
        "rejected_listings": 0,
        "asking_price": 50000
    })
    # duplicate (40) + suspicious (30) + new (15) = 85 penalty -> 15 score
    assert res["trust_score"] == 15
    assert res["decision"] == "FLAGGED"
    assert res["warning"] is False
    assert len(res["signals"]) == 3

def test_calculate_trust_and_route_price_limit():
    res = calculate_trust_and_route.invoke({
        "duplicate_found": False,
        "category_mismatch": False,
        "suspicious_low": False,
        "frequent_changes": False,
        "is_new_account": False,
        "rejected_listings": 0,
        "asking_price": 250000
    })
    assert res["trust_score"] == 100
    assert res["decision"] == "FLAGGED"
    assert res["warning"] is False
    assert len(res["signals"]) == 0

def test_calculate_trust_and_route_warning():
    res = calculate_trust_and_route.invoke({
        "duplicate_found": True, # -40
        "category_mismatch": False,
        "suspicious_low": False,
        "frequent_changes": False, # 0
        "is_new_account": False,
        "rejected_listings": 0,
        "asking_price": 50000
    })
    # score 60
    assert res["trust_score"] == 60
    assert res["decision"] == "LIVE"
    assert res["warning"] is True

def test_calculate_trust_and_route_clamp_0():
    res = calculate_trust_and_route.invoke({
        "duplicate_found": True, # -40
        "category_mismatch": True, # -20
        "suspicious_low": True, # -30
        "frequent_changes": True, # -10
        "is_new_account": True, # -15
        "rejected_listings": 5, # -20
        "asking_price": 50000
    })
    # penalty > 100
    assert res["trust_score"] == 0
    assert res["decision"] == "FLAGGED"
    assert res["warning"] is False
