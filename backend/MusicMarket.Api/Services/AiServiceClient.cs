using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MusicMarket.Api.Services;

// ── Request / Response DTOs ──────────────────────────────────────────────────

public class FairPriceRequest
{
    [JsonPropertyName("listing_id")]
    public int? ListingId { get; set; }

    [JsonPropertyName("brand")]
    public string Brand { get; set; } = "";

    [JsonPropertyName("model")]
    public string Model { get; set; } = "";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "";

    [JsonPropertyName("condition")]
    public string Condition { get; set; } = "";

    [JsonPropertyName("year")]
    public int? Year { get; set; }

    [JsonPropertyName("asking_price")]
    public float AskingPrice { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";
}

public class FairRangeResult
{
    [JsonPropertyName("min")]
    public float Min { get; set; }

    [JsonPropertyName("max")]
    public float Max { get; set; }
}

public class FairPriceResult
{
    [JsonPropertyName("fair_price")]
    public float FairPrice { get; set; }

    [JsonPropertyName("fair_range")]
    public FairRangeResult FairRange { get; set; } = new();

    [JsonPropertyName("asking_price")]
    public float AskingPrice { get; set; }

    [JsonPropertyName("deviation_percent")]
    public float DeviationPercent { get; set; }

    [JsonPropertyName("verdict")]
    public string Verdict { get; set; } = "";

    [JsonPropertyName("confidence")]
    public string Confidence { get; set; } = "";

    [JsonPropertyName("flag_for_trust")]
    public bool FlagForTrust { get; set; }

    [JsonPropertyName("extras_detected")]
    public List<string> ExtrasDetected { get; set; } = [];

    [JsonPropertyName("explanation")]
    public string Explanation { get; set; } = "";

    [JsonPropertyName("used_fallback")]
    public bool UsedFallback { get; set; }
}

// ── Typed HttpClient ─────────────────────────────────────────────────────────

public class AiServiceClient
{
    private readonly HttpClient _http;
    private readonly ILogger<AiServiceClient> _logger;

    public AiServiceClient(HttpClient http, ILogger<AiServiceClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <summary>
    /// Calls POST /api/agents/fair-price and returns the result,
    /// or null if the AI service is unreachable or returns an error.
    /// Never throws; errors are logged.
    /// </summary>
    public async Task<FairPriceResult?> GetFairPriceAsync(FairPriceRequest request)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/agents/fair-price", request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI service returned {Status} for fair-price: {Body}",
                    response.StatusCode, body);
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<FairPriceResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "AI service is unreachable (fair-price).");
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "AI service timed out (fair-price).");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling AI service (fair-price).");
            return null;
        }
    }
}
