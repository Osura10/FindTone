using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;
using MusicMarket.Api.Services;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CloudinaryDotNet.Cloudinary _cloudinary;

    private readonly AiServiceClient _ai;
    private readonly SmartAlertService _smartAlerts;

    public AdminController(AppDbContext db, CloudinaryDotNet.Cloudinary cloudinary, AiServiceClient ai, SmartAlertService smartAlerts)
    {
        _db = db;
        _cloudinary = cloudinary;
        _ai = ai;
        _smartAlerts = smartAlerts;
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
            return NotFound(new { message = "User not found" });
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
            return NotFound(new { message = "User not found" });
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
            return BadRequest(new { message = "Name, email, phone number, and NIC card number are all required." });
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var emailTaken = await _db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailTaken)
        {
            return Conflict(new { message = "An account with this email address already exists." });
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
            return NotFound("Listing not found");

        if (listing.Status != "FLAGGED" && listing.Status != "PENDING")
            return BadRequest("Listing is not in FLAGGED or PENDING status.");

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

    [HttpPost("listings/{id:int}/recheck")]
    public async Task<IActionResult> RecheckListing(int id)
    {
        var listing = await _db.Listings.Include(l => l.Images).FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null)
            return NotFound("Listing not found");

        var trustResult = await _ai.GetTrustCheckAsync(listing.Id);
        if (trustResult != null)
        {
            listing.TrustScore = trustResult.TrustScore;
            
            var detailedReason = trustResult.Reason;
            if (trustResult.Signals.Any())
            {
                detailedReason += "\n\nSignals:";
                foreach (var s in trustResult.Signals)
                {
                    detailedReason += $"\n- {s.Code} ({s.Points}): {s.Detail}";
                }
            }
            listing.AiReason = detailedReason;
            
            var oldStatus = listing.Status;
            if (listing.Status != "REJECTED" && listing.Status != "SOLD")
            {
                if (trustResult.Decision == "LIVE" || trustResult.Decision == "FLAGGED")
                {
                    listing.Status = trustResult.Decision;
                }
            }
            
            // Update image PHashes
            foreach (var imgHash in trustResult.ImageHashes)
            {
                var img = listing.Images.FirstOrDefault(i => i.Id == imgHash.ImageId);
                if (img != null && !string.IsNullOrEmpty(imgHash.PHash))
                {
                    img.PHash = imgHash.PHash;
                }
            }
            
            listing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            if (oldStatus != "LIVE" && listing.Status == "LIVE")
            {
                await _smartAlerts.OnListingBecameLiveAsync(listing);
            }

            return Ok(new { message = "Recheck successful", trustResult });
        }

        return StatusCode(503, "AI service failed to respond");
    }

    [HttpPost("listings/recheck-pending")]
    public async Task<IActionResult> RecheckPending()
    {
        var pendingListings = await _db.Listings.Include(l => l.Images).Where(l => l.Status == "PENDING").ToListAsync();
        int successCount = 0;
        
        foreach(var listing in pendingListings)
        {
            // 1. Fair Price
            var aiReqPriceUpdate = new FairPriceRequest
            {
                ListingId = listing.Id,
                Brand = listing.Brand,
                Model = listing.Model,
                Category = listing.Category,
                Condition = listing.Condition,
                Year = listing.Year,
                AskingPrice = (float)listing.Price,
                Description = listing.Description
            };
            
            var aiResultPriceUpdate = await _ai.GetFairPriceAsync(aiReqPriceUpdate);
            if (aiResultPriceUpdate != null)
            {
                listing.FairPrice = (decimal)aiResultPriceUpdate.FairPrice;
                listing.FairPriceMin = (decimal)aiResultPriceUpdate.FairRange.Min;
                listing.FairPriceMax = (decimal)aiResultPriceUpdate.FairRange.Max;
                listing.PriceVerdict = aiResultPriceUpdate.Verdict;
                listing.PriceDeviationPercent = aiResultPriceUpdate.DeviationPercent;
                listing.PriceConfidence = aiResultPriceUpdate.Confidence;
                listing.PriceExplanation = aiResultPriceUpdate.Explanation;
                listing.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            
            // 2. Trust Check
            var trustResult = await _ai.GetTrustCheckAsync(listing.Id);
            if (trustResult != null)
            {
                listing.TrustScore = trustResult.TrustScore;
                var detailedReason = trustResult.Reason;
                if (trustResult.Signals.Any())
                {
                    detailedReason += "\n\nSignals:";
                    foreach (var s in trustResult.Signals)
                    {
                        detailedReason += $"\n- {s.Code} ({s.Points}): {s.Detail}";
                    }
                }
                listing.AiReason = detailedReason;
                
                var oldStatus = listing.Status;
                if (listing.Status != "REJECTED" && listing.Status != "SOLD")
                {
                    if (trustResult.Decision == "LIVE" || trustResult.Decision == "FLAGGED")
                    {
                        listing.Status = trustResult.Decision;
                    }
                }
                
                var imageIds = trustResult.ImageHashes.Select(h => h.ImageId).ToList();
                if (imageIds.Any())
                {
                    var imagesToUpdate = await _db.ListingImages.Where(i => imageIds.Contains(i.Id)).ToListAsync();
                    foreach (var imgHash in trustResult.ImageHashes)
                    {
                        var img = imagesToUpdate.FirstOrDefault(i => i.Id == imgHash.ImageId);
                        if (img != null && !string.IsNullOrEmpty(imgHash.PHash))
                        {
                            img.PHash = imgHash.PHash;
                        }
                    }
                }
                
                listing.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                
                if (oldStatus != "LIVE" && listing.Status == "LIVE")
                {
                    await _smartAlerts.OnListingBecameLiveAsync(listing);
                }
                
                successCount++;
            }
            else
            {
                listing.AiReason = "AI check failed: Service unavailable or timed out. An admin can re-check this listing.";
                listing.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
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
            Console.WriteLine($"Failed to delete cloudinary image: {ex.Message}");
        }
    }
}
