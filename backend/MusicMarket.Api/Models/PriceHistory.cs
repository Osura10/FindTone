namespace MusicMarket.Api.Models;

public class PriceHistory
{
    public int Id { get; set; }
    
    // Foreign Key -> Listing (Cascade delete)
    public int ListingId { get; set; }
    public Listing? Listing { get; set; }

    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
