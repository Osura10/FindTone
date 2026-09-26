using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
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

    [HttpGet]
    public async Task<IActionResult> GetWishlist()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var items = await _db.WishlistItems
            .AsNoTracking()
            .Include(w => w.Listing)
            .ThenInclude(l => l.Images)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new
            {
                w.Id,
                w.ListingId,
                w.PriceWhenSaved,
                w.CreatedAt,
                Listing = new
                {
                    w.Listing.Title,
                    w.Listing.Brand,
                    w.Listing.Condition,
                    Price = w.Listing.Price,
                    FirstImageUrl = w.Listing.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
                    w.Listing.Status,
                    w.Listing.PriceVerdict
                }
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("{listingId:int}")]
    public async Task<IActionResult> AddToWishlist(int listingId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId);
        if (listing == null) return NotFound("Listing not found.");

        if (listing.SellerId == userId) return BadRequest("You cannot add your own listing to the wishlist.");
        if (listing.Status != "LIVE") return BadRequest("You can only add LIVE listings to the wishlist.");

        var exists = await _db.WishlistItems.AnyAsync(w => w.UserId == userId && w.ListingId == listingId);
        if (exists) return BadRequest("Listing is already in your wishlist.");

        var item = new WishlistItem
        {
            UserId = userId,
            ListingId = listingId,
            PriceWhenSaved = listing.Price,
            CreatedAt = DateTime.UtcNow
        };

        _db.WishlistItems.Add(item);
        await _db.SaveChangesAsync();

        return Ok(item);
    }

    [HttpDelete("{listingId:int}")]
    public async Task<IActionResult> RemoveFromWishlist(int listingId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var item = await _db.WishlistItems.FirstOrDefaultAsync(w => w.UserId == userId && w.ListingId == listingId);
        if (item == null) return NotFound();

        _db.WishlistItems.Remove(item);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
