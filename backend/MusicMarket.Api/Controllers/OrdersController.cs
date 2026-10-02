using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Helpers;
using MusicMarket.Api.Models;
using MusicMarket.Api.Constants;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    // Demo payment only: this is the one card number that is accepted.
    public const string DemoCardNumber = "1234123412341234";

    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// POST /api/orders [Authorize]
    /// Buy a LIVE listing. Runs in one transaction: the listing becomes SOLD, the order is
    /// saved and both buyer and seller get a notification.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        if (User.FindFirstValue(ClaimTypes.Role) == Roles.Admin)
        {
            return this.Error(403, "Admin accounts cannot place orders.");
        }

        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return this.Error(401, "Please log in again.");
        }

        // Check required fields
        if (string.IsNullOrWhiteSpace(dto.FullName) ||
            string.IsNullOrWhiteSpace(dto.Phone) ||
            string.IsNullOrWhiteSpace(dto.AddressLine) ||
            string.IsNullOrWhiteSpace(dto.City) ||
            string.IsNullOrWhiteSpace(dto.PaymentMethod))
        {
            return this.Error(400, "Full name, phone, address, city and payment method are required.");
        }

        // Basic Sri Lankan phone check: 9-12 digits (e.g. 0712345678 or +94712345678).
        var phoneDigits = new string(dto.Phone.Where(char.IsDigit).ToArray());
        if (phoneDigits.Length < 9 || phoneDigits.Length > 12)
        {
            return this.Error(400, "Invalid Sri Lankan phone number.");
        }

        var paymentMethod = dto.PaymentMethod.Trim().ToUpperInvariant();
        string status;
        string? cardLast4 = null;

        if (paymentMethod == "CARD")
        {
            if (dto.Card == null) return this.Error(400, "Card details are required for CARD payment method.");

            var cleanedNumber = (dto.Card.Number ?? "").Replace(" ", "").Replace("-", "");
            if (cleanedNumber != DemoCardNumber)
            {
                return this.Error(400, "Invalid demo card number. Use 1234 1234 1234 1234.");
            }

            if (string.IsNullOrWhiteSpace(dto.Card.HolderName))
            {
                return this.Error(400, "Card holder name is required.");
            }

            var cvv = (dto.Card.Cvv ?? "").Trim();
            if (cvv.Length != 3 || !cvv.All(char.IsDigit))
            {
                return this.Error(400, "Invalid CVV. It must be 3 digits.");
            }

            var expiryParts = (dto.Card.Expiry ?? "").Split('/');
            if (expiryParts.Length != 2 ||
                !int.TryParse(expiryParts[0], out var month) ||
                !int.TryParse(expiryParts[1], out var yearPart) ||
                month < 1 || month > 12)
            {
                return this.Error(400, "Invalid expiry. Use MM/YY.");
            }

            var year = yearPart < 100 ? 2000 + yearPart : yearPart;
            var now = DateTime.Now;
            if (year < now.Year || (year == now.Year && month < now.Month))
            {
                return this.Error(400, "Card expired.");
            }

            status = "PAID";
            // Never store the full card number or CVV, only the last 4 digits.
            cardLast4 = cleanedNumber[^4..];
        }
        else if (paymentMethod == "COD")
        {
            status = "CONFIRMED_COD";
        }
        else
        {
            return this.Error(400, "Invalid payment method. Use CARD or COD.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var listing = await _db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == dto.ListingId);
        if (listing == null)
        {
            return this.Error(404, "Listing not found.");
        }

        if (listing.SellerId == userId)
        {
            return this.Error(403, "You cannot buy your own listing.");
        }

        if (listing.Status == "SOLD")
        {
            return this.Error(409, "This item has already been sold.");
        }

        if (listing.Status != "LIVE")
        {
            return this.Error(409, "This listing is not available for purchase.");
        }

        // Atomic "LIVE -> SOLD": if two buyers click at the same time, only one UPDATE matches.
        var soldAt = DateTime.UtcNow;
        var updated = await _db.Listings
            .Where(l => l.Id == listing.Id && l.Status == "LIVE")
            .ExecuteUpdateAsync(s => s
                .SetProperty(l => l.Status, "SOLD")
                .SetProperty(l => l.SoldPrice, l => l.Price)
                .SetProperty(l => l.SoldAt, soldAt)
                .SetProperty(l => l.UpdatedAt, soldAt));
        if (updated == 0)
        {
            await transaction.RollbackAsync();
            return this.Error(409, "This item has already been sold.");
        }

        var order = new Order
        {
            ListingId = listing.Id,
            BuyerId = userId,
            SellerId = listing.SellerId,
            Amount = listing.Price,
            PaymentMethod = paymentMethod,
            Status = status,
            FullName = dto.FullName.Trim(),
            Phone = dto.Phone.Trim(),
            AddressLine = dto.AddressLine.Trim(),
            City = dto.City.Trim(),
            PostalCode = TextNormalizer.CleanOrNull(dto.PostalCode),
            Notes = TextNormalizer.CleanOrNull(dto.Notes),
            CardLast4 = cardLast4,
            CreatedAt = soldAt
        };
        _db.Orders.Add(order);

        _db.Notifications.Add(new Notification
        {
            UserId = listing.SellerId,
            Type = "ITEM_SOLD",
            Title = "Item Sold",
            Message = $"Your {listing.Title} was sold for LKR {listing.Price:N0}.",
            ListingId = listing.Id,
            CreatedAt = soldAt
        });

        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = "ORDER_PLACED",
            Title = "Order Placed",
            Message = $"Your order for {listing.Title} (LKR {listing.Price:N0}) was successful.",
            ListingId = listing.Id,
            CreatedAt = soldAt
        });

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "Order placed successfully", orderId = order.Id, status });
    }

    /// <summary>
    /// GET /api/orders/mine
    /// Get my purchases
    /// </summary>
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMyPurchases()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return this.Error(401, "Please log in again.");
        }

        return Ok(await LoadOrdersAsync(o => o.BuyerId == userId));
    }

    /// <summary>
    /// GET /api/orders/sales
    /// Orders for items I sold. Buyers can sell too, so this is open to any logged-in user.
    /// </summary>
    [HttpGet("sales")]
    [Authorize]
    public async Task<IActionResult> GetMySales()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return this.Error(401, "Please log in again.");
        }

        return Ok(await LoadOrdersAsync(o => o.SellerId == userId));
    }

    private async Task<List<OrderDto>> LoadOrdersAsync(System.Linq.Expressions.Expression<Func<Order, bool>> filter)
    {
        var orders = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Listing!)
            .ThenInclude(l => l.Images)
            .Where(filter)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(o => new OrderDto
        {
            Id = o.Id,
            ListingId = o.ListingId,
            ListingTitle = o.Listing?.Title ?? "Unknown Listing",
            ListingImage = o.Listing?.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url,
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
        }).ToList();
    }
}
