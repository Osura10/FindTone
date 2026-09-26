using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;
using MusicMarket.Api.Services;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly HashSet<string> AllowedConditions = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "like_new", "excellent", "good", "fair", "poor", "for_parts"
    };

    private readonly AiServiceClient _ai;

    public AlertsController(AppDbContext db, AiServiceClient ai)
    {
        _db = db;
        _ai = ai;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyAlerts()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var alerts = await _db.SavedSearches
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(alerts);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAlert([FromBody] CreateSavedSearchDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var count = await _db.SavedSearches.CountAsync(s => s.UserId == userId);
        if (count >= 10) return BadRequest("Maximum 10 alerts allowed per user.");

        var err = ValidateAlertData(dto.MinPrice, dto.MaxPrice, dto.Conditions, dto.Category, dto.Brand, dto.ModelKeyword, dto.QueryText);
        if (err != null) return BadRequest(err);

        var alert = new SavedSearch
        {
            UserId = userId,
            Name = dto.Name,
            QueryText = dto.QueryText,
            Category = dto.Category,
            Brand = dto.Brand,
            ModelKeyword = dto.ModelKeyword,
            MinPrice = dto.MinPrice,
            MaxPrice = dto.MaxPrice,
            Conditions = dto.Conditions,
            Location = dto.Location,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.SavedSearches.Add(alert);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyAlerts), new { id = alert.Id }, alert);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAlert(int id, [FromBody] UpdateSavedSearchDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var alert = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (alert == null) return NotFound();

        var err = ValidateAlertData(dto.MinPrice, dto.MaxPrice, dto.Conditions, dto.Category, dto.Brand, dto.ModelKeyword, dto.QueryText);
        if (err != null) return BadRequest(err);

        alert.Name = dto.Name;
        alert.QueryText = dto.QueryText;
        alert.Category = dto.Category;
        alert.Brand = dto.Brand;
        alert.ModelKeyword = dto.ModelKeyword;
        alert.MinPrice = dto.MinPrice;
        alert.MaxPrice = dto.MaxPrice;
        alert.Conditions = dto.Conditions;
        alert.Location = dto.Location;

        await _db.SaveChangesAsync();
        return Ok(alert);
    }

    [HttpPatch("{id:int}/toggle")]
    public async Task<IActionResult> ToggleAlert(int id, [FromBody] ToggleSavedSearchDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var alert = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (alert == null) return NotFound();

        alert.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        return Ok(alert);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAlert(int id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

        var alert = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (alert == null) return NotFound();

        _db.SavedSearches.Remove(alert);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public class ParseAlertTextDto
    {
        public string Text { get; set; } = "";
    }

    [HttpPost("parse")]
    public async Task<IActionResult> ParseAlert([FromBody] ParseAlertTextDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text)) return BadRequest(new { message = "Text is required." });

        var result = await _ai.ParseAlertTextAsync(dto.Text);
        if (result == null)
        {
            return StatusCode(503, new { message = "AI service is unavailable right now. Please try again later." });
        }

        return Ok(result);
    }

    private string? ValidateAlertData(decimal? minPrice, decimal? maxPrice, string? conditions, string? category, string? brand, string? model, string? queryText)
    {
        if (minPrice.HasValue && maxPrice.HasValue && maxPrice < minPrice)
            return "MaxPrice must be greater than or equal to MinPrice.";

        if (!string.IsNullOrWhiteSpace(conditions))
        {
            var parts = conditions.Split(',').Select(p => p.Trim().ToLower()).ToList();
            if (parts.Any(p => !AllowedConditions.Contains(p)))
                return "Invalid conditions. Allowed: new, like_new, excellent, good, fair, poor, for_parts.";
        }

        bool hasFilter = !string.IsNullOrWhiteSpace(category) || 
                         !string.IsNullOrWhiteSpace(brand) || 
                         !string.IsNullOrWhiteSpace(model) || 
                         !string.IsNullOrWhiteSpace(queryText) ||
                         minPrice.HasValue || maxPrice.HasValue || 
                         !string.IsNullOrWhiteSpace(conditions);

        if (!hasFilter)
            return "At least one filter must be set.";

        return null;
    }
}
