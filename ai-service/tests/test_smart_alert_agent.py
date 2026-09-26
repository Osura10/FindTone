from Agent_03.agent import parse_alert_text
import pytest

def test_parse_alert_fallback(monkeypatch):
    # Mock llm to fail so it uses fallback
    def mock_get_chat_llm(*args, **kwargs):
        class MockLLM:
            def invoke(self, *args, **kwargs):
                raise Exception("LLM Error")
        return MockLLM()
        
    # Mock db fetch_all
    def mock_fetch_all(*args, **kwargs):
        if "Category" in args[0]:
            return [{"Category": "Acoustic Guitar"}, {"Category": "Electric Guitar"}]
        if "Brand" in args[0]:
            return [{"Brand": "Yamaha"}, {"Brand": "Fender"}]
        return []
        
    monkeypatch.setattr("Agent_03.agent.get_chat_llm", mock_get_chat_llm)
    monkeypatch.setattr("Agent_03.agent.fetch_all", mock_fetch_all)
    
    # 1. Price with k, condition, brand, category
    res1 = parse_alert_text("Used Yamaha acoustic guitar under 40k")
    assert res1["used_fallback"] is True
    assert res1["max_price"] == 40000
    assert res1["brand"] == "Yamaha"
    assert res1["category"] == "Acoustic Guitar"
    assert res1["conditions"] == "like_new,excellent,good,fair"
    
    # 2. Below and no k
    res2 = parse_alert_text("below 15000")
    assert res2["used_fallback"] is True
    assert res2["max_price"] == 15000
    
    # 3. New condition
    res3 = parse_alert_text("brand new fender")
    assert res3["used_fallback"] is True
    assert res3["brand"] == "Fender"
    assert res3["conditions"] == "new"
