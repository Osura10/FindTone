using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly CloudinaryDotNet.Cloudinary _cloudinary;

    public AuthController(AppDbContext db, IConfiguration cfg, CloudinaryDotNet.Cloudinary cloudinary)
    {
        _db = db;
        _cfg = cfg;
        _cloudinary = cloudinary;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromForm] RegisterDto dto)
    {
        var validRoles = new[] { "buyer", "seller", "shop", "admin" };
        var role = dto.Role?.ToLower();
        if (string.IsNullOrEmpty(role) || !validRoles.Contains(role))
        {
            return BadRequest("Invalid role. Must be buyer, seller, shop, or admin.");
        }

        var taken = await _db.Users.AnyAsync(u => u.Email == dto.Email);
        if (taken) return Conflict("Email already used");

        string? profileImageUrl = null;
        if (dto.ProfileImage != null && dto.ProfileImage.Length > 0)
        {
            using var stream = dto.ProfileImage.OpenReadStream();
            var uploadParams = new CloudinaryDotNet.Actions.ImageUploadParams
            {
                File = new CloudinaryDotNet.FileDescription(dto.ProfileImage.FileName, stream),
                Folder = "musicmarket/profiles"
            };
            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            profileImageUrl = uploadResult.SecureUrl?.ToString();
        }

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = role,
            PhoneNumber = dto.PhoneNumber,
            NicCardNumber = dto.NicCardNumber,
            OwnerName = dto.OwnerName,
            Address = dto.Address,
            ShopRegisterId = dto.ShopRegisterId,
            ProfileImageUrl = profileImageUrl
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { user.Id, user.Email, user.Role, user.ProfileImageUrl });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid credentials");
        }

        return Ok(new { token = CreateToken(user), role = user.Role });
    }
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
        {
            return Unauthorized("User ID not found in token");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user is null)
        {
            return NotFound("User not found");
        }

        return Ok(new
        {
            user.Name,
            user.Email,
            user.Role,
            user.PhoneNumber,
            user.OwnerName,
            user.Address,
            user.ShopRegisterId,
            user.ProfileImageUrl
        });
    }

    private string CreateToken(User user)
    {
        var jwt = _cfg.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
