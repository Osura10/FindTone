using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;
using MusicMarket.Api.Services;
using MusicMarket.Api.Constants;
using MusicMarket.Api.Helpers;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Admin)]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CloudinaryDotNet.Cloudinary _cloudinary;

    private readonly ListingCheckService _checks;
    private readonly SmartAlertService _smartAlerts;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AppDbContext db, CloudinaryDotNet.Cloudinary cloudinary, ListingCheckService checks,
        SmartAlertService smartAlerts, ILogger<AdminController> logger)
    {
        _db = db;
        _cloudinary = cloudinary;
        _checks = checks;
        _smartAlerts = smartAlerts;
        _logger = logger;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalBuyers = await _db.Users.CountAsync(u => u.Role.ToLower() == "buyer");
        var approvedShops = await _db.Users.CountAsync(u => u.Role.ToLower() == "shop" && u.Approval);
        var pendingShops = await _db.Users.CountAsync(u => u.Role.ToLower() == "shop" && !u.Approval);
        var approvedAdmins = await _db.Users.CountAsync(u => u.Role.ToLower() == "admin" && u.Approval);
        var pendingAdmins = await _db.Users.CountAsync(u => u.Role.ToLower() == "admin" && !u.Approval);
        var totalUsers = await _db.Users.CountAsync();
        var flaggedListings = await _db.Listings.CountAsync(l => l.Status == "FLAGGED" || l.Status == "PENDING");
        var pendingChecks = await _db.Listings.CountAsync(l => l.Status == "PENDING");

        return Ok(new
        {
            totalBuyers = totalBuyers,
            approvedShops = approvedShops,
            pendingShops = pendingShops,
            approvedAdmins = approvedAdmins,
            pendingAdmins = pendingAdmins,
            totalUsers = totalUsers,
            flaggedListings = flaggedListings,
            pendingChecks = pendingChecks
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] bool? approval)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var normalizedRole = role.Trim().ToLower();
            query = query.Where(u => u.Role.ToLower() == normalizedRole);
        }

        if (approval.HasValue)
        {
            query = query.Where(u => u.Approval == approval.Value);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.ToLower(),
                u.Approval,
                u.PhoneNumber,
                u.NicCardNumber,
                u.OwnerName,
                u.Address,
                u.ShopRegisterId,
                u.ProfileImageUrl,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("users/{id:int}/approval")]
    public async Task<IActionResult> UpdateApproval(int id, [FromBody] UpdateApprovalDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return this.Error(404, "User not found.");
        }

        user.Approval = dto.Approval;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"User approval status updated to {(dto.Approval ? "Approved" : "Pending")}",
            user.Id,
            user.Approval
        });
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return this.Error(404, "User not found.");
        }

        // Delete user's Cloudinary profile image if exists
        await DeleteCloudinaryImage(user.ProfileImageUrl);

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = "User deleted successfully", id });
    }

    [HttpPost("create-admin")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email) || 
            string.IsNullOrWhiteSpace(dto.PhoneNumber) || string.IsNullOrWhiteSpace(dto.NicCardNumber))
        {
            return this.Error(400, "Name, email, phone number, and NIC card number are all required.");
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var emailTaken = await _db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailTaken)
        {
            return this.Error(409, "An account with this email address already exists.");
        }

        var admin = new User
        {
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NicCardNumber.Trim()),
            Role = "admin",
            Approval = true,
            PhoneNumber = dto.PhoneNumber.Trim(),
            NicCardNumber = dto.NicCardNumber.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(admin);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            message = "Administrator created successfully. Default password is set to NIC number.",
            admin = new
            {
                admin.Id,
                admin.Name,
                admin.Email,
                Role = admin.Role.ToLower(),
                admin.Approval,
                admin.PhoneNumber,
                admin.NicCardNumber,
                admin.CreatedAt
            }
        });
    }

    public class ReviewListingDto
    {
        public bool Approve { get; set; }
        public string? Note { get; set; }
    }

    [HttpGet("listings/flagged")]
    public async Task<IActionResult> GetFlaggedListings()
    {
        var items = await _db.Listings
            .AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Images)
            .Where(l => l.Status == "FLAGGED" || l.Status == "PENDING")
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                l.Title,
                l.Brand,
                l.Model,
                l.Category,
                l.Price,
                FairPriceMin = l.FairPriceMin,
                FairPriceMax = l.FairPriceMax,
                PriceVerdict = l.PriceVerdict,
                TrustScore = l.TrustScore,
                AiReason = l.AiReason,
                SellerName = l.Seller != null ? l.Seller.Name : "",
                SellerId = l.SellerId,
                FirstImageUrl = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
                ImageUrls = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).ToList(),
                l.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPut("listings/{id:int}/review")]
    public async Task<IActionResult> ReviewListing(int id, [FromBody] ReviewListingDto dto)
    {
        var listing = await _db.Listings.FindAsync(id);
        if (listing == null)
            return this.Error(404, "Listing not found.");

        if (listing.Status != "FLAGGED" && listing.Status != "PENDING")
            return this.Error(400, "Listing is not in FLAGGED or PENDING status.");

        var oldStatus = listing.Status;
        listing.Status = dto.Approve ? "LIVE" : "REJECTED";
        if (!string.IsNullOrWhiteSpace(dto.Note))
        {
            listing.AiReason = (listing.AiReason ?? "") + $"\n\nAdmin: {dto.Note}";
        }
        listing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (oldStatus != "LIVE" && listing.Status == "LIVE")
        {
            await _smartAlerts.OnListingBecameLiveAsync(listing);
        }

        return Ok(new { message = "Listing reviewed successfully", Status = listing.Status });
    }

    /// <summary>
    /// Run Fair Price + Trust again for one listing.
    /// </summary>
    [HttpPost("listings/{id:int}/recheck")]
    public async Task<IActionResult> RecheckListing(int id)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null)
            return this.Error(404, "Listing not found.");

        var oldStatus = listing.Status;
        await _checks.RunFairPriceAsync(listing);
        var trustOk = await _checks.RunTrustCheckAsync(listing);
        if (!trustOk)
        {
            return this.Error(503, "AI service failed to respond. Please try again later.");
        }

        if (oldStatus != "LIVE" && listing.Status == "LIVE")
        {
            await _smartAlerts.OnListingBecameLiveAsync(listing);
        }

        return Ok(new
        {
            message = "Recheck successful",
            status = listing.Status,
            trustScore = listing.TrustScore,
            priceVerdict = listing.PriceVerdict,
            aiReason = listing.AiReason
        });
    }

    /// <summary>
    /// Run Fair Price + Trust again for every PENDING listing.
    /// </summary>
    [HttpPost("listings/recheck-pending")]
    public async Task<IActionResult> RecheckPending()
    {
        var pendingListings = await _db.Listings.Where(l => l.Status == "PENDING").ToListAsync();
        var successCount = 0;

        foreach (var listing in pendingListings)
        {
            await _checks.RunFairPriceAsync(listing);
            if (await _checks.RunTrustCheckAsync(listing))
            {
                successCount++;
                if (listing.Status == "LIVE")
                {
                    await _smartAlerts.OnListingBecameLiveAsync(listing);
                }
            }
        }

        return Ok(new { message = $"Rechecked {successCount} out of {pendingListings.Count} pending listings." });
    }

    private async Task DeleteCloudinaryImage(string? imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl)) return;

        try
        {
            var uri = new Uri(imageUrl);
            var segments = uri.AbsolutePath.Split('/');

            int index = Array.IndexOf(segments, "musicmarket");
            if (index != -1)
            {
                var relevantSegments = segments.Skip(index);
                var publicIdWithExtension = string.Join("/", relevantSegments);
                var publicId = System.IO.Path.ChangeExtension(publicIdWithExtension, null);
                publicId = publicId.Replace("\\", "/");

                await _cloudinary.DestroyAsync(new CloudinaryDotNet.Actions.DeletionParams(publicId));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete Cloudinary image {Url}", imageUrl);
        }
    }
}
