using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Helpers;
using MusicMarket.Api.Models;
using MusicMarket.Api.Services;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlertsController : ControllerBase
{
    private const int MaxAlertsPerUser = 10;

    private static readonly HashSet<string> AllowedConditions = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "like_new", "excellent", "good", "fair", "poor", "for_parts"
    };

    private readonly AppDbContext _db;
    private readonly AiServiceClient _ai;
    private readonly SmartAlertService _smartAlerts;

    public AlertsController(AppDbContext db, AiServiceClient ai, SmartAlertService smartAlerts)
    {
        _db = db;
        _ai = ai;
        _smartAlerts = smartAlerts;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> GetMyAlerts()
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var alerts = await _db.SavedSearches
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(alerts.Select(a => ToDto(a, null)));
    }

    [HttpPost]
    public async Task<IActionResult> CreateAlert([FromBody] CreateSavedSearchDto dto)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var count = await _db.SavedSearches.CountAsync(s => s.UserId == userId);
        if (count >= MaxAlertsPerUser) return this.Error(400, $"Maximum {MaxAlertsPerUser} alerts allowed per user.");

        var alert = new SavedSearch { UserId = userId.Value, IsActive = true, CreatedAt = DateTime.UtcNow };
        var err = ApplyFields(alert, dto.Name, dto.QueryText, dto.Category, dto.Brand, dto.ModelKeyword,
            dto.MinPrice, dto.MaxPrice, dto.Conditions, dto.Location);
        if (err != null) return this.Error(400, err);

        _db.SavedSearches.Add(alert);
        await _db.SaveChangesAsync();

        // Check the listings that are already LIVE, not only future ones.
        var matches = await _smartAlerts.OnAlertSavedAsync(alert);

        return CreatedAtAction(nameof(GetMyAlerts), new { id = alert.Id }, ToDto(alert, matches));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAlert(int id, [FromBody] UpdateSavedSearchDto dto)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var alert = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (alert == null) return this.Error(404, "Alert not found.");

        var err = ApplyFields(alert, dto.Name, dto.QueryText, dto.Category, dto.Brand, dto.ModelKeyword,
            dto.MinPrice, dto.MaxPrice, dto.Conditions, dto.Location);
        if (err != null) return this.Error(400, err);

        await _db.SaveChangesAsync();

        var matches = await _smartAlerts.OnAlertSavedAsync(alert);
        return Ok(ToDto(alert, matches));
    }

    [HttpPatch("{id:int}/toggle")]
    public async Task<IActionResult> ToggleAlert(int id, [FromBody] ToggleSavedSearchDto dto)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var alert = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (alert == null) return this.Error(404, "Alert not found.");

        var wasActive = alert.IsActive;
        alert.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();

        // Turning an alert back on checks the current listings again.
        int? matches = !wasActive && alert.IsActive ? await _smartAlerts.OnAlertSavedAsync(alert) : null;
        return Ok(ToDto(alert, matches));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAlert(int id)
    {
        var userId = CurrentUserId;
        if (userId == null) return this.Error(401, "Please log in again.");

        var alert = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (alert == null) return this.Error(404, "Alert not found.");

        _db.SavedSearches.Remove(alert);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public class ParseAlertTextDto
    {
        public string? Text { get; set; }

        // Older mobile builds send "query" instead of "text".
        public string? Query { get; set; }
    }

    [HttpPost("parse")]
    public async Task<IActionResult> ParseAlert([FromBody] ParseAlertTextDto dto)
    {
        var text = TextNormalizer.CleanOrNull(dto.Text) ?? TextNormalizer.CleanOrNull(dto.Query);
        if (text == null) return this.Error(400, "Text is required.");

        var result = await _ai.ParseAlertTextAsync(text);
        if (result == null)
        {
            return this.Error(503, "AI service is unavailable right now. Please try again later.");
        }

        return Ok(result);
    }

    /// <summary>
    /// Clean and validate the alert fields, then copy them onto the entity.
    /// Empty strings become null, so "" never acts as a filter.
    /// </summary>
    private static string? ApplyFields(SavedSearch alert, string? name, string? queryText, string? category, string? brand,
        string? modelKeyword, decimal? minPrice, decimal? maxPrice, string? conditions, string? location)
    {
        var cleanCategory = TextNormalizer.CleanOrNull(category) is { } c ? TextNormalizer.NormalizeName(c) : null;
        var cleanBrand = TextNormalizer.CleanOrNull(brand) is { } b ? TextNormalizer.NormalizeName(b) : null;
        var cleanModel = TextNormalizer.CleanOrNull(modelKeyword);
        var cleanQuery = TextNormalizer.CleanOrNull(queryText);
        var cleanLocation = TextNormalizer.CleanOrNull(location);
        var cleanConditions = TextNormalizer.NormalizeConditions(conditions);

        if (minPrice is < 0 || maxPrice is < 0) return "Prices cannot be negative.";
        if (minPrice.HasValue && maxPrice.HasValue && maxPrice < minPrice)
            return "MaxPrice must be greater than or equal to MinPrice.";

        if (cleanConditions != null && cleanConditions.Split(',').Any(p => !AllowedConditions.Contains(p)))
            return "Invalid conditions. Allowed: new, like_new, excellent, good, fair, poor, for_parts.";

        // QueryText is only the original sentence (the matcher does not use it), so it does not count.
        var hasFilter = cleanCategory != null || cleanBrand != null || cleanModel != null ||
                        minPrice.HasValue || maxPrice.HasValue || cleanConditions != null || cleanLocation != null;
        if (!hasFilter) return "At least one filter must be set (category, brand, model, price, condition or location).";

        alert.Name = TextNormalizer.CleanOrNull(name)
                     ?? string.Join(' ', new[] { cleanBrand, cleanCategory, cleanModel }.Where(s => s != null)).Trim();
        if (string.IsNullOrEmpty(alert.Name)) alert.Name = "My alert";
        alert.QueryText = cleanQuery;
        alert.Category = cleanCategory;
        alert.Brand = cleanBrand;
        alert.ModelKeyword = cleanModel;
        alert.MinPrice = minPrice;
        alert.MaxPrice = maxPrice;
        alert.Conditions = cleanConditions;
        alert.Location = cleanLocation;
        return null;
    }

    private static AlertDto ToDto(SavedSearch a, int? newMatches) => new()
    {
        Id = a.Id,
        Name = a.Name,
        QueryText = a.QueryText,
        Category = a.Category,
        Brand = a.Brand,
        ModelKeyword = a.ModelKeyword,
        MinPrice = a.MinPrice,
        MaxPrice = a.MaxPrice,
        Conditions = a.Conditions,
        Location = a.Location,
        IsActive = a.IsActive,
        CreatedAt = a.CreatedAt,
        LastNotifiedAt = a.LastNotifiedAt,
        NewMatches = newMatches
    };
}
