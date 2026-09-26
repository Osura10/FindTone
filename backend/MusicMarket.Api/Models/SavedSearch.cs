namespace MusicMarket.Api.Models;

public class SavedSearch
{
    public int Id { get; set; }
    
    public int UserId { get; set; }
    public User? User { get; set; }
    
    public string Name { get; set; } = "";
    public string? QueryText { get; set; }
    public string? Category { get; set; }
    public string? Brand { get; set; }
    public string? ModelKeyword { get; set; }
    
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    
    // Comma separated values from: new, like_new, excellent, good, fair, poor, for_parts
    public string? Conditions { get; set; }
    
    public string? Location { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastNotifiedAt { get; set; }
}
