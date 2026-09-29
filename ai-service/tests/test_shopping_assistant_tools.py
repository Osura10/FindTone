import sys
import os
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Agent_04.tools import validate_alert_criteria

def test_validate_alert_criteria_valid():
    res = validate_alert_criteria(
        name="Test",
        category="Guitar",
        brand="Yamaha",
        model_keyword="F310",
        min_price=1000,
        max_price=50000,
        conditions="new,good",
        location="Colombo"
    )
    assert res["valid"] is True
    assert len(res["errors"]) == 0
    assert res["alert"]["name"] == "Test"
    assert res["alert"]["category"] == "Guitar"
    assert res["alert"]["brand"] == "Yamaha"
    assert res["alert"]["model_keyword"] == "F310"
    assert res["alert"]["min_price"] == 1000
    assert res["alert"]["max_price"] == 50000
    assert res["alert"]["conditions"] == "new,good" or res["alert"]["conditions"] == "good,new"
    assert res["alert"]["location"] == "Colombo"

def test_validate_alert_criteria_invalid_price():
    res = validate_alert_criteria(
        category="Guitar",
        min_price=50000,
        max_price=1000
    )
    assert res["valid"] is False
    assert "MaxPrice must be greater than or equal to MinPrice." in res["errors"]

def test_validate_alert_criteria_invalid_condition():
    res = validate_alert_criteria(
        category="Guitar",
        conditions="broken"
    )
    assert res["valid"] is False
    assert any("Invalid condition" in err for err in res["errors"])

def test_validate_alert_criteria_no_filters():
    res = validate_alert_criteria()
    assert res["valid"] is False
    assert any("At least one filter" in err for err in res["errors"])

def test_validate_alert_criteria_auto_name():
    res = validate_alert_criteria(
        brand="Yamaha",
        max_price=40000,
        location="Colombo"
    )
    assert res["valid"] is True
    assert res["alert"]["name"] == "Yamaha in Colombo under LKR 40,000"

