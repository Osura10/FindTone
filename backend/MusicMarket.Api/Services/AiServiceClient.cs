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

public class TrustSignal
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = "";

    [JsonPropertyName("points")]
    public int Points { get; set; }

    [JsonPropertyName("detail")]
    public string Detail { get; set; } = "";
}

public class ImageHashResult
{
    [JsonPropertyName("image_id")]
    public int ImageId { get; set; }

    [JsonPropertyName("phash")]
    public string PHash { get; set; } = "";
}

public class TrustCheckResult
{
    [JsonPropertyName("listing_id")]
    public int ListingId { get; set; }

    [JsonPropertyName("trust_score")]
    public int TrustScore { get; set; }

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = "";

    [JsonPropertyName("warning")]
    public bool Warning { get; set; }

    [JsonPropertyName("signals")]
    public List<TrustSignal> Signals { get; set; } = [];

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = "";

    [JsonPropertyName("image_hashes")]
    public List<ImageHashResult> ImageHashes { get; set; } = [];

    [JsonPropertyName("duplicate_listing_ids")]
    public List<int> DuplicateListingIds { get; set; } = [];

    [JsonPropertyName("used_fallback")]
    public bool UsedFallback { get; set; }
}
public class ShoppingAssistantRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = "";

    [JsonPropertyName("session_id")]
    public string? SessionId { get; set; }

    [JsonPropertyName("user_id")]
    public int? UserId { get; set; }
}

public class ShoppingAssistantListing
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

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

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("location")]
    public string Location { get; set; } = "";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    [JsonPropertyName("trust_score")]
    public int? TrustScore { get; set; }

    [JsonPropertyName("fair_price")]
    public decimal? FairPrice { get; set; }

    [JsonPropertyName("fair_price_min")]
    public decimal? FairPriceMin { get; set; }

    [JsonPropertyName("fair_price_max")]
    public decimal? FairPriceMax { get; set; }

    [JsonPropertyName("price_verdict")]
    public string? PriceVerdict { get; set; }

    [JsonPropertyName("price_explanation")]
    public string? PriceExplanation { get; set; }

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }
}

public class ShoppingAssistantResult
{
    [JsonPropertyName("reply")]
    public string Reply { get; set; } = "";

    [JsonPropertyName("listings")]
    public List<ShoppingAssistantListing> Listings { get; set; } = [];

    [JsonPropertyName("comparison")]
    public JsonElement? Comparison { get; set; }

    [JsonPropertyName("price_insight")]
    public JsonElement? PriceInsight { get; set; }

    [JsonPropertyName("alert_to_create")]
    public JsonElement? AlertToCreate { get; set; }

    [JsonPropertyName("session_id")]
    public string SessionId { get; set; } = "";

    [JsonPropertyName("used_fallback")]
    public bool UsedFallback { get; set; }
}

// ── Typed HttpClient ─────────────────────────────────────────────────────────

public class AiServiceClient
{
    // A local LLM can be slow, so each agent call gets a long timeout. Callers do not pass the
    // request's CancellationToken on purpose: the check must finish even if the user closes the page.
    private static readonly TimeSpan AiCallTimeout = TimeSpan.FromSeconds(240);

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
            using var cts = new CancellationTokenSource(AiCallTimeout);
            var response = await _http.PostAsJsonAsync("/api/agents/fair-price", request, cts.Token);

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

    /// <summary>
    /// Calls POST /api/agents/trust-check and returns the result,
    /// or null if the AI service is unreachable or returns an error.
    /// Never throws; errors are logged. Timeout is 120s because image checks are slow.
    /// </summary>
    public async Task<TrustCheckResult?> GetTrustCheckAsync(int listingId)
    {
        try
        {
            var request = new { listing_id = listingId };
            using var cts = new CancellationTokenSource(AiCallTimeout);
            var response = await _http.PostAsJsonAsync("/api/agents/trust-check", request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI service returned {Status} for trust-check: {Body}",
                    response.StatusCode, body);
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<TrustCheckResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, cts.Token);

            if (result != null)
            {
                _logger.LogInformation("Trust Check Result: Score={Score}, Decision={Decision}", result.TrustScore, result.Decision);
            }

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "AI service is unreachable (trust-check).");
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "AI service timed out (trust-check).");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling AI service (trust-check).");
            return null;
        }
    }

    /// <summary>
    /// Calls POST /api/agents/smart-alert and returns the result,
    /// or null if the AI service is unreachable or returns an error.
    /// Never throws; errors are logged.
    /// </summary>
    public async Task<MusicMarket.Api.Dtos.SmartAlertResult?> GetSmartAlertsAsync(int listingId, string eventType, decimal? oldPrice = null)
    {
        try
        {
            var request = new { listing_id = listingId, @event = eventType, old_price = oldPrice };
            using var cts = new CancellationTokenSource(AiCallTimeout);
            var response = await _http.PostAsJsonAsync("/api/agents/smart-alert", request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI service returned {Status} for smart-alert: {Body}", response.StatusCode, body);
                return null;
            }

            return await response.Content.ReadFromJsonAsync<MusicMarket.Api.Dtos.SmartAlertResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, cts.Token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling AI service (smart-alert).");
            return null;
        }
    }

    /// <summary>
    /// Calls POST /api/agents/parse-alert and returns the result,
    /// or null if the AI service is unreachable or returns an error.
    /// Never throws; errors are logged.
    /// </summary>
    public async Task<MusicMarket.Api.Dtos.ParseAlertResult?> ParseAlertTextAsync(string text)
    {
        try
        {
            var request = new { text = text };
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(90));
            var response = await _http.PostAsJsonAsync("/api/agents/parse-alert", request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI service returned {Status} for parse-alert: {Body}", response.StatusCode, body);
                return null;
            }

            return await response.Content.ReadFromJsonAsync<MusicMarket.Api.Dtos.ParseAlertResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, cts.Token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling AI service (parse-alert).");
            return null;
        }
    }
        /// <summary>
    /// Calls POST /api/agents/shopping-assistant and returns the result,
    /// or null if the AI service is unreachable or returns an error.
    /// Never throws; errors are logged.
    /// </summary>
    public async Task<ShoppingAssistantResult?> GetShoppingAssistantAsync(
        string message,
        string? sessionId,
        int userId)
    {
        try
        {
            var request = new ShoppingAssistantRequest
            {
                Message = message,
                SessionId = sessionId,
                UserId = userId
            };

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(120));

            var response = await _http.PostAsJsonAsync(
                "/api/agents/shopping-assistant",
                request,
                cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();

                _logger.LogWarning(
                    "AI service returned {Status} for shopping-assistant: {Body}",
                    response.StatusCode,
                    body);

                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<ShoppingAssistantResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cts.Token);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "AI service is unreachable (shopping-assistant).");
            return null;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "AI service timed out (shopping-assistant).");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling AI service (shopping-assistant).");
            return null;
        }
    }

    /// <summary>
    /// Calls POST /api/agents/smart-alert/backfill: matches one saved alert against the
    /// existing LIVE listings. Returns null if the AI service fails. Never throws; errors are logged.
    /// </summary>
    public async Task<MusicMarket.Api.Dtos.AlertBackfillResult?> GetAlertBackfillAsync(int savedSearchId)
    {
        try
        {
            var request = new { saved_search_id = savedSearchId };
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            var response = await _http.PostAsJsonAsync("/api/agents/smart-alert/backfill", request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI service returned {Status} for smart-alert backfill: {Body}", response.StatusCode, body);
                return null;
            }

            return await response.Content.ReadFromJsonAsync<MusicMarket.Api.Dtos.AlertBackfillResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, cts.Token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling AI service (smart-alert backfill).");
            return null;
        }
    }
}
