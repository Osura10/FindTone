using System.Text.Json.Serialization;

namespace MusicMarket.Api.Dtos;public class CreateSavedSearchDto
{
    public string Name { get; set; } = "";
    public string? QueryText { get; set; }
    public string? Category { get; set; }
    public string? Brand { get; set; }
    public string? ModelKeyword { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? Conditions { get; set; }
    public string? Location { get; set; }
}

public class UpdateSavedSearchDto
{
    public string Name { get; set; } = "";
    public string? QueryText { get; set; }
    public string? Category { get; set; }
    public string? Brand { get; set; }
    public string? ModelKeyword { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? Conditions { get; set; }
    public string? Location { get; set; }
}

public class ToggleSavedSearchDto
{
    public bool IsActive { get; set; }
}

public class SmartAlertNotificationDto
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("saved_search_id")]
    public int? SavedSearchId { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";
}

public class SmartAlertResult
{
    [JsonPropertyName("listing_id")]
    public int ListingId { get; set; }

    [JsonPropertyName("event")]
    public string Event { get; set; } = "";

    [JsonPropertyName("notifications")]
    public List<SmartAlertNotificationDto> Notifications { get; set; } = [];

    [JsonPropertyName("matched_search_ids")]
    public List<int> MatchedSearchIds { get; set; } = [];

    [JsonPropertyName("used_fallback")]
    public bool UsedFallback { get; set; }
}

public class ParseAlertResult
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
    
    [JsonPropertyName("category")]
    public string? Category { get; set; }
    
    [JsonPropertyName("brand")]
    public string? Brand { get; set; }
    
    [JsonPropertyName("model_keyword")]
    public string? ModelKeyword { get; set; }
    
    [JsonPropertyName("min_price")]
    public decimal? MinPrice { get; set; }
    
    [JsonPropertyName("max_price")]
    public decimal? MaxPrice { get; set; }
    
    [JsonPropertyName("conditions")]
    public string? Conditions { get; set; }
    
    [JsonPropertyName("location")]
    public string? Location { get; set; }
    
    [JsonPropertyName("used_fallback")]
    public bool UsedFallback { get; set; }
}
