using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicMarket.Api.Services;

namespace MusicMarket.Api.Controllers;

public class ShoppingAssistantChatDto
{
    public string Message { get; set; } = "";
    public string? SessionId { get; set; }
}

[ApiController]
[Route("api/shopping-assistant")]
[Authorize]
public class ShoppingAssistantController : ControllerBase
{
    private readonly AiServiceClient _ai;
    private readonly ILogger<ShoppingAssistantController> _logger;

    public ShoppingAssistantController(AiServiceClient ai, ILogger<ShoppingAssistantController> logger)
    {
        _ai = ai;
        _logger = logger;
    }

    [HttpPost("chat")]
    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ShoppingAssistantChatDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
        {
            return BadRequest(new { message = "Message is required." });
        }

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var result = await _ai.GetShoppingAssistantAsync(dto.Message, dto.SessionId, userId);
        if (result == null)
        {
            return StatusCode(503, new { message = "AI Shopping Assistant is currently unavailable. Please try again shortly." });
        }

        return Ok(result);
    }
}
