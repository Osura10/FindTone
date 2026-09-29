namespace MusicMarket.Api.Models;

public class Order
{
    public int Id { get; set; }
    
    public int ListingId { get; set; }
    public Listing? Listing { get; set; }
    
    public int BuyerId { get; set; }
    public User? Buyer { get; set; }
    
    public int SellerId { get; set; }
    
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = ""; // "CARD" | "COD"
    public string Status { get; set; } = ""; // "PAID" | "CONFIRMED_COD"
    
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string AddressLine { get; set; } = "";
    public string City { get; set; } = "";
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    
    public string? CardLast4 { get; set; }
    
    public DateTime CreatedAt { get; set; }
}
