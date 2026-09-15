namespace MusicMarket.Api.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = ""; // Also acts as Shop Name for shop role
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "buyer"; 
    
    // Additional fields
    public string? PhoneNumber { get; set; }
    public string? NicCardNumber { get; set; }
    
    // Shop specific fields
    public string? OwnerName { get; set; }
    public string? Address { get; set; }
    public string? ShopRegisterId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
