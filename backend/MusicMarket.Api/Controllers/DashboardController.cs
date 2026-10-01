using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicMarket.Api.Constants;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    [HttpGet("buyer")]
    [Authorize(Roles = Roles.Buyer)]
    public IActionResult GetBuyerDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Buyer: {name} ({email})", Role = "buyer" });
    }


    [HttpGet("shop")]
    [Authorize(Roles = Roles.Shop)]
    public IActionResult GetShopDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Shop: {name} ({email})", Role = "shop" });
    }

    [HttpGet("admin")]
    [Authorize(Roles = Roles.Admin)]
    public IActionResult GetAdminDashboard()
    {
        var name = User.FindFirstValue(ClaimTypes.Name);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { Message = $"Welcome Admin: {name} ({email})", Role = "admin" });
    }
}
