using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Constants;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Helpers;
using MusicMarket.Api.Models;
using MusicMarket.Api.Services;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ListingsController : ControllerBase
{
    private const int MaxImages = 6;
    private const long MaxImageBytes = 5 * 1024 * 1024;

    private readonly AppDbContext _db;
    private readonly Cloudinary? _cloudinary;
    private readonly AiServiceClient _ai;
    private readonly ListingCheckService _checks;
    private readonly SmartAlertService _smartAlerts;
    private readonly ILogger<ListingsController> _logger;

    private static readonly HashSet<string> AllowedConditions = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "like_new", "excellent", "good", "fair", "poor", "for_parts"
    };
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    public ListingsController(AppDbContext db, IServiceProvider serviceProvider, AiServiceClient ai,
        ListingCheckService checks, SmartAlertService smartAlerts, ILogger<ListingsController> logger)
    {
        _db = db;
        _cloudinary = serviceProvider.GetService<Cloudinary>();
        _ai = ai;
        _checks = checks;
        _smartAlerts = smartAlerts;
        _logger = logger;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private bool IsAdmin => User.FindFirstValue(ClaimTypes.Role) == Roles.Admin;

    /// <summary>
    /// 1. Create a new listing with 1 to 6 photos uploaded to Cloudinary.
    /// </summary>
    [HttpPost]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateListing([FromForm] CreateListingDto dto)
    {
        var sellerId = CurrentUserId;
        if (sellerId == null) return this.Error(401, "Invalid user token.");
        if (IsAdmin) return this.Error(403, "Admin accounts cannot create listings.");

        if (string.IsNullOrWhiteSpace(dto.Title)) return this.Error(400, "Title is required.");
        if (string.IsNullOrWhiteSpace(dto.Category)) return this.Error(400, "Category is required.");
        if (string.IsNullOrWhiteSpace(dto.Brand)) return this.Error(400, "Brand is required.");
        if (string.IsNullOrWhiteSpace(dto.Model)) return this.Error(400, "Model is required.");
        if (string.IsNullOrWhiteSpace(dto.Location)) return this.Error(400, "Location is required.");
        if (dto.Price <= 0) return this.Error(400, "Price must be greater than 0.");

        var coordError = ValidateCoordinates(dto.Latitude, dto.Longitude);
        if (coordError != null) return this.Error(400, coordError);

        var condition = dto.Condition?.Trim().ToLowerInvariant() ?? "";
        if (!AllowedConditions.Contains(condition))
        {
            return this.Error(400, $"Invalid condition '{dto.Condition}'. Allowed values: new, like_new, excellent, good, fair, poor, for_parts.");
        }

        var yearError = ValidateYear(dto.Year);
        if (yearError != null) return this.Error(400, yearError);

        if (dto.Images == null || dto.Images.Count == 0) return this.Error(400, "At least 1 image is required.");
        if (dto.Images.Count > MaxImages) return this.Error(400, $"Maximum of {MaxImages} images allowed per listing.");
        var imageError = ValidateImageFiles(dto.Images);
        if (imageError != null) return this.Error(400, imageError);

        var (knownCategories, knownBrands) = await LoadKnownNamesAsync();
        var listing = new Listing
        {
            SellerId = sellerId.Value,
            Title = TextNormalizer.CleanOrNull(dto.Title)!,
            Category = TextNormalizer.NormalizeName(dto.Category, knownCategories),
            Brand = TextNormalizer.NormalizeName(dto.Brand, knownBrands),
            Model = TextNormalizer.CleanOrNull(dto.Model)!,
            Condition = condition,
            Year = dto.Year,
            ListingType = string.IsNullOrWhiteSpace(dto.ListingType) ? "Sell" : dto.ListingType.Trim(),
            Price = dto.Price,
            Location = TextNormalizer.CleanOrNull(dto.Location)!,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Description = dto.Description?.Trim() ?? "",
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Listings.Add(listing);
        await _db.SaveChangesAsync();

        var (uploaded, uploadError) = await UploadImagesAsync(listing.Id, dto.Images, 0);
        if (uploadError != null)
        {
            // Do not leave a listing without photos behind.
            _db.Listings.Remove(listing);
            await _db.SaveChangesAsync();
            return this.Error(502, uploadError);
        }
        _db.ListingImages.AddRange(uploaded);
        await _db.SaveChangesAsync();

        // Agent 01 + Agent 02 decide LIVE / FLAGGED / PENDING, then alerts run if it went LIVE.
        await RunChecksAndAlertsAsync(listing, runFairPrice: true, runTrust: true, wasLive: false, oldPrice: listing.Price);

        var result = await LoadDetailAsync(listing.Id, includeInternals: true);
        return CreatedAtAction(nameof(GetListingById), new { id = listing.Id }, result);
    }

    /// <summary>
    /// 2. Marketplace search. The public only sees LIVE and SOLD listings, without AI internals.
    /// Admins may filter by any status and also get the AI fields.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetListings(
        [FromQuery] string? q,
        [FromQuery] string? category,
        [FromQuery] string? brand,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? condition,
        [FromQuery] string? status = "LIVE",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 12;
        if (pageSize > 50) pageSize = 50;

        var isAdmin = IsAdmin;
        var query = _db.Listings.AsNoTracking().AsQueryable();

        // Only admins can look at PENDING / FLAGGED / REJECTED listings here.
        if (isAdmin && !string.IsNullOrWhiteSpace(status) && !status.Equals("LIVE", StringComparison.OrdinalIgnoreCase))
        {
            if (!status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var wanted = status.Trim().ToUpperInvariant();
                query = query.Where(l => l.Status == wanted);
            }
        }
        else
        {
            query = query.Where(l => l.Status == "LIVE" || l.Status == "SOLD");
        }

        var term = TextNormalizer.CleanOrNull(q)?.ToLower();
        if (term != null)
        {
            query = query.Where(l =>
                l.Title.ToLower().Contains(term) ||
                l.Brand.ToLower().Contains(term) ||
                l.Model.ToLower().Contains(term) ||
                l.Category.ToLower().Contains(term));
        }

        var categoryFilter = TextNormalizer.CleanOrNull(category)?.ToLower();
        if (categoryFilter != null) query = query.Where(l => l.Category.ToLower() == categoryFilter);

        var brandFilter = TextNormalizer.CleanOrNull(brand)?.ToLower();
        if (brandFilter != null) query = query.Where(l => l.Brand.ToLower() == brandFilter);

        if (minPrice.HasValue) query = query.Where(l => l.Price >= minPrice.Value);
        if (maxPrice.HasValue) query = query.Where(l => l.Price <= maxPrice.Value);

        var conditionFilter = TextNormalizer.CleanOrNull(condition)?.ToLower();
        if (conditionFilter != null) query = query.Where(l => l.Condition.ToLower() == conditionFilter);

        var totalCount = await query.CountAsync();

        // "LIVE" sorts before "SOLD", so available items come first.
        var ordered = query
            .OrderBy(l => l.Status)
            .ThenByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize);

        if (isAdmin)
        {
            var adminItems = await ordered.Select(ListingMapper.ToOwnerSummary).ToListAsync();
            return Ok(new PagedResult<ListingSummaryDto> { Items = adminItems, TotalCount = totalCount, Page = page, PageSize = pageSize });
        }

        var items = await ordered.Select(ListingMapper.ToPublicSummary).ToListAsync();
        return Ok(new PagedResult<PublicListingSummaryDto> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize });
    }

    /// <summary>
    /// 3. Listing details. The owner and admins get the AI fields (trust score, fair price, reason);
    /// everyone else gets the public view, and only for LIVE or SOLD listings.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetListingById(int id)
    {
        var listing = await _db.Listings
            .AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Images)
            .Include(l => l.PriceHistories)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (listing == null) return this.Error(404, $"Listing #{id} not found.");

        var userId = CurrentUserId;
        var privileged = IsAdmin || (userId != null && userId == listing.SellerId);
        if (!privileged && listing.Status is not ("LIVE" or "SOLD"))
        {
            return this.Error(404, $"Listing #{id} not found.");
        }

        // The seller's phone is only shown to logged-in users.
        return Ok(ListingMapper.ToDetail(listing, privileged, showPhone: userId != null));
    }

    /// <summary>
    /// 3b. Delete a listing (owner or admin). Listings with an order cannot be deleted.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteListing(int id, [FromQuery] string? reason = null)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Invalid user token.");

        var listing = await _db.Listings.Include(l => l.Images).FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return this.Error(404, $"Listing #{id} not found.");

        var isAdmin = IsAdmin;
        if (listing.SellerId != userId && !isAdmin) return this.Error(403, "You can only delete your own listings.");

        if (await _db.Orders.AnyAsync(o => o.ListingId == id))
        {
            return this.Error(409, "This listing has an order and cannot be deleted.");
        }

        // Clean up rows that point at this listing.
        var wishlistItems = await _db.WishlistItems.Where(w => w.ListingId == id).ToListAsync();
        _db.WishlistItems.RemoveRange(wishlistItems);

        var notifications = await _db.Notifications.Where(n => n.ListingId == id).ToListAsync();
        _db.Notifications.RemoveRange(notifications);

        // Tell the seller when an admin removes their listing.
        if (isAdmin && listing.SellerId != userId)
        {
            var why = TextNormalizer.CleanOrNull(reason) ?? "No reason provided.";
            _db.Notifications.Add(new Notification
            {
                UserId = listing.SellerId,
                ListingId = null,
                Type = "LISTING_REMOVED",
                Title = "Listing removed",
                Message = $"Your listing '{listing.Title}' was removed by an admin. Reason: {why}",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            });
        }

        var images = listing.Images.ToList();
        _db.Listings.Remove(listing);
        await _db.SaveChangesAsync();

        // Remove photos from Cloudinary only after the database delete worked.
        await DeleteFromCloudinaryAsync(images);

        return Ok(new { message = "Listing deleted successfully" });
    }

    /// <summary>
    /// 4. The current user's listings (any status) with the AI fields.
    /// </summary>
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMyListings()
    {
        var sellerId = CurrentUserId;
        if (sellerId == null) return this.Error(401, "Invalid user token.");

        var items = await _db.Listings
            .AsNoTracking()
            .Where(l => l.SellerId == sellerId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(ListingMapper.ToOwnerSummary)
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// 5. Edit a listing (owner or admin). Multipart form; every field is optional and only the
    /// fields that are sent are changed. SOLD listings cannot be edited.
    /// </summary>
    [HttpPatch("{id:int}")]
    [HttpPut("{id:int}")]
    [Authorize]
    public Task<IActionResult> UpdateListing(int id, [FromForm] UpdateListingDto dto) => ApplyUpdateAsync(id, dto);

    /// <summary>
    /// 5b. Change only the price (JSON {"newPrice": 123}). Same rules as the edit endpoint.
    /// </summary>
    [HttpPut("{id:int}/price")]
    [Authorize]
    public Task<IActionResult> UpdatePrice(int id, [FromBody] UpdatePriceDto dto) =>
        ApplyUpdateAsync(id, new UpdateListingDto { Price = dto.NewPrice });

    /// <summary>
    /// 6. Price-check without saving — calls AI and returns result immediately.
    /// </summary>
    [HttpPost("price-check")]
    [Authorize]
    public async Task<IActionResult> PriceCheck([FromBody] PriceCheckDto dto)
    {
        var aiReq = new FairPriceRequest
        {
            Brand = dto.Brand ?? "",
            Model = dto.Model ?? "",
            Category = dto.Category ?? "",
            Condition = dto.Condition ?? "",
            Year = dto.Year,
            AskingPrice = (float)dto.Price,
            Description = dto.Description ?? ""
        };

        var result = await _ai.GetFairPriceAsync(aiReq);
        if (result == null)
        {
            return this.Error(503, "Price check is unavailable right now. Please try again later.");
        }

        return Ok(result);
    }

    /// <summary>
    /// 7. List CatalogModels with optional category filter (used for suggestions).
    /// </summary>
    [HttpGet("/api/catalog")]
    public async Task<IActionResult> GetCatalog([FromQuery] string? category)
    {
        var query = _db.CatalogModels.AsNoTracking().AsQueryable();

        var categoryFilter = TextNormalizer.CleanOrNull(category)?.ToLower();
        if (categoryFilter != null)
        {
            query = query.Where(c => c.Category.ToLower() == categoryFilter);
        }

        var items = await query
            .OrderBy(c => c.Category)
            .ThenBy(c => c.Brand)
            .ThenBy(c => c.Model)
            .Select(c => new CatalogModelDto
            {
                Id = c.Id,
                Brand = c.Brand,
                Model = c.Model,
                Category = c.Category,
                Tier = c.Tier,
                NewPriceLkr = c.NewPriceLkr,
                ReleaseYear = c.ReleaseYear,
                IsCollectible = c.IsCollectible
            })
            .ToListAsync();

        return Ok(items);
    }

    // ── Edit logic shared by PATCH/PUT /{id} and PUT /{id}/price ─────────────────────────

    private async Task<IActionResult> ApplyUpdateAsync(int id, UpdateListingDto dto)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Invalid user token.");

        var listing = await _db.Listings.Include(l => l.Images).FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return this.Error(404, $"Listing #{id} not found.");
        if (listing.SellerId != userId && !IsAdmin) return this.Error(403, "You can only edit your own listings.");
        if (listing.Status == "SOLD") return this.Error(400, "Sold items cannot be edited.");

        // 1. Validate only the fields that were sent.
        if (dto.Title != null && string.IsNullOrWhiteSpace(dto.Title)) return this.Error(400, "Title cannot be empty.");
        if (dto.Category != null && string.IsNullOrWhiteSpace(dto.Category)) return this.Error(400, "Category cannot be empty.");
        if (dto.Brand != null && string.IsNullOrWhiteSpace(dto.Brand)) return this.Error(400, "Brand cannot be empty.");
        if (dto.Model != null && string.IsNullOrWhiteSpace(dto.Model)) return this.Error(400, "Model cannot be empty.");
        if (dto.Location != null && string.IsNullOrWhiteSpace(dto.Location)) return this.Error(400, "Location cannot be empty.");
        if (dto.Price.HasValue && dto.Price.Value <= 0) return this.Error(400, "Price must be greater than 0.");

        string? condition = null;
        if (dto.Condition != null)
        {
            condition = dto.Condition.Trim().ToLowerInvariant();
            if (!AllowedConditions.Contains(condition))
            {
                return this.Error(400, $"Invalid condition '{dto.Condition}'. Allowed values: new, like_new, excellent, good, fair, poor, for_parts.");
            }
        }

        var yearError = ValidateYear(dto.Year);
        if (yearError != null) return this.Error(400, yearError);

        if (dto.Latitude.HasValue || dto.Longitude.HasValue)
        {
            var coordError = ValidateCoordinates(dto.Latitude, dto.Longitude);
            if (coordError != null) return this.Error(400, coordError);
        }

        // 2. Work out which photos are removed and check the final photo count.
        var removeIds = new HashSet<int>(dto.RemoveImageIds ?? []);
        if (dto.ExistingImageIds is { Count: > 0 })
        {
            foreach (var img in listing.Images.Where(i => !dto.ExistingImageIds.Contains(i.Id)))
            {
                removeIds.Add(img.Id);
            }
        }
        var unknownId = removeIds.FirstOrDefault(rid => listing.Images.All(i => i.Id != rid));
        if (unknownId != 0) return this.Error(400, $"Image #{unknownId} does not belong to this listing.");

        var newFiles = dto.NewImages ?? [];
        var imageError = ValidateImageFiles(newFiles);
        if (imageError != null) return this.Error(400, imageError);

        var finalCount = listing.Images.Count(i => !removeIds.Contains(i.Id)) + newFiles.Count;
        if (finalCount < 1) return this.Error(400, "A listing must keep at least 1 photo.");
        if (finalCount > MaxImages) return this.Error(400, $"Maximum of {MaxImages} images allowed per listing.");

        // 3. Apply the changes and remember what changed, to decide which AI checks to run.
        var wasLive = listing.Status == "LIVE";
        var oldPrice = listing.Price;
        var priceInputsChanged = false;
        var imagesChanged = removeIds.Count > 0 || newFiles.Count > 0;

        if (dto.Title != null) listing.Title = TextNormalizer.CleanOrNull(dto.Title)!;
        if (dto.Description != null) listing.Description = dto.Description.Trim();

        if (dto.Category != null || dto.Brand != null)
        {
            var (knownCategories, knownBrands) = await LoadKnownNamesAsync();
            if (dto.Category != null)
            {
                var category = TextNormalizer.NormalizeName(dto.Category, knownCategories);
                priceInputsChanged |= !string.Equals(category, listing.Category, StringComparison.OrdinalIgnoreCase);
                listing.Category = category;
            }
            if (dto.Brand != null)
            {
                var brand = TextNormalizer.NormalizeName(dto.Brand, knownBrands);
                priceInputsChanged |= !string.Equals(brand, listing.Brand, StringComparison.OrdinalIgnoreCase);
                listing.Brand = brand;
            }
        }
        if (dto.Model != null)
        {
            var model = TextNormalizer.CleanOrNull(dto.Model)!;
            priceInputsChanged |= !string.Equals(model, listing.Model, StringComparison.OrdinalIgnoreCase);
            listing.Model = model;
        }
        if (condition != null && condition != listing.Condition)
        {
            listing.Condition = condition;
            priceInputsChanged = true;
        }
        if (dto.Year.HasValue && dto.Year != listing.Year)
        {
            listing.Year = dto.Year;
            priceInputsChanged = true;
        }
        if (dto.Price.HasValue && dto.Price.Value != listing.Price)
        {
            _db.PriceHistories.Add(new PriceHistory
            {
                ListingId = listing.Id,
                OldPrice = listing.Price,
                NewPrice = dto.Price.Value,
                ChangedAt = DateTime.UtcNow
            });
            listing.Price = dto.Price.Value;
            priceInputsChanged = true;
        }
        if (dto.Location != null) listing.Location = TextNormalizer.CleanOrNull(dto.Location)!;
        if (dto.Latitude.HasValue && dto.Longitude.HasValue)
        {
            listing.Latitude = dto.Latitude;
            listing.Longitude = dto.Longitude;
        }
        if (!string.IsNullOrWhiteSpace(dto.ListingType)) listing.ListingType = dto.ListingType.Trim();

        // 4. Photos: upload new ones first, so a failed upload changes nothing.
        var removedImages = listing.Images.Where(i => removeIds.Contains(i.Id)).ToList();
        if (newFiles.Count > 0)
        {
            var nextSort = listing.Images.Where(i => !removeIds.Contains(i.Id)).Select(i => i.SortOrder).DefaultIfEmpty(-1).Max() + 1;
            var (uploaded, uploadError) = await UploadImagesAsync(listing.Id, newFiles, nextSort);
            if (uploadError != null) return this.Error(502, uploadError);
            _db.ListingImages.AddRange(uploaded);
        }
        _db.ListingImages.RemoveRange(removedImages);

        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await DeleteFromCloudinaryAsync(removedImages);

        // 5. AI only when needed: price/category/brand/model/condition/year -> Fair Price + Trust,
        //    photos -> Trust, description/location/title only -> no AI.
        await RunChecksAndAlertsAsync(listing, runFairPrice: priceInputsChanged, runTrust: priceInputsChanged || imagesChanged,
            wasLive: wasLive, oldPrice: oldPrice);

        return Ok(await LoadDetailAsync(listing.Id, includeInternals: true));
    }

    /// <summary>
    /// Run the needed AI checks, then fire the matching alerts:
    /// became LIVE -> NEW_MATCH, stayed LIVE with a lower price -> PRICE_DROP.
    /// </summary>
    private async Task RunChecksAndAlertsAsync(Listing listing, bool runFairPrice, bool runTrust, bool wasLive, decimal oldPrice)
    {
        if (runFairPrice) await _checks.RunFairPriceAsync(listing);
        if (runTrust) await _checks.RunTrustCheckAsync(listing);

        if (!wasLive && listing.Status == "LIVE")
        {
            await _smartAlerts.OnListingBecameLiveAsync(listing);
        }
        else if (wasLive && listing.Status == "LIVE" && listing.Price < oldPrice)
        {
            await _smartAlerts.OnPriceChangedAsync(listing, oldPrice);
        }
    }

    private async Task<PublicListingDetailDto?> LoadDetailAsync(int id, bool includeInternals)
    {
        var listing = await _db.Listings
            .AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Images)
            .Include(l => l.PriceHistories)
            .FirstOrDefaultAsync(l => l.Id == id);
        return listing == null ? null : ListingMapper.ToDetail(listing, includeInternals, showPhone: true);
    }

    // ── Small helpers ───────────────────────────────────────────────────────────────────

    private async Task<(List<string> categories, List<string> brands)> LoadKnownNamesAsync()
    {
        var categories = await _db.CatalogModels.Select(c => c.Category).Distinct().ToListAsync();
        var brands = await _db.CatalogModels.Select(c => c.Brand).Distinct().ToListAsync();
        return (categories, brands);
    }

    private static string? ValidateCoordinates(double? latitude, double? longitude)
    {
        if (latitude.HasValue != longitude.HasValue) return "Latitude and Longitude must both be provided or both be empty.";
        if (latitude is < -90 or > 90) return "Latitude must be between -90 and 90.";
        if (longitude is < -180 or > 180) return "Longitude must be between -180 and 180.";
        return null;
    }

    private static string? ValidateYear(int? year)
    {
        if (year.HasValue && (year < 1900 || year > DateTime.UtcNow.Year + 1))
        {
            return $"Year must be between 1900 and {DateTime.UtcNow.Year + 1}.";
        }
        return null;
    }

    private static string? ValidateImageFiles(IEnumerable<IFormFile> files)
    {
        foreach (var file in files)
        {
            if (file.Length > MaxImageBytes) return $"Image '{file.FileName}' exceeds maximum size of 5 MB.";
            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            {
                return $"Image '{file.FileName}' has an unsupported format. Only jpg, jpeg, png, webp allowed.";
            }
        }
        return null;
    }

    /// <summary>
    /// Upload photos to Cloudinary (folder "musicmarket/listings"). On any failure the photos
    /// uploaded so far are deleted again and an error message is returned.
    /// </summary>
    private async Task<(List<ListingImage> images, string? error)> UploadImagesAsync(int listingId, IEnumerable<IFormFile> files, int firstSortOrder)
    {
        var images = new List<ListingImage>();
        var sortOrder = firstSortOrder;
        foreach (var file in files)
        {
            if (_cloudinary == null)
            {
                // Fallback placeholder when Cloudinary is not configured (tests / local runs).
                images.Add(new ListingImage
                {
                    ListingId = listingId,
                    Url = $"https://placehold.co/600x400?text={Uri.EscapeDataString(file.FileName)}",
                    PublicId = $"local_{Guid.NewGuid()}",
                    SortOrder = sortOrder++
                });
                continue;
            }

            using var stream = file.OpenReadStream();
            var uploadResult = await _cloudinary.UploadAsync(new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "musicmarket/listings",
                Transformation = new Transformation().Quality("auto").FetchFormat("auto")
            });
            if (uploadResult.Error != null)
            {
                _logger.LogError("Cloudinary upload failed for listing {ListingId}: {Error}", listingId, uploadResult.Error.Message);
                await DeleteFromCloudinaryAsync(images);
                return ([], $"Image upload failed: {uploadResult.Error.Message}");
            }

            images.Add(new ListingImage
            {
                ListingId = listingId,
                Url = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? "",
                PublicId = uploadResult.PublicId,
                SortOrder = sortOrder++
            });
        }
        return (images, null);
    }

    private async Task DeleteFromCloudinaryAsync(IEnumerable<ListingImage> images)
    {
        if (_cloudinary == null) return;
        foreach (var img in images)
        {
            if (string.IsNullOrEmpty(img.PublicId) || img.PublicId.StartsWith("local_")) continue;
            try
            {
                await _cloudinary.DestroyAsync(new DeletionParams(img.PublicId));
            }
            catch (Exception ex)
            {
                // The database is already correct; a leftover file in Cloudinary is only logged.
                _logger.LogWarning(ex, "Failed to delete image {PublicId} from Cloudinary", img.PublicId);
            }
        }
    }
}
