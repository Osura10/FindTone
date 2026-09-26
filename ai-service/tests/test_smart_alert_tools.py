from Agent_03.tools import match_listing_to_search, calculate_price_drop

def test_full_match():
    listing = {
        "title": "Yamaha Pacifica",
        "model": "Pacifica 112V",
        "category": "Electric Guitar",
        "brand": "Yamaha",
        "price": 35000,
        "condition": "excellent",
        "location": "Colombo"
    }
    search = {
        "Category": "Electric Guitar",
        "Brand": "Yamaha",
        "ModelKeyword": "pacifica",
        "MinPrice": 30000,
        "MaxPrice": 40000,
        "Conditions": "excellent, good",
        "Location": "colombo"
    }
    res = match_listing_to_search(listing, search)
    assert res["matched"] is True

def test_wrong_brand():
    listing = {"brand": "Fender", "category": "Electric Guitar"}
    search = {"Brand": "Yamaha"}
    res = match_listing_to_search(listing, search)
    assert res["matched"] is False
    assert "Brand mismatch" in res["failed"]

def test_over_budget():
    listing = {"price": 50000}
    search = {"MaxPrice": 40000}
    res = match_listing_to_search(listing, search)
    assert res["matched"] is False
    assert "Price above MaxPrice" in res["failed"]

def test_price_exactly_equal_to_maxprice_matches():
    listing = {"price": 40000}
    search = {"MaxPrice": 40000}
    res = match_listing_to_search(listing, search)
    assert res["matched"] is True

def test_condition_not_in_list():
    listing = {"condition": "poor"}
    search = {"Conditions": "excellent, good, fair"}
    res = match_listing_to_search(listing, search)
    assert res["matched"] is False
    assert "Condition mismatch" in res["failed"]

def test_empty_filters_are_ignored():
    listing = {"title": "Test", "price": 10000}
    search = {"Brand": None, "MaxPrice": None}
    res = match_listing_to_search(listing, search)
    assert res["matched"] is True

def test_model_keyword_found_in_title():
    listing = {"title": "Fender Stratocaster Classic", "model": ""}
    search = {"ModelKeyword": "stratocaster"}
    res = match_listing_to_search(listing, search)
    assert res["matched"] is True

def test_price_drop():
    # 33000 -> 29000 = 4000 / 12.1%
    res = calculate_price_drop(33000, 29000)
    assert res["is_drop"] is True
    assert res["drop_amount"] == 4000
    assert res["drop_percent"] == 12.1

def test_price_increase_is_not_drop():
    res = calculate_price_drop(29000, 33000)
    assert res["is_drop"] is False
