using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Services;

/// <summary>
/// Creates NEW_MATCH and PRICE_DROP notifications using Agent 03 (Smart Alert).
/// Notifications are unique per (UserId, ListingId, Type): a repeat event UPDATES the
/// existing row (new text, unread again, moved to the top) instead of being skipped.
/// </summary>
public class SmartAlertService
{
    private readonly AiServiceClient _aiClient;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SmartAlertService> _logger;

    public SmartAlertService(AiServiceClient aiClient, IServiceProvider serviceProvider, ILogger<SmartAlertService> logger)
    {
        _aiClient = aiClient;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// A listing just became LIVE: notify users whose saved alerts match it.
    /// </summary>
    public async Task OnListingBecameLiveAsync(Listing listing)
    {
        try
        {
            var result = await _aiClient.GetSmartAlertsAsync(listing.Id, "NEW_LISTING");
            if (result == null || result.Notifications.Count == 0) return;

            var saved = await UpsertNotificationsAsync(listing.SellerId, result.Notifications, listing.Id);
            _logger.LogInformation("[SmartAlert] new listing {ListingId}: {Count} notifications saved", listing.Id, saved);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Smart Alerts for listing {ListingId}", listing.Id);
        }
    }

    /// <summary>
    /// The price of a LIVE listing went down: notify every wishlist watcher, on every drop.
    /// </summary>
    public async Task OnPriceChangedAsync(Listing listing, decimal oldPrice)
    {
        if (listing.Status != "LIVE" || listing.Price >= oldPrice) return;

        try
        {
            var result = await _aiClient.GetSmartAlertsAsync(listing.Id, "PRICE_DROP", oldPrice);
            if (result == null || result.Notifications.Count == 0) return;

            var saved = await UpsertNotificationsAsync(listing.SellerId, result.Notifications, listing.Id);
            _logger.LogInformation("[SmartAlert] price drop {OldPrice} -> {NewPrice} for listing {ListingId}, notifications={Count}",
                oldPrice, listing.Price, listing.Id, saved);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing price drop alerts for listing {ListingId}", listing.Id);
        }
    }

    /// <summary>
    /// An alert was created, updated or enabled: check the EXISTING LIVE listings (not the
    /// user's own) and create NEW_MATCH notifications. Returns the number of matches.
    /// </summary>
    public async Task<int> OnAlertSavedAsync(SavedSearch alert)
    {
        if (!alert.IsActive) return 0;

        try
        {
            var result = await _aiClient.GetAlertBackfillAsync(alert.Id);
            if (result == null) return 0;

            // The AI only returns other sellers' listings; we still skip the owner to be safe.
            var notifications = result.Notifications.Where(n => n.ListingId.HasValue && n.UserId == alert.UserId).ToList();
            if (notifications.Count == 0) return 0;

            var saved = await UpsertNotificationsAsync(sellerIdToSkip: null, notifications, listingIdOverride: null);
            _logger.LogInformation("[SmartAlert] alert {AlertId} backfill: {Count} matches", alert.Id, saved);
            return saved;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error running alert backfill for alert {AlertId}", alert.Id);
            return 0;
        }
    }

    /// <summary>
    /// Insert new notifications or update the existing (UserId, ListingId, Type) row.
    /// </summary>
    private async Task<int> UpsertNotificationsAsync(int? sellerIdToSkip, IEnumerable<SmartAlertNotificationDto> items, int? listingIdOverride)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Make sure each listing id really exists and get its seller, so we never notify a seller about their own item.
        var listingIds = items.Select(n => listingIdOverride ?? n.ListingId).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var sellers = await db.Listings.Where(l => listingIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.SellerId);

        var now = DateTime.UtcNow;
        var count = 0;
        var touchedSearchIds = new HashSet<int>();

        foreach (var n in items)
        {
            var listingId = listingIdOverride ?? n.ListingId;
            if (listingId == null || !sellers.TryGetValue(listingId.Value, out var sellerId)) continue;
            if (n.UserId == sellerId || n.UserId == sellerIdToSkip) continue; // never notify the seller
            if (n.Type is not ("NEW_MATCH" or "PRICE_DROP")) continue;

            // Look in the change tracker first so two items for the same key in one batch do not clash.
            var existing = db.Notifications.Local.FirstOrDefault(x => x.UserId == n.UserId && x.ListingId == listingId && x.Type == n.Type)
                ?? await db.Notifications.FirstOrDefaultAsync(x => x.UserId == n.UserId && x.ListingId == listingId && x.Type == n.Type);

            if (existing != null)
            {
                existing.Title = n.Title;
                existing.Message = n.Message;
                existing.SavedSearchId = n.SavedSearchId ?? existing.SavedSearchId;
                existing.IsRead = false;
                existing.CreatedAt = now;
            }
            else
            {
                db.Notifications.Add(new Notification
                {
                    UserId = n.UserId,
                    ListingId = listingId,
                    SavedSearchId = n.SavedSearchId,
                    Type = n.Type,
                    Title = n.Title,
                    Message = n.Message,
                    CreatedAt = now,
                    IsRead = false
                });
            }

            if (n.SavedSearchId.HasValue) touchedSearchIds.Add(n.SavedSearchId.Value);
            count++;
        }

        if (touchedSearchIds.Count > 0)
        {
            var searches = await db.SavedSearches.Where(s => touchedSearchIds.Contains(s.Id)).ToListAsync();
            foreach (var s in searches) s.LastNotifiedAt = now;
        }

        await db.SaveChangesAsync();
        return count;
    }
}
