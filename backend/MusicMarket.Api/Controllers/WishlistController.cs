using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Helpers;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WishlistController : ControllerBase
{
    private readonly AppDbContext _db;

    public WishlistController(AppDbContext db)
    {
        _db = db;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> GetWishlist()
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        // No trust score / price verdict here: those are only for the listing owner and admins.
        var items = await _db.WishlistItems
            .AsNoTracking()
            .Where(w => w.UserId == userId && w.Listing != null)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new
            {
                w.Id,
                w.ListingId,
                w.PriceWhenSaved,
                w.CreatedAt,
                Listing = new
                {
                    w.Listing!.Title,
                    w.Listing.Brand,
                    w.Listing.Condition,
                    w.Listing.Price,
                    FirstImageUrl = w.Listing.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
                    w.Listing.Status
                }
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("{listingId:int}")]
    public async Task<IActionResult> AddToWishlist(int listingId)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId);
        if (listing == null) return this.Error(404, "Listing not found.");

        if (listing.SellerId == userId) return this.Error(400, "You cannot add your own listing to the wishlist.");
        if (listing.Status != "LIVE") return this.Error(400, "You can only add LIVE listings to the wishlist.");

        var exists = await _db.WishlistItems.AnyAsync(w => w.UserId == userId && w.ListingId == listingId);
        if (exists) return this.Error(409, "Listing is already in your wishlist.");

        var item = new WishlistItem
        {
            UserId = userId.Value,
            ListingId = listingId,
            PriceWhenSaved = listing.Price,
            CreatedAt = DateTime.UtcNow
        };

        _db.WishlistItems.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new { item.Id, item.ListingId, item.PriceWhenSaved, item.CreatedAt });
    }

    [HttpDelete("{listingId:int}")]
    public async Task<IActionResult> RemoveFromWishlist(int listingId)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var item = await _db.WishlistItems.FirstOrDefaultAsync(w => w.UserId == userId && w.ListingId == listingId);
        if (item == null) return this.Error(404, "This listing is not in your wishlist.");

        _db.WishlistItems.Remove(item);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
