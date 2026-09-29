namespace MusicMarket.Api.Dtos;

public class CreateOrderDto
{
    public int ListingId { get; set; }
    public string PaymentMethod { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string AddressLine { get; set; } = "";
    public string City { get; set; } = "";
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public CardDto? Card { get; set; }
}

public class CardDto
{
    public string Number { get; set; } = "";
    public string HolderName { get; set; } = "";
    public string Expiry { get; set; } = "";
    public string Cvv { get; set; } = "";
}

public class OrderDto
{
    public int Id { get; set; }
    public int ListingId { get; set; }
    public string ListingTitle { get; set; } = "";
    public string? ListingImage { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "";
    public string Status { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string AddressLine { get; set; } = "";
    public string City { get; set; } = "";
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public string? CardLast4 { get; set; }
    public DateTime CreatedAt { get; set; }
}
