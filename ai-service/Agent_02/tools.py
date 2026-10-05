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


# ============================================================
# IMAGE VERIFICATION
# ============================================================

@tool
def verify_images(listing_id: int) -> dict:
    """
    Verify listing images for duplicates across other sellers.

    Uses perceptual hashing (pHash) instead of CLIP so the
    service remains lightweight enough for Render Free.
    """

    # --------------------------------------------------------
    # Get listing
    # --------------------------------------------------------
    listing = fetch_one(
        'SELECT "SellerId", "Category" FROM "Listings" WHERE "Id" = %s',
        (listing_id,)
    )

    if not listing:
        return {"error": "Listing not found"}

    seller_id = listing["SellerId"]
    category = listing["Category"]

    # --------------------------------------------------------
    # Get current listing images
    # --------------------------------------------------------
    images = fetch_all(
        '''
        SELECT "Id", "Url", "PHash"
        FROM "ListingImages"
        WHERE "ListingId" = %s
        ''',
        (listing_id,)
    )

    image_hashes = []
    errors = []

    # --------------------------------------------------------
    # Generate pHash for current listing images
    # --------------------------------------------------------
    for img in images:

        img_id = img["Id"]
        url = img["Url"]
        phash_str = img["PHash"]

        # If hash already exists in database, use it
        if not phash_str:

            try:
                response = requests.get(url, timeout=20)
                response.raise_for_status()

                im = Image.open(
                    BytesIO(response.content)
                ).convert("RGB")

                phash_val = imagehash.phash(im)

                phash_str = str(phash_val)

            except Exception as e:

                errors.append({
                    "image_id": img_id,
                    "error": str(e)
                })

                continue

        image_hashes.append({
            "image_id": img_id,
            "phash": phash_str
        })

    # --------------------------------------------------------
    # Duplicate detection
    # --------------------------------------------------------

    duplicate_found = False
    duplicate_listing_ids = set()

    my_hashes = [
        h for h in image_hashes
        if h.get("phash")
    ]

    if my_hashes:

        # Get images from other sellers
        other_images = fetch_all(
            '''
            SELECT
                i."Id" as "ImageId",
                i."ListingId",
                i."Url",
                i."PHash"
            FROM "ListingImages" i
            JOIN "Listings" l
                ON i."ListingId" = l."Id"
            WHERE
                l."SellerId" != %s
                AND l."Status" != 'REJECTED'
            ORDER BY l."CreatedAt" DESC
            LIMIT 100
            ''',
            (seller_id,)
        )

        for other_img in other_images:

            other_phash_str = other_img["PHash"]

            # Generate hash if database does not have one
            if not other_phash_str:

                try:
                    response = requests.get(
                        other_img["Url"],
                        timeout=20
                    )

                    response.raise_for_status()

                    im = Image.open(
                        BytesIO(response.content)
                    ).convert("RGB")

                    other_phash_str = str(
                        imagehash.phash(im)
                    )

                except Exception as e:

                    errors.append({
                        "image_id": other_img["ImageId"],
                        "error": str(e)
                    })

                    continue

            # Compare hashes
            try:

                other_hash_val = imagehash.hex_to_hash(
                    other_phash_str
                )

                for my_h in my_hashes:

                    try:

                        my_hash_val = imagehash.hex_to_hash(
                            my_h["phash"]
                        )

                        # Hamming distance <= 8
                        # means images are visually very similar
                        if my_hash_val - other_hash_val <= 8:

                            duplicate_found = True

                            duplicate_listing_ids.add(
                                other_img["ListingId"]
                            )

                    except ValueError as e:

                        errors.append({
                            "image_id": my_h["image_id"],
                            "error": f"Bad phash: {e}"
                        })

            except ValueError as e:

                errors.append({
                    "image_id": other_img["ImageId"],
                    "error": f"Bad phash: {e}"
                })

    # --------------------------------------------------------
    # Category checking
    # --------------------------------------------------------
    #
    # CLIP was removed because sentence-transformers + torch
    # consumes too much memory on Render Free.
    #
    # Duplicate image verification is still performed using
    # perceptual hashing.
    #
    # --------------------------------------------------------

    category_check = "skipped"
    detected_label = None

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "image_hashes": image_hashes,
        "duplicate_found": duplicate_found,
        "duplicate_listing_ids": list(
            duplicate_listing_ids
        ),
        "category_check": category_check,
        "detected_label": detected_label,
        "errors": errors
    }


# ============================================================
# PRICE SIGNALS
# ============================================================

@tool
def check_price_signals(listing_id: int) -> dict:
    """
    Check if the price is suspiciously low
    or has frequent changes.
    """

    row = fetch_one(
        '''
        SELECT
            "PriceVerdict",
            "PriceDeviationPercent",
            "Price"
        FROM "Listings"
        WHERE "Id" = %s
        ''',
        (listing_id,)
    )

    if not row:
        return {}

    verdict = row["PriceVerdict"]
    deviation = row["PriceDeviationPercent"]
    price = row["Price"]

    # --------------------------------------------------------
    # Count price changes during last 7 days
    # --------------------------------------------------------

    count_row = fetch_one(
        '''
        SELECT COUNT(*) as c
        FROM "PriceHistories"
        WHERE
            "ListingId" = %s
            AND "ChangedAt" >= CURRENT_DATE - INTERVAL '7 days'
        ''',
        (listing_id,)
    )

    changes = (
        count_row["c"]
        if count_row
        else 0
    )

    return {
        "price_verdict": verdict,

        "deviation_percent":
            float(deviation)
            if deviation is not None
            else None,

        "asking_price":
            float(price)
            if price is not None
            else 0.0,

        "price_changes_last_7_days":
            changes,

        "suspicious_low":
            verdict == "SUSPICIOUSLY_LOW",

        "frequent_changes":
            changes > 3
    }


# ============================================================
# SELLER HISTORY
# ============================================================

@tool
def get_seller_history(listing_id: int) -> dict:
    """
    Get seller history and account age.
    """

    # --------------------------------------------------------
    # Get seller ID
    # --------------------------------------------------------

    listing = fetch_one(
        '''
        SELECT "SellerId"
        FROM "Listings"
        WHERE "Id" = %s
        ''',
        (listing_id,)
    )

    if not listing:
        return {}

    seller_id = listing["SellerId"]

    # --------------------------------------------------------
    # Get seller information
    # --------------------------------------------------------

    user = fetch_one(
        '''
        SELECT
            "Name",
            "Role",
            "CreatedAt"
        FROM "Users"
        WHERE "Id" = %s
        ''',
        (seller_id,)
    )

    if not user:
        return {}

    created = user["CreatedAt"]

    # --------------------------------------------------------
    # Convert date if returned as string
    # --------------------------------------------------------

    if isinstance(created, str):

        created = datetime.datetime.fromisoformat(
            created.replace("Z", "+00:00")
        )

    if created.tzinfo is None:

        created = created.replace(
            tzinfo=datetime.timezone.utc
        )

    now = datetime.datetime.now(
        datetime.timezone.utc
    )

    age_days = (
        now - created
    ).days

    # --------------------------------------------------------
    # Seller listing statistics
    # --------------------------------------------------------

    total_row = fetch_one(
        '''
        SELECT COUNT(*) as c
        FROM "Listings"
        WHERE "SellerId" = %s
        ''',
        (seller_id,)
    )

    rejected_row = fetch_one(
        '''
        SELECT COUNT(*) as c
        FROM "Listings"
        WHERE
            "SellerId" = %s
            AND "Status" = 'REJECTED'
        ''',
        (seller_id,)
    )

    total_listings = (
        total_row["c"]
        if total_row
        else 0
    )

    rejected_listings = (
        rejected_row["c"]
        if rejected_row
        else 0
    )

    # --------------------------------------------------------
    # Return seller information
    # --------------------------------------------------------

    return {
        "seller_id": seller_id,

        "seller_name":
            user["Name"],

        "role":
            user["Role"],

        "account_age_days":
            age_days,

        "total_listings":
            total_listings,

        "rejected_listings":
            rejected_listings,

        "is_new_account":
            age_days < 7
    }


# ============================================================
# TRUST SCORE AND ROUTING
# ============================================================

@tool
def calculate_trust_and_route(
    duplicate_found: bool,
    category_mismatch: bool,
    suspicious_low: bool,
    frequent_changes: bool,
    is_new_account: bool,
    rejected_listings: int,
    asking_price: float
) -> dict:
    """
    Calculate trust score and determine
    whether listing should be LIVE or FLAGGED.
    """

    score = 100

    signals = []

    # --------------------------------------------------------
    # Duplicate image
    # --------------------------------------------------------

    if duplicate_found:

        score -= 40

        signals.append({
            "code": "DUPLICATE_IMAGE",
            "points": -40,
            "detail":
                "Photo matches another seller's listing - "
                "sent to admin review"
        })

    # --------------------------------------------------------
    # Category mismatch
    # --------------------------------------------------------

    if category_mismatch:

        score -= 20

        signals.append({
            "code": "CATEGORY_MISMATCH",
            "points": -20,
            "detail":
                "Image does not match expected category."
        })

    # --------------------------------------------------------
    # Suspiciously low price
    # --------------------------------------------------------

    if suspicious_low:

        score -= 30

        signals.append({
            "code": "SUSPICIOUS_LOW",
            "points": -30,
            "detail":
                "Asking price is suspiciously low."
        })

    # --------------------------------------------------------
    # Frequent price changes
    # --------------------------------------------------------

    if frequent_changes:

        score -= 10

        signals.append({
            "code": "FREQUENT_CHANGES",
            "points": -10,
            "detail":
                "Price changed frequently in the last 7 days."
        })

    # --------------------------------------------------------
    # New seller account
    # --------------------------------------------------------

    if is_new_account:

        score -= 15

        signals.append({
            "code": "NEW_ACCOUNT",
            "points": -15,
            "detail":
                "Seller account is less than 7 days old."
        })

    # --------------------------------------------------------
    # Previous rejected listings
    # --------------------------------------------------------

    if rejected_listings > 0:

        penalty = min(
            rejected_listings * 10,
            20
        )

        score -= penalty

        signals.append({
            "code": "PAST_REJECTIONS",
            "points": -penalty,
            "detail":
                f"Seller has {rejected_listings} "
                f"previously rejected listings."
        })

    # --------------------------------------------------------
    # Keep score between 0 and 100
    # --------------------------------------------------------

    score = max(
        0,
        min(100, score)
    )

    # --------------------------------------------------------
    # Routing decision
    # --------------------------------------------------------

    if duplicate_found:

        decision = "FLAGGED"

    elif score < 40:

        decision = "FLAGGED"

    elif asking_price > 200000:

        decision = "FLAGGED"

    else:

        decision = "LIVE"

    # --------------------------------------------------------
    # Warning
    # --------------------------------------------------------

    warning = (
        True
        if 40 <= score < 70
        else False
    )

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "trust_score": score,
        "decision": decision,
        "warning": warning,
        "signals": signals
    }