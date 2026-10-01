"""Agents 01 and 02 must handle free-text categories that are not in the catalog (no crash, no 500)."""
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Agent_01 import agent as fair_agent
from Agent_01 import tools as fair_tools
from Agent_02 import agent as trust_agent
from Agent_02.tools import map_category_to_clip_label, calculate_trust_and_route


class _FailingAgent:
    def invoke(self, *args, **kwargs):
        raise RuntimeError("LLM offline")


def _failing_llm(*args, **kwargs):
    return _FailingAgent()


class _FakeTool:
    def __init__(self, fn):
        self.fn = fn

    def invoke(self, args):
        return self.fn(args)


def test_search_catalog_unknown_category_returns_none(monkeypatch):
    queries = []

    def fake_fetch_one(sql, params=None):
        queries.append(params)
        return None

    monkeypatch.setattr(fair_tools, "fetch_one", fake_fetch_one)
    res = fair_tools.search_catalog.invoke({"brand": "Rikhi Ram", "model": "", "category": "Sitar"})
    assert res == {"match_type": "none"}
    # An empty model must not run the LIKE '%%' query that matches every catalog row.
    assert ("%%",) not in queries


def test_fair_price_unknown_category_falls_back_to_unknown(monkeypatch):
    monkeypatch.setattr(fair_agent, "agent", _FailingAgent())
    monkeypatch.setattr(fair_agent, "get_chat_llm", _failing_llm)
    monkeypatch.setattr(fair_agent, "search_catalog", _FakeTool(lambda a: {"match_type": "none"}))
    monkeypatch.setattr(fair_agent, "get_market_prices", _FakeTool(lambda a: {"sold_prices": [], "active_prices": []}))

    res = fair_agent.run_fair_price({
        "brand": "Rikhi Ram", "model": "Deluxe", "category": "Sitar", "condition": "good",
        "year": None, "asking_price": 85000, "description": "Concert sitar with gig bag",
    })
    assert res["verdict"] == "UNKNOWN"
    assert res["fair_price"] == 0
    assert res["used_fallback"] is True
    assert "could not find a reference price" in res["explanation"].lower()


def test_clip_label_mapping_handles_free_text():
    assert map_category_to_clip_label("Electric Guitar") == "electric guitar"
    assert map_category_to_clip_label("bass guitar") == "bass guitar"
    assert map_category_to_clip_label("Guitar Amp") == "guitar amplifier"
    assert map_category_to_clip_label("Sampler") is None   # "amp" inside a word is not an amp
    assert map_category_to_clip_label("Sitar") is None
    assert map_category_to_clip_label("") is None
    assert map_category_to_clip_label(None) is None


def test_trust_check_unknown_category_is_not_penalised(monkeypatch):
    monkeypatch.setattr(trust_agent, "fetch_one", lambda sql, params=None: {"Id": 5})
    monkeypatch.setattr(trust_agent, "agent", _FailingAgent())
    monkeypatch.setattr(trust_agent, "get_chat_llm", _failing_llm)
    monkeypatch.setattr(trust_agent, "verify_images", _FakeTool(lambda a: {
        "image_hashes": [{"image_id": 1, "phash": "ffff0000ffff0000"}], "duplicate_found": False,
        "duplicate_listing_ids": [], "category_check": "skipped_unknown_category", "errors": []}))
    monkeypatch.setattr(trust_agent, "check_price_signals", _FakeTool(lambda a: {
        "suspicious_low": False, "frequent_changes": False, "asking_price": 85000.0}))
    monkeypatch.setattr(trust_agent, "get_seller_history", _FakeTool(lambda a: {
        "is_new_account": False, "rejected_listings": 0}))
    monkeypatch.setattr(trust_agent, "calculate_trust_and_route", calculate_trust_and_route)

    res = trust_agent.run_trust_check(5)
    assert res["trust_score"] == 100
    assert res["decision"] == "LIVE"
    assert all(s["code"] != "CATEGORY_MISMATCH" for s in res["signals"])


def test_trust_check_fails_closed_when_everything_breaks(monkeypatch):
    monkeypatch.setattr(trust_agent, "fetch_one", lambda sql, params=None: {"Id": 5})
    monkeypatch.setattr(trust_agent, "agent", _FailingAgent())

    def boom(args):
        raise RuntimeError("database down")

    monkeypatch.setattr(trust_agent, "verify_images", _FakeTool(boom))
    res = trust_agent.run_trust_check(5)
    assert res["decision"] == "PENDING"
    assert res["trust_score"] == 50
    assert res["used_fallback"] is True
