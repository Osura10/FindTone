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
        var validRoles = new[] { "buyer", "shop" };
        var role = dto.Role?.ToLower();
        if (string.IsNullOrEmpty(role) || !validRoles.Contains(role))
        {
            return BadRequest("Invalid role. Must be buyer or shop.");
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
            Approval = (role == "buyer"), // Buyer gets true, Shop gets false
            PhoneNumber = dto.PhoneNumber,
            NicCardNumber = dto.NicCardNumber,
            OwnerName = dto.OwnerName,
            Address = dto.Address,
            ShopRegisterId = dto.ShopRegisterId,
            ProfileImageUrl = profileImageUrl
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { user.Id, user.Email, user.Role, user.Approval, user.ProfileImageUrl });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (!user.Approval)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { 
                message = "Please wait until your account is verified. Your account approval is currently pending.",
                pendingApproval = true 
            });
        }

        bool isDefaultPassword = !string.IsNullOrEmpty(user.NicCardNumber) && BCrypt.Net.BCrypt.Verify(user.NicCardNumber, user.PasswordHash);

        return Ok(new { 
            token = CreateToken(user), 
            role = user.Role.ToLower(), 
            approval = user.Approval,
            isDefaultPassword
        });
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

        bool isDefaultPassword = !string.IsNullOrEmpty(user.NicCardNumber) && BCrypt.Net.BCrypt.Verify(user.NicCardNumber, user.PasswordHash);

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            Role = user.Role.ToLower(),
            user.Approval,
            user.PhoneNumber,
            user.NicCardNumber,
            user.OwnerName,
            user.Address,
            user.ShopRegisterId,
            user.ProfileImageUrl,
            isDefaultPassword
        });
    }

    [Authorize]
    [HttpPut("profile/phone")]
    public async Task<IActionResult> UpdatePhone([FromBody] UpdatePhoneDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound("User not found");

        user.PhoneNumber = dto.PhoneNumber;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Phone number updated" });
    }

    [Authorize]
    [HttpPut("profile/password")]
    public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound("User not found");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password updated" });
    }

    [Authorize]
    [HttpPut("profile/location")]
    public async Task<IActionResult> UpdateLocation([FromBody] UpdateLocationDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound("User not found");

        user.Address = dto.Address;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Location updated" });
    }

    [Authorize]
    [HttpPut("profile/image")]
    public async Task<IActionResult> UpdateProfileImage([FromForm] UpdateProfileImageDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound("User not found");

        if (dto.ProfileImage == null || dto.ProfileImage.Length == 0)
        {
            return BadRequest("No image provided");
        }

        // Delete old image
        await DeleteCloudinaryImage(user.ProfileImageUrl);

        // Upload new image
        using var stream = dto.ProfileImage.OpenReadStream();
        var uploadParams = new CloudinaryDotNet.Actions.ImageUploadParams
        {
            File = new CloudinaryDotNet.FileDescription(dto.ProfileImage.FileName, stream),
            Folder = "musicmarket/profiles"
        };
        var uploadResult = await _cloudinary.UploadAsync(uploadParams);
        user.ProfileImageUrl = uploadResult.SecureUrl?.ToString();

        await _db.SaveChangesAsync();

        return Ok(new { message = "Profile image updated", profileImageUrl = user.ProfileImageUrl });
    }

    [Authorize]
    [HttpDelete("profile/image")]
    public async Task<IActionResult> DeleteProfileImage()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound("User not found");

        // Delete old image
        await DeleteCloudinaryImage(user.ProfileImageUrl);

        user.ProfileImageUrl = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Profile image deleted" });
    }

    [Authorize]
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound("User not found");

        // Delete profile image from Cloudinary if exists
        await DeleteCloudinaryImage(user.ProfileImageUrl);

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Account deleted successfully" });
    }

    private async Task DeleteCloudinaryImage(string? imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl)) return;
        
        try
        {
            var uri = new Uri(imageUrl);
            var segments = uri.AbsolutePath.Split('/');
            
            int index = Array.IndexOf(segments, "musicmarket");
            if (index != -1)
            {
                var relevantSegments = segments.Skip(index);
                var publicIdWithExtension = string.Join("/", relevantSegments);
                var publicId = System.IO.Path.ChangeExtension(publicIdWithExtension, null);
                
                // For Windows we might need to replace backslashes if ChangeExtension added them
                publicId = publicId.Replace("\\", "/");
                
                await _cloudinary.DestroyAsync(new CloudinaryDotNet.Actions.DeletionParams(publicId));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to delete cloudinary image: {ex.Message}");
        }
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
