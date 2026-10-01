using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Helpers;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>
    /// Newest 50 notifications. Shape: id, type, title, message, isRead, createdAt,
    /// listingId, savedSearchId, listing {id, title, price, firstImageUrl}.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                ListingId = n.ListingId,
                SavedSearchId = n.SavedSearchId,
                Listing = n.Listing == null ? null : new NotificationListingDto
                {
                    Id = n.Listing.Id,
                    Title = n.Listing.Title,
                    Price = n.Listing.Price,
                    FirstImageUrl = n.Listing.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault()
                }
            })
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var count = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { unreadCount = count });
    }

    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var notif = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notif == null) return this.Error(404, "Notification not found.");

        notif.IsRead = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Notification marked as read." });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var unread = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread)
        {
            n.IsRead = true;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Marked {unread.Count} notifications as read." });
    }
}
