using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    [HttpGet("buyer")]
    [Authorize(Roles = "buyer")]
    public IActionResult GetBuyerDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Buyer: {name} ({email})", Role = "buyer" });
    }

    [HttpGet("seller")]
    [Authorize(Roles = "seller")]
    public IActionResult GetSellerDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Seller: {name} ({email})", Role = "seller" });
    }

    [HttpGet("shop")]
    [Authorize(Roles = "shop")]
    public IActionResult GetShopDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Shop: {name} ({email})", Role = "shop" });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "admin")]
    public IActionResult GetAdminDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Admin: {name} ({email})", Role = "admin" });
    }
}
