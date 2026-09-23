namespace MusicMarket.Api.Models;

public class ListingImage
{
    public int Id { get; set; }
    
    // Foreign Key -> Listing (Cascade delete)
    public int ListingId { get; set; }
    public Listing? Listing { get; set; }

    public string Url { get; set; } = "";
    public string PublicId { get; set; } = "";
    public string? PHash { get; set; }
    public int SortOrder { get; set; } = 0;
}
