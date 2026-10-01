using System.Linq.Expressions;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Services;

/// <summary>
/// Turns Listing entities into DTOs. The "Public" versions never include the trust score,
/// AI reason or fair-price fields; only the owner and admins get those.
/// </summary>
public static class ListingMapper
{
    // EF Core projection for public listing cards (translated to SQL).
    public static readonly Expression<Func<Listing, PublicListingSummaryDto>> ToPublicSummary = l => new PublicListingSummaryDto
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
        Latitude = l.Latitude,
        Longitude = l.Longitude,
        Status = l.Status,
        FirstImageUrl = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
        CreatedAt = l.CreatedAt,
        UpdatedAt = l.UpdatedAt
    };

    // EF Core projection for the owner's / admin's listing cards (translated to SQL).
    public static readonly Expression<Func<Listing, ListingSummaryDto>> ToOwnerSummary = l => new ListingSummaryDto
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
        Latitude = l.Latitude,
        Longitude = l.Longitude,
        Status = l.Status,
        FirstImageUrl = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
        CreatedAt = l.CreatedAt,
        UpdatedAt = l.UpdatedAt,
        FairPrice = l.FairPrice,
        FairPriceMin = l.FairPriceMin,
        FairPriceMax = l.FairPriceMax,
        PriceVerdict = l.PriceVerdict,
        PriceDeviationPercent = l.PriceDeviationPercent,
        PriceConfidence = l.PriceConfidence,
        PriceExplanation = l.PriceExplanation,
        TrustScore = l.TrustScore,
        AiReason = l.AiReason
    };

    /// <summary>
    /// Full details. Pass includeInternals = true only for the owner or an admin.
    /// The listing must be loaded with Seller, Images and PriceHistories.
    /// </summary>
    public static PublicListingDetailDto ToDetail(Listing listing, bool includeInternals, bool showPhone)
    {
        PublicListingDetailDto dto = includeInternals
            ? new ListingDetailDto
            {
                FairPrice = listing.FairPrice,
                FairPriceMin = listing.FairPriceMin,
                FairPriceMax = listing.FairPriceMax,
                PriceVerdict = listing.PriceVerdict,
                PriceDeviationPercent = listing.PriceDeviationPercent,
                PriceConfidence = listing.PriceConfidence,
                PriceExplanation = listing.PriceExplanation,
                TrustScore = listing.TrustScore,
                AiReason = listing.AiReason
            }
            : new PublicListingDetailDto();

        dto.Id = listing.Id;
        dto.SellerId = listing.SellerId;
        dto.SellerName = listing.Seller?.Name ?? "";
        dto.SellerPhone = showPhone ? listing.Seller?.PhoneNumber : null;
        dto.SellerRole = listing.Seller?.Role ?? "";
        dto.SellerMemberSince = listing.Seller?.CreatedAt;
        dto.Title = listing.Title;
        dto.Category = listing.Category;
        dto.Brand = listing.Brand;
        dto.Model = listing.Model;
        dto.Condition = listing.Condition;
        dto.Year = listing.Year;
        dto.ListingType = listing.ListingType;
        dto.Price = listing.Price;
        dto.Location = listing.Location;
        dto.Latitude = listing.Latitude;
        dto.Longitude = listing.Longitude;
        dto.Description = listing.Description;
        dto.Status = listing.Status;
        dto.SoldPrice = listing.SoldPrice;
        dto.SoldAt = listing.SoldAt;
        dto.CreatedAt = listing.CreatedAt;
        dto.UpdatedAt = listing.UpdatedAt;
        dto.Images = listing.Images
            .OrderBy(i => i.SortOrder)
            .Select(img => new ListingImageDto
            {
                Id = img.Id,
                Url = img.Url,
                PublicId = img.PublicId,
                PHash = includeInternals ? img.PHash : null,
                SortOrder = img.SortOrder
            }).ToList();
        dto.PriceHistories = listing.PriceHistories
            .OrderByDescending(ph => ph.ChangedAt)
            .Select(ph => new PriceHistoryDto
            {
                Id = ph.Id,
                OldPrice = ph.OldPrice,
                NewPrice = ph.NewPrice,
                ChangedAt = ph.ChangedAt
            }).ToList();
        return dto;
    }
}
