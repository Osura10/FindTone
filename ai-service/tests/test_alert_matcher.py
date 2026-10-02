import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Agent_03 import tools as alert_tools
from Agent_03 import agent as alert_agent
from Agent_03.tools import match_listing_to_search

LISTING = {
    "title": "Yamaha Pacifica 112V",
    "model": "Pacifica 112V",
    "category": "Electric Guitar",
    "brand": "Yamaha",
    "price": 35000,
    "condition": "excellent",
    "location": "Colombo 07",
}


def test_blank_string_filters_are_ignored():
    # The web form used to save "" for empty fields; "" must mean "no filter".
    search = {"Category": "", "Brand": "  ", "ModelKeyword": "", "Conditions": "", "Location": "",
              "MinPrice": None, "MaxPrice": 40000}
    res = match_listing_to_search(LISTING, search)
    assert res["matched"] is True


def test_matching_is_case_insensitive_and_space_tolerant():
    search = {"Category": "electric   GUITAR", "Brand": "YAMAHA", "ModelKeyword": "PACIFICA",
              "Conditions": "Excellent, Good", "Location": "colombo"}
    res = match_listing_to_search(LISTING, search)
    assert res["matched"] is True


def test_unknown_free_text_category_matches_only_itself():
    sitar = {**LISTING, "category": "Sitar", "brand": "Rikhi Ram", "title": "Rikhi Ram Sitar", "model": "Deluxe"}
    assert match_listing_to_search(sitar, {"Category": "sitar"})["matched"] is True
    res = match_listing_to_search(sitar, {"Category": "Electric Guitar"})
    assert res["matched"] is False
    assert "Category mismatch" in res["failed"]


def test_missing_listing_fields_do_not_crash():
    res = match_listing_to_search({"price": None, "category": None}, {"Category": "Bass", "Brand": "Fender"})
    assert res["matched"] is False


def test_backfill_returns_matches_excluding_non_matching(monkeypatch):
    search = {"Id": 7, "UserId": 3, "Name": "Cheap Yamaha", "IsActive": True,
              "Category": None, "Brand": "yamaha", "ModelKeyword": "", "MinPrice": None,
              "MaxPrice": 50000, "Conditions": "", "Location": ""}
    rows = [
        {"Id": 11, "Title": "Yamaha F310", "Category": "Acoustic Guitar", "Brand": "Yamaha", "Model": "F310",
         "Condition": "good", "Price": 30000, "Location": "Kandy"},
        {"Id": 12, "Title": "Fender Strat", "Category": "Electric Guitar", "Brand": "Fender", "Model": "Strat",
         "Condition": "good", "Price": 30000, "Location": "Kandy"},
        {"Id": 13, "Title": "Yamaha Montage", "Category": "Keyboard", "Brand": "Yamaha", "Model": "Montage 8",
         "Condition": "new", "Price": 900000, "Location": "Galle"},
    ]
    captured = {}

    def fake_fetch_all(sql, params=None):
        captured["params"] = params
        return rows

    monkeypatch.setattr(alert_tools, "fetch_one", lambda sql, params=None: search)
    monkeypatch.setattr(alert_tools, "fetch_all", fake_fetch_all)

    res = alert_tools.backfill_search_matches(7)
    assert [n["listing_id"] for n in res["notifications"]] == [11]
    n = res["notifications"][0]
    assert n["user_id"] == 3 and n["saved_search_id"] == 7 and n["type"] == "NEW_MATCH"
    assert "30,000" in n["message"]
    # The SQL excludes the alert owner's own listings.
    assert captured["params"] == (3,)


def test_backfill_inactive_alert_returns_nothing(monkeypatch):
    monkeypatch.setattr(alert_tools, "fetch_one", lambda sql, params=None: {"Id": 1, "UserId": 1, "IsActive": False})
    assert alert_tools.backfill_search_matches(1)["notifications"] == []


def test_llm_cannot_change_recipients_or_drop_prices():
    base = [{"user_id": 5, "saved_search_id": None, "type": "PRICE_DROP", "title": "Price Drop: X",
             "message": "X has dropped from LKR 50,000 to LKR 45,000 (10.0% drop) in Kandy."}]
    rewritten = [
        {"user_id": 5, "type": "PRICE_DROP", "message": "Good news! X is cheaper now."},  # lost the prices
        {"user_id": 99, "type": "PRICE_DROP", "message": "Invented user"},                 # not a watcher
    ]
    merged = alert_agent._merge_rewritten_messages(base, rewritten)
    assert len(merged) == 1
    assert merged[0]["user_id"] == 5
    assert merged[0]["message"] == base[0]["message"]

    ok = [{"user_id": 5, "type": "PRICE_DROP", "message": "📉 X fell from LKR 50,000 to LKR 45,000 (10.0% drop)!"}]
    assert alert_agent._merge_rewritten_messages(base, ok)[0]["message"].startswith("📉")


def test_parse_alert_turns_null_words_into_real_nulls(monkeypatch):
    class _Msg:
        content = '{"name": "Yamaha under 90k", "brand": "Yamaha", "model_keyword": "null", "location": "None", "category": "", "max_price": "90,000", "min_price": "null"}'

    class _LLM:
        def invoke(self, *args, **kwargs):
            return _Msg()

    monkeypatch.setattr(alert_agent, "get_chat_llm", lambda *a, **k: _LLM())
    monkeypatch.setattr(alert_agent, "fetch_all", lambda *a, **k: [])
    res = alert_agent.parse_alert_text("yamaha under 90k")
    assert res["brand"] == "Yamaha"
    assert res["model_keyword"] is None
    assert res["location"] is None
    assert res["category"] is None
    assert res["max_price"] == 90000.0
    assert res["min_price"] is None
    assert res["used_fallback"] is False


def test_parse_alert_fixes_llm_price_direction_and_conditions(monkeypatch):
    class _Msg:
        # llama put "below 150000" into min_price and used a condition word that is not allowed.
        content = '{"name": "x", "brand": "Fender", "category": "Bass Guitar", "min_price": 150000, "max_price": null, "conditions": "used", "location": "Kandy"}'

    class _LLM:
        def invoke(self, *args, **kwargs):
            return _Msg()

    monkeypatch.setattr(alert_agent, "get_chat_llm", lambda *a, **k: _LLM())
    monkeypatch.setattr(alert_agent, "fetch_all", lambda *a, **k: [])
    res = alert_agent.parse_alert_text("fender bass in kandy below 150000")
    assert res["max_price"] == 150000.0
    assert res["min_price"] is None
    assert res["conditions"] == "like_new,excellent,good,fair"


def test_condition_and_price_rules():
    assert alert_agent._clean_conditions("Like New, brand new, junk") == "like_new,new"
    assert alert_agent._clean_conditions("") is None
    r = {"min_price": None, "max_price": None}
    alert_agent._apply_price_rules("keyboard over 2 lakh", r)
    assert r == {"min_price": 200000.0, "max_price": None}
    r = {"min_price": None, "max_price": None}
    alert_agent._apply_price_rules("amp from 20k up to 45,000", r)
    assert r == {"min_price": 20000.0, "max_price": 45000.0}


def test_price_not_in_text_is_dropped_and_between_works():
    r = {"min_price": 15000.0, "max_price": 150000.0}       # llama invented 15000
    alert_agent._apply_price_rules("fender bass in kandy below 150000", r)
    assert r == {"min_price": None, "max_price": 150000.0}
    r = {"min_price": None, "max_price": None}
    alert_agent._apply_price_rules("guitar between 20k and 50k", r)
    assert r == {"min_price": 20000.0, "max_price": 50000.0}
