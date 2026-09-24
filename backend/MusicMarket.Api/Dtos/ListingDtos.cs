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
    public string Description { get; set; } = "";
    public List<IFormFile> Images { get; set; } = [];
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

public class ListingSummaryDto
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
    public string Status { get; set; } = "LIVE";
    public string? FirstImageUrl { get; set; }
    
    // AI price fields
    public decimal? FairPrice { get; set; }
    public decimal? FairPriceMin { get; set; }
    public decimal? FairPriceMax { get; set; }
    public string? PriceVerdict { get; set; }
    public double? PriceDeviationPercent { get; set; }
    public string? PriceConfidence { get; set; }
    public string? PriceExplanation { get; set; }
    public int? TrustScore { get; set; }
    public string? AiReason { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ListingDetailDto
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
    public string Description { get; set; } = "";
    public string Status { get; set; } = "PENDING";
    public decimal? SoldPrice { get; set; }
    public DateTime? SoldAt { get; set; }

    // AI result fields
    public decimal? FairPrice { get; set; }
    public decimal? FairPriceMin { get; set; }
    public decimal? FairPriceMax { get; set; }
    public string? PriceVerdict { get; set; }
    public double? PriceDeviationPercent { get; set; }
    public string? PriceConfidence { get; set; }
    public string? PriceExplanation { get; set; }
    public int? TrustScore { get; set; }
    public string? AiReason { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<ListingImageDto> Images { get; set; } = [];
    public List<PriceHistoryDto> PriceHistories { get; set; } = [];
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
