import sys
import os
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Agent_04.tools import validate_alert_criteria, search_listings, compare_items, get_price_insight
from unittest.mock import patch

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

@patch('Agent_04.tools.fetch_all')
def test_search_listings_only_live(mock_fetch_all):
    mock_fetch_all.return_value = []
    search_listings.invoke({"category": "Guitar"})
    assert mock_fetch_all.called
    sql = mock_fetch_all.call_args[0][0]
    assert "l.\"Status\" = 'LIVE'" in sql

@patch('Agent_04.tools.fetch_all')
def test_compare_items_only_live(mock_fetch_all):
    mock_fetch_all.return_value = []
    compare_items.invoke({"listing_ids": [1, 2]})
    assert mock_fetch_all.called
    sql = mock_fetch_all.call_args[0][0]
    assert "\"Status\" = 'LIVE'" in sql

@patch('Agent_04.tools.fetch_one')
def test_get_price_insight_only_live(mock_fetch_one):
    mock_fetch_one.return_value = None
    get_price_insight.invoke({"listing_id": 1})
    assert mock_fetch_one.called
    sql = mock_fetch_one.call_args[0][0]
    assert "\"Status\" = 'LIVE'" in sql

