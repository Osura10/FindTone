using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Controllers;
using MusicMarket.Api.Dtos;

namespace MusicMarket.Tests;

public class SmartAlertTests : IDisposable
{
    private readonly TestWorld _w = new();

    private void ReplyPriceDropFor(int userId)
    {
        _w.Ai.Replies["/api/agents/smart-alert"] = body =>
        {
            var old = JsonDocument.Parse(body).RootElement.GetProperty("old_price").GetDecimal();
            return new
            {
                listing_id = 0,
                @event = "PRICE_DROP",
                notifications = new[]
                {
                    new { user_id = userId, saved_search_id = (int?)null, type = "PRICE_DROP", title = "Price Drop: Yamaha F310", message = $"Dropped from LKR {old:N0}" }
                },
                matched_search_ids = Array.Empty<int>(),
                used_fallback = false
            };
        };
    }

    [Fact]
    public async Task Every_price_drop_updates_the_same_notification_in_place()
    {
        var listing = _w.AddListing(price: 90000m);
        ReplyPriceDropFor(_w.Watcher.Id);
        var service = _w.SmartAlerts();

        await service.OnPriceChangedAsync(listing, 100000m);

        using (var db = _w.NewContext())
        {
            var first = await db.Notifications.SingleAsync();
            Assert.Contains("100,000", first.Message);
            first.IsRead = true;                 // the user reads it
            first.CreatedAt = DateTime.UtcNow.AddHours(-1);
            await db.SaveChangesAsync();
        }

        listing.Price = 80000m;
        await service.OnPriceChangedAsync(listing, 90000m);

        using (var db = _w.NewContext())
        {
            var row = await db.Notifications.SingleAsync();       // still one row (unique index)
            Assert.Equal("PRICE_DROP", row.Type);
            Assert.Contains("90,000", row.Message);               // newest text
            Assert.False(row.IsRead);                              // unread again
            Assert.True(row.CreatedAt > DateTime.UtcNow.AddMinutes(-5)); // moved to the top
        }
        Assert.Equal(2, _w.Ai.CountCalls("/api/agents/smart-alert"));
    }

    [Fact]
    public async Task Seller_is_never_notified_about_own_listing()
    {
        var listing = _w.AddListing(price: 90000m);
        ReplyPriceDropFor(_w.Seller.Id);

        await _w.SmartAlerts().OnPriceChangedAsync(listing, 100000m);

        using var db = _w.NewContext();
        Assert.False(await db.Notifications.AnyAsync());
    }

    [Fact]
    public async Task Price_increase_does_not_notify()
    {
        var listing = _w.AddListing(price: 120000m);
        ReplyPriceDropFor(_w.Watcher.Id);
        await _w.SmartAlerts().OnPriceChangedAsync(listing, 100000m);
        Assert.Empty(_w.Ai.Calls);
    }

    [Fact]
    public async Task Creating_an_alert_cleans_blank_fields_and_backfills_existing_listings()
    {
        var match = _w.AddListing();
        _w.Ai.Replies["/api/agents/smart-alert/backfill"] = body =>
        {
            var id = JsonDocument.Parse(body).RootElement.GetProperty("saved_search_id").GetInt32();
            return new
            {
                saved_search_id = id,
                checked_listings = 1,
                notifications = new[]
                {
                    new { user_id = _w.Watcher.Id, saved_search_id = id, listing_id = match.Id, type = "NEW_MATCH", title = "New Match: Yamaha F310", message = "matches" }
                }
            };
        };
        var controller = _w.As(new AlertsController(_w.Db, _w.AiClient, _w.SmartAlerts()), _w.Watcher);

        var result = await controller.CreateAlert(new CreateSavedSearchDto
        {
            Name = "",
            Category = "",
            Brand = "  yamaha ",
            ModelKeyword = " ",
            Conditions = "Good, ,GOOD",
            Location = "",
            MaxPrice = 150000m
        });

        var dto = Assert.IsType<AlertDto>(Assert.IsType<CreatedAtActionResult>(result).Value);
        Assert.Null(dto.Category);
        Assert.Null(dto.ModelKeyword);
        Assert.Null(dto.Location);
        Assert.Equal("Yamaha", dto.Brand);
        Assert.Equal("good", dto.Conditions);
        Assert.Equal("Yamaha", dto.Name);
        Assert.Equal(1, dto.NewMatches);

        using var db = _w.NewContext();
        var n = await db.Notifications.SingleAsync();
        Assert.Equal(("NEW_MATCH", match.Id, _w.Watcher.Id), (n.Type, n.ListingId!.Value, n.UserId));
    }

    [Fact]
    public async Task Alert_with_only_blank_fields_is_rejected()
    {
        var controller = _w.As(new AlertsController(_w.Db, _w.AiClient, _w.SmartAlerts()), _w.Watcher);
        var result = await controller.CreateAlert(new CreateSavedSearchDto { Name = "x", Category = "", Brand = " ", QueryText = "anything" });
        Assert.StartsWith("At least one filter must be set", TestWorld.ErrorMessage(result, 400));
    }

    [Fact]
    public async Task Parse_accepts_text_and_legacy_query_field()
    {
        _w.Ai.Replies["/api/agents/parse-alert"] = body => new { name = "x", brand = "Yamaha", used_fallback = false };
        var controller = _w.As(new AlertsController(_w.Db, _w.AiClient, _w.SmartAlerts()), _w.Watcher);

        Assert.IsType<OkObjectResult>(await controller.ParseAlert(new AlertsController.ParseAlertTextDto { Text = "yamaha" }));
        Assert.IsType<OkObjectResult>(await controller.ParseAlert(new AlertsController.ParseAlertTextDto { Query = "yamaha" }));
        Assert.Equal("Text is required.", TestWorld.ErrorMessage(await controller.ParseAlert(new AlertsController.ParseAlertTextDto()), 400));
    }

    public void Dispose() => _w.Dispose();
}
