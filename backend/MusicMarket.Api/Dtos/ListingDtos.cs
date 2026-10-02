using Microsoft.AspNetCore.Http;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Dtos;

public class CreateListingDto
{
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Condition { get; set; } = "good";
    public int? Year { get; set; }
    public string ListingType { get; set; } = "Sell";
    public decimal Price { get; set; }
    public string Location { get; set; } = "";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Description { get; set; } = "";
    public List<IFormFile> Images { get; set; } = [];
}

/// <summary>
/// PATCH/PUT /api/listings/{id} (multipart form). Every field is optional:
/// only the fields that are sent are changed.
/// </summary>
public class UpdateListingDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? Condition { get; set; }
    public int? Year { get; set; }
    public string? ListingType { get; set; }
    public decimal? Price { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Images to delete from this listing.
    public List<int>? RemoveImageIds { get; set; }

    // Older clients send the ids to KEEP instead; any image not in this list is removed.
    public List<int>? ExistingImageIds { get; set; }

    public List<IFormFile>? NewImages { get; set; }
}

public class UpdatePriceDto
{
    public decimal NewPrice { get; set; }
}

public class PriceCheckDto
{
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Category { get; set; } = "";
    public string Condition { get; set; } = "";
    public int? Year { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; } = "";
}

public class ListingImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = "";
    public string PublicId { get; set; } = "";
    public string? PHash { get; set; }
    public int SortOrder { get; set; }
}

public class PriceHistoryDto
{
    public int Id { get; set; }
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public DateTime ChangedAt { get; set; }
}

/// <summary>
/// Listing card for public lists. Never contains trust or fair-price internals.
/// </summary>
public class PublicListingSummaryDto
{
    public int Id { get; set; }
    public int SellerId { get; set; }
    public string SellerName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Condition { get; set; } = "";
    public int? Year { get; set; }
    public string ListingType { get; set; } = "Sell";
    public decimal Price { get; set; }
    public string Location { get; set; } = "";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Status { get; set; } = "LIVE";
    public string? FirstImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Listing card for the owner (/listings/mine) and admins: adds the AI results.
/// </summary>
public class ListingSummaryDto : PublicListingSummaryDto
{
    public decimal? FairPrice { get; set; }
    public decimal? FairPriceMin { get; set; }
    public decimal? FairPriceMax { get; set; }
    public string? PriceVerdict { get; set; }
    public double? PriceDeviationPercent { get; set; }
    public string? PriceConfidence { get; set; }
    public string? PriceExplanation { get; set; }
    public int? TrustScore { get; set; }
    public string? AiReason { get; set; }

    // True when the trust score is 40-69: the listing is LIVE but shown with a warning to the owner.
    public bool TrustWarning => TrustScore is >= 40 and < 70;
}

/// <summary>
/// Listing details for everyone. Never contains trust or fair-price internals.
/// </summary>
public class PublicListingDetailDto
{
    public int Id { get; set; }
    public int SellerId { get; set; }
    public string SellerName { get; set; } = "";
    public string? SellerPhone { get; set; }
    public string SellerRole { get; set; } = "";
    public DateTime? SellerMemberSince { get; set; }
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Condition { get; set; } = "";
    public int? Year { get; set; }
    public string ListingType { get; set; } = "Sell";
    public decimal Price { get; set; }
    public string Location { get; set; } = "";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Description { get; set; } = "";
    public string Status { get; set; } = "PENDING";
    public decimal? SoldPrice { get; set; }
    public DateTime? SoldAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<ListingImageDto> Images { get; set; } = [];
    public List<PriceHistoryDto> PriceHistories { get; set; } = [];
}

/// <summary>
/// Listing details for the owner and admins: adds the AI results.
/// </summary>
public class ListingDetailDto : PublicListingDetailDto
{
    public decimal? FairPrice { get; set; }
    public decimal? FairPriceMin { get; set; }
    public decimal? FairPriceMax { get; set; }
    public string? PriceVerdict { get; set; }
    public double? PriceDeviationPercent { get; set; }
    public string? PriceConfidence { get; set; }
    public string? PriceExplanation { get; set; }
    public int? TrustScore { get; set; }
    public string? AiReason { get; set; }

    // True when the trust score is 40-69: the listing is LIVE but shown with a warning to the owner.
    public bool TrustWarning => TrustScore is >= 40 and < 70;
}

public class CatalogModelDto
{
    public int Id { get; set; }
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Category { get; set; } = "";
    public string Tier { get; set; } = "";
    public decimal NewPriceLkr { get; set; }
    public int? ReleaseYear { get; set; }
    public bool IsCollectible { get; set; }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / (PageSize > 0 ? PageSize : 1));
}
