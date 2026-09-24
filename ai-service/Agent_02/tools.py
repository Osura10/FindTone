from langchain_core.tools import tool
import os
import sys
import requests
import imagehash
from PIL import Image
from io import BytesIO
import datetime

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from db import fetch_one, fetch_all

clip_model = None

def get_clip_model():
    global clip_model
    if clip_model is None:
        from sentence_transformers import SentenceTransformer
        clip_model = SentenceTransformer("clip-ViT-B-32")
    return clip_model

@tool
def verify_images(listing_id: int) -> dict:
    """
    Verify listing images for duplicates across other sellers, and check if they match the category.
    """
    listing = fetch_one('SELECT "SellerId", "Category" FROM "Listings" WHERE "Id" = %s', (listing_id,))
    if not listing:
        return {"error": "Listing not found"}
        
    seller_id = listing["SellerId"]
    category = listing["Category"]
    
    images = fetch_all('SELECT "Id", "Url", "PHash" FROM "ListingImages" WHERE "ListingId" = %s', (listing_id,))
    
    image_hashes = []
    errors = []
    
    for img in images:
        img_id = img["Id"]
        url = img["Url"]
        phash_str = img["PHash"]
        
        if not phash_str:
            try:
                resp = requests.get(url, timeout=20)
                resp.raise_for_status()
                im = Image.open(BytesIO(resp.content))
                phash_val = imagehash.phash(im)
                phash_str = str(phash_val)
            except Exception as e:
                errors.append({"image_id": img_id, "error": str(e)})
                continue
                
        image_hashes.append({"image_id": img_id, "phash": phash_str})
        
    duplicate_found = False
    duplicate_listing_ids = set()
    
    my_hashes = [h for h in image_hashes if h["phash"]]
    
    if my_hashes:
        other_images = fetch_all('''
            SELECT i."Id" as "ImageId", i."ListingId", i."Url", i."PHash"
            FROM "ListingImages" i
            JOIN "Listings" l ON i."ListingId" = l."Id"
            WHERE l."SellerId" != %s AND l."Status" != 'REJECTED'
            ORDER BY l."CreatedAt" DESC
            LIMIT 100
        ''', (seller_id,))
        
        for other_img in other_images:
            other_phash_str = other_img["PHash"]
            if not other_phash_str:
                try:
                    resp = requests.get(other_img["Url"], timeout=20)
                    resp.raise_for_status()
                    im = Image.open(BytesIO(resp.content))
                    other_phash_str = str(imagehash.phash(im))
                    # Append to image_hashes so ASP.NET saves it
                    image_hashes.append({"image_id": other_img["ImageId"], "phash": other_phash_str})
                except Exception as e:
                    errors.append({"image_id": other_img["ImageId"], "error": str(e)})
                    continue
            
            try:
                other_hash_val = imagehash.hex_to_hash(other_phash_str)
                for my_h in my_hashes:
                    try:
                        my_hash_val = imagehash.hex_to_hash(my_h["phash"])
                        if my_hash_val - other_hash_val <= 8:
                            duplicate_found = True
                            duplicate_listing_ids.add(other_img["ListingId"])
                    except:
                        pass
            except:
                pass
                    
    category_check = "skipped"
    detected_label = None
    
    enable_clip = os.getenv("ENABLE_CLIP", "true").lower() == "true"
    
    if enable_clip and image_hashes and len(image_hashes) > len(errors):
        try:
            model = get_clip_model()
            im_to_check = None
            for img in images:
                try:
                    resp = requests.get(img["Url"], timeout=20)
                    resp.raise_for_status()
                    im_to_check = Image.open(BytesIO(resp.content))
                    break
                except:
                    continue
            
            if im_to_check:
                labels = [
                    "acoustic guitar", "electric guitar", "bass guitar", "keyboard", 
                    "drum kit", "microphone", "guitar amplifier", "a screenshot or text image"
                ]
                
                import numpy as np
                image_emb = model.encode(im_to_check)
                text_emb = model.encode(labels)
                
                image_emb = image_emb / np.linalg.norm(image_emb)
                text_emb = text_emb / np.linalg.norm(text_emb, axis=1, keepdims=True)
                similarities = image_emb @ text_emb.T
                
                best_idx = np.argmax(similarities)
                detected_label = labels[best_idx]
                
                expected = category.lower()
                cat_map = {
                    "acoustic": "acoustic guitar",
                    "electric": "electric guitar",
                    "bass": "bass guitar",
                    "keyboard": "keyboard",
                    "piano": "keyboard",
                    "drum": "drum kit",
                    "mic": "microphone",
                    "amp": "guitar amplifier"
                }
                
                expected_label = expected
                for k, v in cat_map.items():
                    if k in expected:
                        expected_label = v
                        break
                        
                if detected_label == "a screenshot or text image":
                    category_check = "mismatch"
                elif detected_label == expected_label:
                    category_check = "match"
                else:
                    category_check = "mismatch"
        except Exception as e:
            errors.append({"clip_error": str(e)})
            
    return {
        "image_hashes": image_hashes,
        "duplicate_found": duplicate_found,
        "duplicate_listing_ids": list(duplicate_listing_ids),
        "category_check": category_check,
        "detected_label": detected_label,
        "errors": errors
    }

@tool
def check_price_signals(listing_id: int) -> dict:
    """Check if the price is suspiciously low or has frequent changes."""
    row = fetch_one('SELECT "PriceVerdict", "PriceDeviationPercent", "Price" FROM "Listings" WHERE "Id" = %s', (listing_id,))
    if not row:
        return {}
        
    verdict = row["PriceVerdict"]
    deviation = row["PriceDeviationPercent"]
    price = row["Price"]
    
    count_row = fetch_one('''
        SELECT COUNT(*) as c FROM "PriceHistories"
        WHERE "ListingId" = %s AND "ChangedAt" >= CURRENT_DATE - INTERVAL '7 days'
    ''', (listing_id,))
    
    changes = count_row["c"] if count_row else 0
    
    return {
        "price_verdict": verdict,
        "deviation_percent": float(deviation) if deviation is not None else None,
        "asking_price": float(price) if price is not None else 0.0,
        "price_changes_last_7_days": changes,
        "suspicious_low": verdict == "SUSPICIOUSLY_LOW",
        "frequent_changes": changes > 3
    }

@tool
def get_seller_history(listing_id: int) -> dict:
    """Get the seller's history and account age."""
    l = fetch_one('SELECT "SellerId" FROM "Listings" WHERE "Id" = %s', (listing_id,))
    if not l:
        return {}
        
    seller_id = l["SellerId"]
    u = fetch_one('SELECT "Name", "Role", "CreatedAt" FROM "Users" WHERE "Id" = %s', (seller_id,))
    
    if not u:
        return {}
        
    created = u["CreatedAt"]
    if isinstance(created, str):
        created = datetime.datetime.fromisoformat(created.replace('Z', '+00:00'))
    
    if created.tzinfo is None:
        created = created.replace(tzinfo=datetime.timezone.utc)
        
    now = datetime.datetime.now(datetime.timezone.utc)
    age_days = (now - created).days
    
    total_listings = fetch_one('SELECT COUNT(*) as c FROM "Listings" WHERE "SellerId" = %s', (seller_id,))["c"]
    rejected_listings = fetch_one("SELECT COUNT(*) as c FROM \"Listings\" WHERE \"SellerId\" = %s AND \"Status\" = 'REJECTED'", (seller_id,))["c"]
    
    return {
        "seller_id": seller_id,
        "seller_name": u["Name"],
        "role": u["Role"],
        "account_age_days": age_days,
        "total_listings": total_listings,
        "rejected_listings": rejected_listings,
        "is_new_account": age_days < 7
    }

@tool
def calculate_trust_and_route(duplicate_found: bool, category_mismatch: bool,
                              suspicious_low: bool, frequent_changes: bool, 
                              is_new_account: bool, rejected_listings: int, 
                              asking_price: float) -> dict:
    """Calculate a trust score and routing decision."""
    score = 100
    signals = []
    
    if duplicate_found:
        score -= 40
        signals.append({"code": "DUPLICATE_IMAGE", "points": -40, "detail": "Image matches another seller's listing."})
    if category_mismatch:
        score -= 20
        signals.append({"code": "CATEGORY_MISMATCH", "points": -20, "detail": "Image does not match expected category."})
    if suspicious_low:
        score -= 30
        signals.append({"code": "SUSPICIOUS_LOW", "points": -30, "detail": "Asking price is suspiciously low."})
    if frequent_changes:
        score -= 10
        signals.append({"code": "FREQUENT_CHANGES", "points": -10, "detail": "Price changed frequently in the last 7 days."})
    if is_new_account:
        score -= 15
        signals.append({"code": "NEW_ACCOUNT", "points": -15, "detail": "Seller account is less than 7 days old."})
        
    if rejected_listings > 0:
        penalty = min(rejected_listings * 10, 20)
        score -= penalty
        signals.append({"code": "PAST_REJECTIONS", "points": -penalty, "detail": f"Seller has {rejected_listings} previously rejected listings."})
        
    score = max(0, min(100, score))
    
    if score < 40 or asking_price > 200000:
        decision = "FLAGGED"
    else:
        decision = "LIVE"
        
    warning = True if 40 <= score < 70 else False
    
    return {
        "trust_score": score,
        "decision": decision,
        "warning": warning,
        "signals": signals
    }
