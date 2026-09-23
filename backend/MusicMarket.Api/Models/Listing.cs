namespace MusicMarket.Api.Models;

public class Listing
{
    public int Id { get; set; }
    
    // Foreign Key -> User
    public int SellerId { get; set; }
    public User? Seller { get; set; }

    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    
    // Condition values must be: new, like_new, excellent, good, fair, poor, for_parts
    public string Condition { get; set; } = "good";
    public int? Year { get; set; }
    
    // ListingType: "Sell" | "Trade" | "Rent"
    public string ListingType { get; set; } = "Sell";
    public decimal Price { get; set; }
    public string Location { get; set; } = "";
    public string Description { get; set; } = "";
    
    // Status values: PENDING, LIVE, FLAGGED, REJECTED, SOLD
    public string Status { get; set; } = "PENDING";
    public decimal? SoldPrice { get; set; }
    public DateTime? SoldAt { get; set; }

    // AI result fields (all nullable)
    public decimal? FairPrice { get; set; }
    public decimal? FairPriceMin { get; set; }
    public decimal? FairPriceMax { get; set; }
    public string? PriceVerdict { get; set; }
    public double? PriceDeviationPercent { get; set; }
    public string? PriceConfidence { get; set; }
    public string? PriceExplanation { get; set; }
    public int? TrustScore { get; set; }
    public string? AiReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<ListingImage> Images { get; set; } = [];
    public List<PriceHistory> PriceHistories { get; set; } = [];
}
