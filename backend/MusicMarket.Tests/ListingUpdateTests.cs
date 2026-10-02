using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MusicMarket.Api.Controllers;
using MusicMarket.Api.Dtos;

namespace MusicMarket.Tests;

public class ListingUpdateTests : IDisposable
{
    private readonly TestWorld _w = new();

    private ListingsController Controller(MusicMarket.Api.Models.User? user) =>
        _w.As(new ListingsController(_w.Db, _w.Services, _w.AiClient, _w.Checks(), _w.SmartAlerts(),
            NullLogger<ListingsController>.Instance), user);

    private static IFormFile FakeImage(string name = "new.jpg") =>
        new FormFile(new MemoryStream(Encoding.UTF8.GetBytes("fake")), 0, 4, "NewImages", name);

    [Fact]
    public async Task Patch_price_only_changes_price_adds_history_and_runs_fair_price_and_trust()
    {
        var listing = _w.AddListing(price: 100000m);
        _w.ReplyFairPrice();
        _w.ReplyTrust(90, "LIVE");
        _w.ReplyNoSmartAlerts();

        var result = await Controller(_w.Seller).UpdateListing(listing.Id, new UpdateListingDto { Price = 90000m });

        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(90000m, dto.Price);
        Assert.Equal("Yamaha F310 Acoustic", dto.Title);         // untouched
        Assert.Equal("Nice guitar", dto.Description);            // untouched
        Assert.Equal(2, dto.Images.Count);                       // untouched
        Assert.Equal(90, dto.TrustScore);
        var history = Assert.Single(dto.PriceHistories);
        Assert.Equal(100000m, history.OldPrice);
        Assert.Equal(90000m, history.NewPrice);

        Assert.Equal(1, _w.Ai.CountCalls("/api/agents/fair-price"));
        Assert.Equal(1, _w.Ai.CountCalls("/api/agents/trust-check"));
        // LIVE and the price went down -> PRICE_DROP event to Agent 03.
        Assert.Contains(_w.Ai.Calls, c => c.Path == "/api/agents/smart-alert" && c.Body.Contains("PRICE_DROP"));
    }

    [Fact]
    public async Task Patch_description_or_location_only_does_not_call_ai()
    {
        var listing = _w.AddListing();

        var result = await Controller(_w.Seller).UpdateListing(listing.Id,
            new UpdateListingDto { Description = "  Now with a hard case  ", Location = "Kandy" });

        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal("Now with a hard case", dto.Description);
        Assert.Equal("Kandy", dto.Location);
        Assert.Equal(100000m, dto.Price);
        Assert.Empty(_w.Ai.Calls);
    }

    [Fact]
    public async Task Patch_images_only_runs_trust_but_not_fair_price()
    {
        var listing = _w.AddListing(images: 2);
        _w.ReplyTrust(88, "LIVE");
        var firstImageId = listing.Images.OrderBy(i => i.SortOrder).First().Id;

        var result = await Controller(_w.Seller).UpdateListing(listing.Id, new UpdateListingDto
        {
            RemoveImageIds = [firstImageId],
            NewImages = [FakeImage()]
        });

        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(2, dto.Images.Count);
        Assert.DoesNotContain(dto.Images, i => i.Id == firstImageId);
        Assert.Equal(0, _w.Ai.CountCalls("/api/agents/fair-price"));
        Assert.Equal(1, _w.Ai.CountCalls("/api/agents/trust-check"));
    }

    [Fact]
    public async Task Patch_category_and_brand_are_normalized()
    {
        var listing = _w.AddListing();
        _w.ReplyFairPrice();
        _w.ReplyTrust();

        var result = await Controller(_w.Seller).UpdateListing(listing.Id, new UpdateListingDto
        {
            Category = "  electric    GUITAR ",   // known catalog category -> catalog spelling
            Brand = "rikhi   ram"                // unknown brand -> Title Case
        });

        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal("Electric Guitar", dto.Category);
        Assert.Equal("Rikhi Ram", dto.Brand);
        Assert.Equal(1, _w.Ai.CountCalls("/api/agents/fair-price"));
    }

    [Fact]
    public async Task Patch_removing_every_photo_is_rejected()
    {
        var listing = _w.AddListing(images: 1);
        var result = await Controller(_w.Seller).UpdateListing(listing.Id,
            new UpdateListingDto { RemoveImageIds = [listing.Images.Single().Id] });

        Assert.Equal("A listing must keep at least 1 photo.", TestWorld.ErrorMessage(result, 400));
    }

    [Fact]
    public async Task Patch_sold_listing_is_rejected()
    {
        var listing = _w.AddListing(status: "SOLD");
        var result = await Controller(_w.Seller).UpdateListing(listing.Id, new UpdateListingDto { Title = "New" });
        Assert.Equal("Sold items cannot be edited.", TestWorld.ErrorMessage(result, 400));
    }

    [Fact]
    public async Task Patch_by_another_user_is_forbidden_with_json_message()
    {
        var listing = _w.AddListing();
        var result = await Controller(_w.Watcher).UpdateListing(listing.Id, new UpdateListingDto { Title = "Hacked" });
        Assert.Equal("You can only edit your own listings.", TestWorld.ErrorMessage(result, 403));
    }

    [Fact]
    public async Task Admin_can_edit_any_listing()
    {
        var listing = _w.AddListing();
        var result = await Controller(_w.Admin).UpdateListing(listing.Id, new UpdateListingDto { Title = "Fixed title" });
        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal("Fixed title", dto.Title);
    }

    [Fact]
    public async Task Put_price_endpoint_reuses_the_same_logic()
    {
        var listing = _w.AddListing(price: 50000m);
        _w.ReplyFairPrice();
        _w.ReplyTrust();
        _w.ReplyNoSmartAlerts();

        var result = await Controller(_w.Seller).UpdatePrice(listing.Id, new UpdatePriceDto { NewPrice = 45000m });

        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(45000m, dto.Price);
        Assert.Single(dto.PriceHistories);
        Assert.Equal("Price must be greater than 0.",
            TestWorld.ErrorMessage(await Controller(_w.Seller).UpdatePrice(listing.Id, new UpdatePriceDto { NewPrice = 0 }), 400));
    }

    [Fact]
    public async Task Flagged_listing_that_passes_trust_after_edit_becomes_live_and_fires_new_match()
    {
        var listing = _w.AddListing(status: "FLAGGED", price: 250000m);
        _w.ReplyFairPrice();
        _w.ReplyTrust(90, "LIVE");
        _w.ReplyNoSmartAlerts();

        var result = await Controller(_w.Seller).UpdateListing(listing.Id, new UpdateListingDto { Price = 150000m });

        var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal("LIVE", dto.Status);
        Assert.Contains(_w.Ai.Calls, c => c.Path == "/api/agents/smart-alert" && c.Body.Contains("NEW_LISTING"));
    }

    [Fact]
    public async Task Admin_delete_cleans_rows_and_notifies_seller_but_not_when_ordered()
    {
        var listing = _w.AddListing();
        _w.Db.WishlistItems.Add(new MusicMarket.Api.Models.WishlistItem { UserId = _w.Watcher.Id, ListingId = listing.Id, PriceWhenSaved = 1 });
        _w.Db.Notifications.Add(new MusicMarket.Api.Models.Notification { UserId = _w.Watcher.Id, ListingId = listing.Id, Type = "NEW_MATCH", Title = "t", Message = "m" });
        _w.Db.SaveChanges();

        var ok = await Controller(_w.Admin).DeleteListing(listing.Id, "Fake photos");
        Assert.IsType<OkObjectResult>(ok);

        using var check = _w.NewContext();
        Assert.False(await check.Listings.AnyAsync(l => l.Id == listing.Id));
        Assert.False(await check.WishlistItems.AnyAsync(w => w.ListingId == listing.Id));
        var removed = await check.Notifications.SingleAsync(n => n.UserId == _w.Seller.Id);
        Assert.Equal("LISTING_REMOVED", removed.Type);
        Assert.Contains("Fake photos", removed.Message);

        var withOrder = _w.AddListing(status: "SOLD");
        _w.Db.Orders.Add(new MusicMarket.Api.Models.Order { ListingId = withOrder.Id, BuyerId = _w.Watcher.Id, SellerId = _w.Seller.Id, Amount = 1, PaymentMethod = "COD", Status = "CONFIRMED_COD" });
        _w.Db.SaveChanges();
        Assert.Equal("This listing has an order and cannot be deleted.",
            TestWorld.ErrorMessage(await Controller(_w.Admin).DeleteListing(withOrder.Id, null), 409));
    }

    public void Dispose() => _w.Dispose();
}
