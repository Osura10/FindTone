import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Agent_03 import agent as alert_agent

LISTING_ROW = {
    "Title": "Hohner Melodica", "Category": "Melodica", "Brand": "Hohner", "Model": "Student 32",
    "Condition": "good", "Price": 30000, "Location": "Kandy", "Status": "LIVE", "SellerId": 5,
    "SellerName": "Shop", "PriceVerdict": "FAIR", "FairPriceMin": None, "FairPriceMax": None,
    "TrustScore": 85, "FirstImageUrl": None,
}


def test_new_listing_builds_new_match_without_an_old_price(monkeypatch):
    # A NEW_LISTING event has no old price. The rule-based pipeline passes old_price=None to the
    # prepare_notifications tool; this used to fail tool validation ("old_price: Input should be a
    # valid number"), so buyers never got NEW_MATCH for newly created listings.
    monkeypatch.setattr("Agent_03.tools.fetch_one", lambda *a, **k: LISTING_ROW)
    monkeypatch.setattr(
        "Agent_03.agent.find_new_matches",
        type("T", (), {"invoke": staticmethod(lambda args: {"matches": [{"user_id": 9, "saved_search_id": 3, "search_name": "Melodica under 40k"}]})}),
    )

    notes = alert_agent._rule_based_notifications(listing_id=1, event="NEW_LISTING", old_price=None)

    assert len(notes) == 1
    assert notes[0]["type"] == "NEW_MATCH"
    assert notes[0]["user_id"] == 9
    assert "Melodica under 40k" in notes[0]["message"]
