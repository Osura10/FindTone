using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
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
public class ListingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly Cloudinary? _cloudinary;
    private readonly AiServiceClient _ai;
    private static readonly HashSet<string> AllowedConditions = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "like_new", "excellent", "good", "fair", "poor", "for_parts"
    };
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    public ListingsController(AppDbContext db, IServiceProvider serviceProvider, AiServiceClient ai)
    {
        _db = db;
        _cloudinary = serviceProvider.GetService<Cloudinary>();
        _ai = ai;
    }

    /// <summary>
    /// 1. Create a new listing with 1 to 6 photos uploaded to Cloudinary.
    /// </summary>
    [HttpPost]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateListing([FromForm] CreateListingDto dto)
    {
        var sellerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(sellerIdStr, out var sellerId))
        {
            return Unauthorized("Invalid user token");
        }

        // Validate Price
        if (dto.Price <= 0)
        {
            return BadRequest("Price must be greater than 0");
        }

        // Validate Condition
        var condition = dto.Condition?.Trim().ToLowerInvariant() ?? "";
        if (!AllowedConditions.Contains(condition))
        {
            return BadRequest($"Invalid condition '{dto.Condition}'. Allowed values: new, like_new, excellent, good, fair, poor, for_parts.");
        }

        // Validate Images count
        if (dto.Images == null || dto.Images.Count == 0)
        {
            return BadRequest("At least 1 image is required");
        }

        if (dto.Images.Count > 6)
        {
            return BadRequest("Maximum of 6 images allowed per listing");
        }

        // Validate each image size and extension
        foreach (var file in dto.Images)
        {
            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest($"Image '{file.FileName}' exceeds maximum size of 5 MB");
            }

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            {
                return BadRequest($"Image '{file.FileName}' has an unsupported format. Only jpg, jpeg, png, webp allowed.");
            }
        }

        var listing = new Listing
        {
            SellerId = sellerId,
            Title = dto.Title.Trim(),
            Category = dto.Category.Trim(),
            Brand = dto.Brand.Trim(),
            Model = dto.Model.Trim(),
            Condition = condition,
            Year = dto.Year,
            ListingType = string.IsNullOrWhiteSpace(dto.ListingType) ? "Sell" : dto.ListingType.Trim(),
            Price = dto.Price,
            Location = dto.Location.Trim(),
            Description = dto.Description?.Trim() ?? "",
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Listings.Add(listing);
        await _db.SaveChangesAsync();

        // Upload images to Cloudinary (folder: "musicmarket/listings")
        var sortOrder = 0;
        foreach (var file in dto.Images)
        {
            string imageUrl = "";
            string publicId = "";

            if (_cloudinary != null)
            {
                using var stream = file.OpenReadStream();
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "musicmarket/listings",
                    Transformation = new Transformation().Quality("auto").FetchFormat("auto")
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                if (uploadResult.Error != null)
                {
                    return StatusCode(500, $"Image upload failed: {uploadResult.Error.Message}");
                }

                imageUrl = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? "";
                publicId = uploadResult.PublicId;
            }
            else
            {
                // Fallback placeholder when Cloudinary URL is not configured
                imageUrl = $"https://placehold.co/600x400?text={Uri.EscapeDataString(file.FileName)}";
                publicId = $"local_{Guid.NewGuid()}";
            }

            var listingImage = new ListingImage
            {
                ListingId = listing.Id,
                Url = imageUrl,
                PublicId = publicId,
                SortOrder = sortOrder++
            };

            _db.ListingImages.Add(listingImage);
        }

        await _db.SaveChangesAsync();

        // Call Fair Price Agent (fire-and-forget on failure)
        var aiReq = new FairPriceRequest
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
        var aiResult = await _ai.GetFairPriceAsync(aiReq);
        if (aiResult != null)
        {
            listing.FairPrice = (decimal)aiResult.FairPrice;
            listing.FairPriceMin = (decimal)aiResult.FairRange.Min;
            listing.FairPriceMax = (decimal)aiResult.FairRange.Max;
            listing.PriceVerdict = aiResult.Verdict;
            listing.PriceDeviationPercent = aiResult.DeviationPercent;
            listing.PriceConfidence = aiResult.Confidence;
            listing.PriceExplanation = aiResult.Explanation;
            listing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Call Trust Check Agent
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
            
            if (trustResult.Decision == "LIVE" || trustResult.Decision == "FLAGGED")
            {
                listing.Status = trustResult.Decision;
            }
            
            // Update image PHashes
            var listingImages = await _db.ListingImages.Where(i => i.ListingId == listing.Id).ToListAsync();
            foreach (var imgHash in trustResult.ImageHashes)
            {
                var img = listingImages.FirstOrDefault(i => i.Id == imgHash.ImageId);
                if (img != null && !string.IsNullOrEmpty(imgHash.PHash))
                {
                    img.PHash = imgHash.PHash;
                }
            }
            
            listing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Load seller info for response
        await _db.Entry(listing).ReloadAsync();
        var sellerName = await _db.Users.Where(u => u.Id == sellerId).Select(u => u.Name).FirstOrDefaultAsync() ?? "";

        var responseDto = new ListingDetailDto
        {
            Id = listing.Id,
            SellerId = listing.SellerId,
            SellerName = sellerName,
            Title = listing.Title,
            Category = listing.Category,
            Brand = listing.Brand,
            Model = listing.Model,
            Condition = listing.Condition,
            Year = listing.Year,
            ListingType = listing.ListingType,
            Price = listing.Price,
            Location = listing.Location,
            Description = listing.Description,
            Status = listing.Status,
            FairPrice = listing.FairPrice,
            FairPriceMin = listing.FairPriceMin,
            FairPriceMax = listing.FairPriceMax,
            PriceVerdict = listing.PriceVerdict,
            PriceDeviationPercent = listing.PriceDeviationPercent,
            PriceConfidence = listing.PriceConfidence,
            PriceExplanation = listing.PriceExplanation,
            CreatedAt = listing.CreatedAt,
            UpdatedAt = listing.UpdatedAt,
            Images = listing.Images.Select(img => new ListingImageDto
            {
                Id = img.Id,
                Url = img.Url,
                PublicId = img.PublicId,
                PHash = img.PHash,
                SortOrder = img.SortOrder
            }).ToList()
        };

        return CreatedAtAction(nameof(GetListingById), new { id = listing.Id }, responseDto);
    }

    /// <summary>
    /// 2. Public search/filtering with first image and AI pricing fields.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetListings(
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

        var query = _db.Listings.AsNoTracking().AsQueryable();

        // Status filter (default LIVE)
        if (!string.IsNullOrEmpty(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(l => l.Status == status);
        }

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(l => l.Category.ToLower() == category.ToLower());
        }

        if (!string.IsNullOrEmpty(brand))
        {
            query = query.Where(l => l.Brand.ToLower() == brand.ToLower());
        }

        if (minPrice.HasValue)
        {
            query = query.Where(l => l.Price >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(l => l.Price <= maxPrice.Value);
        }

        if (!string.IsNullOrEmpty(condition))
        {
            query = query.Where(l => l.Condition.ToLower() == condition.ToLower());
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new ListingSummaryDto
            {
                Id = l.Id,
                SellerId = l.SellerId,
                SellerName = l.Seller != null ? l.Seller.Name : "",
                Title = l.Title,
                Category = l.Category,
                Brand = l.Brand,
                Model = l.Model,
                Condition = l.Condition,
                Year = l.Year,
                ListingType = l.ListingType,
                Price = l.Price,
                Location = l.Location,
                Status = l.Status,
                FirstImageUrl = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
                FairPrice = l.FairPrice,
                FairPriceMin = l.FairPriceMin,
                FairPriceMax = l.FairPriceMax,
                PriceVerdict = l.PriceVerdict,
                PriceDeviationPercent = l.PriceDeviationPercent,
                PriceConfidence = l.PriceConfidence,
                PriceExplanation = l.PriceExplanation,
                TrustScore = l.TrustScore,
                AiReason = l.AiReason,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<ListingSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// 3. Get full details of a listing by ID (public).
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetListingById(int id)
    {
        var listing = await _db.Listings
            .AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Images.OrderBy(i => i.SortOrder))
            .Include(l => l.PriceHistories.OrderByDescending(ph => ph.ChangedAt))
            .FirstOrDefaultAsync(l => l.Id == id);

        if (listing == null)
        {
            return NotFound($"Listing #{id} not found");
        }

        var dto = new ListingDetailDto
        {
            Id = listing.Id,
            SellerId = listing.SellerId,
            SellerName = listing.Seller?.Name ?? "",
            Title = listing.Title,
            Category = listing.Category,
            Brand = listing.Brand,
            Model = listing.Model,
            Condition = listing.Condition,
            Year = listing.Year,
            ListingType = listing.ListingType,
            Price = listing.Price,
            Location = listing.Location,
            Description = listing.Description,
            Status = listing.Status,
            SoldPrice = listing.SoldPrice,
            SoldAt = listing.SoldAt,
            FairPrice = listing.FairPrice,
            FairPriceMin = listing.FairPriceMin,
            FairPriceMax = listing.FairPriceMax,
            PriceVerdict = listing.PriceVerdict,
            PriceDeviationPercent = listing.PriceDeviationPercent,
            PriceConfidence = listing.PriceConfidence,
            PriceExplanation = listing.PriceExplanation,
            TrustScore = listing.TrustScore,
            AiReason = listing.AiReason,
            CreatedAt = listing.CreatedAt,
            UpdatedAt = listing.UpdatedAt,
            Images = listing.Images.Select(img => new ListingImageDto
            {
                Id = img.Id,
                Url = img.Url,
                PublicId = img.PublicId,
                PHash = img.PHash,
                SortOrder = img.SortOrder
            }).ToList(),
            PriceHistories = listing.PriceHistories.Select(ph => new PriceHistoryDto
            {
                Id = ph.Id,
                OldPrice = ph.OldPrice,
                NewPrice = ph.NewPrice,
                ChangedAt = ph.ChangedAt
            }).ToList()
        };

        return Ok(dto);
    }

    /// <summary>
    /// 4. Get the current user's listings (any status).
    /// </summary>
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMyListings()
    {
        var sellerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(sellerIdStr, out var sellerId))
        {
            return Unauthorized("Invalid user token");
        }

        var items = await _db.Listings
            .AsNoTracking()
            .Where(l => l.SellerId == sellerId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new ListingSummaryDto
            {
                Id = l.Id,
                SellerId = l.SellerId,
                SellerName = l.Seller != null ? l.Seller.Name : "",
                Title = l.Title,
                Category = l.Category,
                Brand = l.Brand,
                Model = l.Model,
                Condition = l.Condition,
                Year = l.Year,
                ListingType = l.ListingType,
                Price = l.Price,
                Location = l.Location,
                Status = l.Status,
                FirstImageUrl = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
                FairPrice = l.FairPrice,
                FairPriceMin = l.FairPriceMin,
                FairPriceMax = l.FairPriceMax,
                PriceVerdict = l.PriceVerdict,
                PriceDeviationPercent = l.PriceDeviationPercent,
                PriceConfidence = l.PriceConfidence,
                PriceExplanation = l.PriceExplanation,
                TrustScore = l.TrustScore,
                AiReason = l.AiReason,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// 5. Update listing price and log price history (owner only).
    /// </summary>
    [HttpPut("{id:int}/price")]
    [Authorize]
    public async Task<IActionResult> UpdatePrice(int id, [FromBody] UpdatePriceDto dto)
    {
        if (dto.NewPrice <= 0)
        {
            return BadRequest("New price must be greater than 0");
        }

        var sellerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(sellerIdStr, out var sellerId))
        {
            return Unauthorized("Invalid user token");
        }

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null)
        {
            return NotFound($"Listing #{id} not found");
        }

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (listing.SellerId != sellerId && role != "admin")
        {
            return Forbid();
        }

        var oldPrice = listing.Price;
        if (oldPrice != dto.NewPrice)
        {
            var history = new PriceHistory
            {
                ListingId = listing.Id,
                OldPrice = oldPrice,
                NewPrice = dto.NewPrice,
                ChangedAt = DateTime.UtcNow
            };

            _db.PriceHistories.Add(history);
            listing.Price = dto.NewPrice;
            listing.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        // Call Fair Price Agent after price update
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

        // Call Trust Check Agent after price update
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
            
            if (listing.Status != "REJECTED" && listing.Status != "SOLD")
            {
                if (trustResult.Decision == "LIVE" || trustResult.Decision == "FLAGGED")
                {
                    listing.Status = trustResult.Decision;
                }
            }
            
            listing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            ListingId = listing.Id,
            OldPrice = oldPrice,
            NewPrice = listing.Price,
            UpdatedAt = listing.UpdatedAt
        });
    }

    /// <summary>
    /// 6. Price-check without saving — calls AI and returns result immediately.
    /// </summary>
    [HttpPost("price-check")]
    [Authorize]
    public async Task<IActionResult> PriceCheck([FromBody] PriceCheckDto dto)
    {
        var aiReq = new FairPriceRequest
        {
            Brand = dto.Brand,
            Model = dto.Model,
            Category = dto.Category,
            Condition = dto.Condition,
            Year = dto.Year,
            AskingPrice = (float)dto.Price,
            Description = dto.Description
        };

        var result = await _ai.GetFairPriceAsync(aiReq);
        if (result == null)
        {
            return StatusCode(503, new { message = "Price check is unavailable right now. Please try again later." });
        }

        return Ok(result);
    }

    /// <summary>
    /// 7. List CatalogModels with optional category filter.
    /// </summary>
    [HttpGet("/api/catalog")]
    public async Task<IActionResult> GetCatalog([FromQuery] string? category)
    {
        var query = _db.CatalogModels.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(c => c.Category.ToLower() == category.ToLower());
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
}
