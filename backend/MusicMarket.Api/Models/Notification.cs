namespace MusicMarket.Api.Models;

public class Notification
{
    public int Id { get; set; }
    
    public int UserId { get; set; }
    public User? User { get; set; }
    
    public int? ListingId { get; set; }
    public Listing? Listing { get; set; }
    
    public int? SavedSearchId { get; set; }
    public SavedSearch? SavedSearch { get; set; }
    
    // "NEW_MATCH" | "PRICE_DROP"
    public string Type { get; set; } = "";
    
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
