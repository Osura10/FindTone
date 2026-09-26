using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Services;

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

    public async Task OnListingBecameLiveAsync(Listing listing)
    {
        try
        {
            var result = await _aiClient.GetSmartAlertsAsync(listing.Id, "NEW_LISTING");
            if (result == null || result.Notifications == null || result.Notifications.Count == 0) return;

            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            foreach (var notif in result.Notifications)
            {
                if (notif.UserId == listing.SellerId) continue; // never notify the seller

                // Check if already exists
                var exists = await dbContext.Notifications.AnyAsync(n => 
                    n.UserId == notif.UserId && n.ListingId == listing.Id && n.Type == notif.Type);
                if (exists) continue;

                var entity = new Notification
                {
                    UserId = notif.UserId,
                    ListingId = listing.Id,
                    SavedSearchId = notif.SavedSearchId,
                    Type = notif.Type,
                    Title = notif.Title,
                    Message = notif.Message,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                };
                dbContext.Notifications.Add(entity);

                if (notif.SavedSearchId.HasValue)
                {
                    var search = await dbContext.SavedSearches.FindAsync(notif.SavedSearchId.Value);
                    if (search != null)
                    {
                        search.LastNotifiedAt = DateTime.UtcNow;
                    }
                }
            }

            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Smart Alerts for listing {ListingId}", listing.Id);
        }
    }

    public async Task OnPriceChangedAsync(Listing listing, decimal oldPrice)
    {
        if (listing.Status != "LIVE" || listing.Price >= oldPrice) return;

        try
        {
            var result = await _aiClient.GetSmartAlertsAsync(listing.Id, "PRICE_DROP", oldPrice);
            if (result == null || result.Notifications == null || result.Notifications.Count == 0) return;

            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            foreach (var notif in result.Notifications)
            {
                if (notif.UserId == listing.SellerId) continue;

                // Check if already exists
                var exists = await dbContext.Notifications.AnyAsync(n => 
                    n.UserId == notif.UserId && n.ListingId == listing.Id && n.Type == notif.Type);
                if (exists) continue;

                var entity = new Notification
                {
                    UserId = notif.UserId,
                    ListingId = listing.Id,
                    SavedSearchId = notif.SavedSearchId,
                    Type = notif.Type,
                    Title = notif.Title,
                    Message = notif.Message,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                };
                dbContext.Notifications.Add(entity);
            }

            _logger.LogInformation("[SmartAlert] price drop {OldPrice} -> {NewPrice} for listing {ListingId}, watchers={Watchers}", oldPrice, listing.Price, listing.Id, result.Notifications.Count(n => n.Type == "PRICE_DROP"));

            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing price drop alerts for listing {ListingId}", listing.Id);
        }
    }
}
