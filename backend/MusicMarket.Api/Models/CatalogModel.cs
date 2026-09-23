namespace MusicMarket.Api.Models;

public class CatalogModel
{
    public int Id { get; set; }
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Category { get; set; } = "";
    
    // Tier: "budget" | "mid" | "premium"
    public string Tier { get; set; } = "mid";
    
    // Approximate current LKR new price
    public decimal NewPriceLkr { get; set; }
    public int? ReleaseYear { get; set; }
    public bool IsCollectible { get; set; } = false;
}
