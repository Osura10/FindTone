using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;
using MusicMarket.Api.Constants;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// POST /api/orders [Authorize]
    /// Create a new order (Buying flow)
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == Roles.Admin)
        {
            return StatusCode(403, new { message = "Admin accounts cannot place orders." });
        }

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
        {
            return StatusCode(401, new { message = "Please log in again." });
        }

        // Check required fields
        if (string.IsNullOrWhiteSpace(dto.FullName) ||
            string.IsNullOrWhiteSpace(dto.Phone) ||
            string.IsNullOrWhiteSpace(dto.AddressLine) ||
            string.IsNullOrWhiteSpace(dto.City) ||
            string.IsNullOrWhiteSpace(dto.PaymentMethod))
        {
            return BadRequest("Required fields are missing.");
        }

        // Validate Phone (basic Sri Lankan check e.g. starts with 0 and length 10 or similar, but just checking it's not empty and basic structure for now)
        if (dto.Phone.Length < 9)
        {
            return BadRequest("Invalid Sri Lankan phone number.");
        }

        string status = "";
        string? cardLast4 = null;

        if (dto.PaymentMethod == "CARD")
        {
            if (dto.Card == null) return BadRequest("Card details are required for CARD payment method.");
            
            var cleanedNumber = dto.Card.Number.Replace(" ", "").Replace("-", "");
            if (cleanedNumber != "1234123412341234")
            {
                return BadRequest("Invalid demo card number.");
            }

            if (string.IsNullOrWhiteSpace(dto.Card.HolderName))
            {
                return BadRequest("Card holder name is required.");
            }
            
            if (dto.Card.Cvv.Length != 3 || !int.TryParse(dto.Card.Cvv, out _))
            {
                return BadRequest("Invalid CVV.");
            }

            var expiryParts = dto.Card.Expiry.Split('/');
            if (expiryParts.Length != 2 || !int.TryParse(expiryParts[0], out int month) || !int.TryParse(expiryParts[1], out int yearPart))
            {
                return BadRequest("Invalid expiry format.");
            }
            
            int year = yearPart < 100 ? 2000 + yearPart : yearPart;
            
            // Check if future month
            var now = DateTime.Now;
            var currentMonth = now.Month;
            var currentYear = now.Year;
            
            if (year < currentYear || (year == currentYear && month < currentMonth))
            {
                return BadRequest("Card expired.");
            }

            status = "PAID";
            cardLast4 = "1234";
        }
        else if (dto.PaymentMethod == "COD")
        {
            status = "CONFIRMED_COD";
        }
        else
        {
            return BadRequest("Invalid payment method.");
        }

        // Start Transaction
        using var transaction = await _db.Database.BeginTransactionAsync();

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == dto.ListingId);
        
        if (listing == null)
        {
            return NotFound("Listing not found.");
        }
        
        if (listing.SellerId == userId)
        {
            return StatusCode(403, new { message = "You cannot buy your own listing." });
        }

        if (listing.Status != "LIVE")
        {
            return StatusCode(409, "This item has just been sold");
        }

        // Update listing
        listing.Status = "SOLD";
        listing.SoldPrice = listing.Price;
        listing.SoldAt = DateTime.UtcNow;

        var order = new Order
        {
            ListingId = listing.Id,
            BuyerId = userId,
            SellerId = listing.SellerId,
            Amount = listing.Price,
            PaymentMethod = dto.PaymentMethod,
            Status = status,
            FullName = dto.FullName,
            Phone = dto.Phone,
            AddressLine = dto.AddressLine,
            City = dto.City,
            PostalCode = dto.PostalCode,
            Notes = dto.Notes,
            CardLast4 = cardLast4,
            CreatedAt = DateTime.UtcNow
        };

        _db.Orders.Add(order);
        
        // Notifications
        _db.Notifications.Add(new Notification
        {
            UserId = listing.SellerId,
            Type = "ITEM_SOLD",
            Title = "Item Sold",
            Message = $"Your {listing.Title} was sold for LKR {listing.Price}.",
            ListingId = listing.Id,
            CreatedAt = DateTime.UtcNow
        });

        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = "ORDER_PLACED",
            Title = "Order Placed",
            Message = $"Your order for {listing.Title} was successful.",
            ListingId = listing.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "Order placed successfully", orderId = order.Id });
    }

    /// <summary>
    /// GET /api/orders/mine
    /// Get my purchases
    /// </summary>
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMyPurchases()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var orders = await _db.Orders
            .Include(o => o.Listing)
            .ThenInclude(l => l.Images)
            .Where(o => o.BuyerId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var dtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            ListingId = o.ListingId,
            ListingTitle = o.Listing?.Title ?? "Unknown Listing",
            ListingImage = o.Listing?.Images.FirstOrDefault()?.Url,
            Amount = o.Amount,
            PaymentMethod = o.PaymentMethod,
            Status = o.Status,
            FullName = o.FullName,
            Phone = o.Phone,
            AddressLine = o.AddressLine,
            City = o.City,
            PostalCode = o.PostalCode,
            Notes = o.Notes,
            CardLast4 = o.CardLast4,
            CreatedAt = o.CreatedAt
        });

        return Ok(dtos);
    }

    /// <summary>
    /// GET /api/orders/sales
    /// Get my sales
    /// </summary>
    [HttpGet("sales")]
    [Authorize]
    public async Task<IActionResult> GetMySales()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role != "shop")
        {
            return Forbid();
        }

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var orders = await _db.Orders
            .Include(o => o.Listing)
            .ThenInclude(l => l.Images)
            .Where(o => o.SellerId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var dtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            ListingId = o.ListingId,
            ListingTitle = o.Listing?.Title ?? "Unknown Listing",
            ListingImage = o.Listing?.Images.FirstOrDefault()?.Url,
            Amount = o.Amount,
            PaymentMethod = o.PaymentMethod,
            Status = o.Status,
            FullName = o.FullName,
            Phone = o.Phone,
            AddressLine = o.AddressLine,
            City = o.City,
            PostalCode = o.PostalCode,
            Notes = o.Notes,
            CardLast4 = o.CardLast4,
            CreatedAt = o.CreatedAt
        });

        return Ok(dtos);
    }
}
