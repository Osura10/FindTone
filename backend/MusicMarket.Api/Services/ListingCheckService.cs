using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Services;

/// <summary>
/// Runs the AI checks for a listing (Agent 01 Fair Price, Agent 02 Trust) and saves the results.
/// Used by create, edit, price change and the admin re-check, so the rules live in one place.
/// </summary>
public class ListingCheckService
{
    public const string AiUnavailableReason = "AI check failed: Service unavailable or timed out. An admin can re-check this listing.";

    private readonly AppDbContext _db;
    private readonly AiServiceClient _ai;
    private readonly ILogger<ListingCheckService> _logger;

    public ListingCheckService(AppDbContext db, AiServiceClient ai, ILogger<ListingCheckService> logger)
    {
        _db = db;
        _ai = ai;
        _logger = logger;
    }

    /// <summary>
    /// Agent 01: store the fair price range and verdict. Returns false when the AI did not answer.
    /// </summary>
    public async Task<bool> RunFairPriceAsync(Listing listing)
    {
        var result = await _ai.GetFairPriceAsync(new FairPriceRequest
        {
            ListingId = listing.Id,
            Brand = listing.Brand,
            Model = listing.Model,
            Category = listing.Category,
            Condition = listing.Condition,
            Year = listing.Year,
            AskingPrice = (float)listing.Price,
            Description = listing.Description
        });
        if (result == null)
        {
            _logger.LogWarning("Fair price check unavailable for listing {ListingId}", listing.Id);
            return false;
        }

        // Unknown items (no reference price) come back as 0 -> store "no range" instead of 0-0.
        var hasRange = result.FairPrice > 0;
        listing.FairPrice = hasRange ? (decimal)result.FairPrice : null;
        listing.FairPriceMin = hasRange ? (decimal)result.FairRange.Min : null;
        listing.FairPriceMax = hasRange ? (decimal)result.FairRange.Max : null;
        listing.PriceVerdict = string.IsNullOrWhiteSpace(result.Verdict) ? "UNKNOWN" : result.Verdict;
        listing.PriceDeviationPercent = hasRange ? result.DeviationPercent : null;
        listing.PriceConfidence = result.Confidence;
        listing.PriceExplanation = result.Explanation;
        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Agent 02: store the trust score and move the listing to LIVE / FLAGGED.
    /// REJECTED and SOLD listings never change status here. Returns false when the AI did not answer.
    /// </summary>
    public async Task<bool> RunTrustCheckAsync(Listing listing)
    {
        var result = await _ai.GetTrustCheckAsync(listing.Id);
        if (result == null)
        {
            // Keep a LIVE listing LIVE; anything else waits for an admin re-check.
            if (listing.Status is not ("REJECTED" or "SOLD" or "LIVE"))
            {
                listing.Status = "PENDING";
            }
            listing.AiReason = AiUnavailableReason;
            listing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return false;
        }

        listing.TrustScore = result.TrustScore;
        listing.AiReason = BuildReason(result);

        if (listing.Status is not ("REJECTED" or "SOLD"))
        {
            if (result.Decision is "LIVE" or "FLAGGED")
            {
                listing.Status = result.Decision;
            }
            else if (result.Decision == "PENDING" && listing.Status != "LIVE")
            {
                listing.Status = "PENDING";
            }
        }

        // Save perceptual hashes for all returned images (they can belong to other listings too).
        var imageIds = result.ImageHashes.Select(h => h.ImageId).ToList();
        if (imageIds.Count > 0)
        {
            var images = await _db.ListingImages.Where(i => imageIds.Contains(i.Id)).ToListAsync();
            foreach (var hash in result.ImageHashes)
            {
                var img = images.FirstOrDefault(i => i.Id == hash.ImageId);
                if (img != null && !string.IsNullOrEmpty(hash.PHash))
                {
                    img.PHash = hash.PHash;
                }
            }
        }

        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private static string BuildReason(TrustCheckResult result)
    {
        var reason = result.Reason;
        if (result.Signals.Count > 0)
        {
            reason += "\n\nSignals:";
            foreach (var s in result.Signals)
            {
                reason += $"\n- {s.Code} ({s.Points}): {s.Detail}";
            }
        }
        return reason;
    }
}
