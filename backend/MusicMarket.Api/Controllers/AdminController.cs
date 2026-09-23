using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Data;
using MusicMarket.Api.Dtos;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CloudinaryDotNet.Cloudinary _cloudinary;

    public AdminController(AppDbContext db, CloudinaryDotNet.Cloudinary cloudinary)
    {
        _db = db;
        _cloudinary = cloudinary;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalBuyers = await _db.Users.CountAsync(u => u.Role.ToLower() == "buyer");
        var approvedShops = await _db.Users.CountAsync(u => u.Role.ToLower() == "shop" && u.Approval);
        var pendingShops = await _db.Users.CountAsync(u => u.Role.ToLower() == "shop" && !u.Approval);
        var approvedAdmins = await _db.Users.CountAsync(u => u.Role.ToLower() == "admin" && u.Approval);
        var pendingAdmins = await _db.Users.CountAsync(u => u.Role.ToLower() == "admin" && !u.Approval);
        var totalUsers = await _db.Users.CountAsync();

        return Ok(new AdminStatsDto(
            TotalBuyers: totalBuyers,
            ApprovedShops: approvedShops,
            PendingShops: pendingShops,
            ApprovedAdmins: approvedAdmins,
            PendingAdmins: pendingAdmins,
            TotalUsers: totalUsers
        ));
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] bool? approval)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var normalizedRole = role.Trim().ToLower();
            query = query.Where(u => u.Role.ToLower() == normalizedRole);
        }

        if (approval.HasValue)
        {
            query = query.Where(u => u.Approval == approval.Value);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.ToLower(),
                u.Approval,
                u.PhoneNumber,
                u.NicCardNumber,
                u.OwnerName,
                u.Address,
                u.ShopRegisterId,
                u.ProfileImageUrl,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("users/{id:int}/approval")]
    public async Task<IActionResult> UpdateApproval(int id, [FromBody] UpdateApprovalDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(new { message = "User not found" });
        }

        user.Approval = dto.Approval;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"User approval status updated to {(dto.Approval ? "Approved" : "Pending")}",
            user.Id,
            user.Approval
        });
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(new { message = "User not found" });
        }

        // Delete user's Cloudinary profile image if exists
        await DeleteCloudinaryImage(user.ProfileImageUrl);

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = "User deleted successfully", id });
    }

    [HttpPost("create-admin")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email) || 
            string.IsNullOrWhiteSpace(dto.PhoneNumber) || string.IsNullOrWhiteSpace(dto.NicCardNumber))
        {
            return BadRequest(new { message = "Name, email, phone number, and NIC card number are all required." });
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var emailTaken = await _db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailTaken)
        {
            return Conflict(new { message = "An account with this email address already exists." });
        }

        var admin = new User
        {
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NicCardNumber.Trim()),
            Role = "admin",
            Approval = true,
            PhoneNumber = dto.PhoneNumber.Trim(),
            NicCardNumber = dto.NicCardNumber.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(admin);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            message = "Administrator created successfully. Default password is set to NIC number.",
            admin = new
            {
                admin.Id,
                admin.Name,
                admin.Email,
                Role = admin.Role.ToLower(),
                admin.Approval,
                admin.PhoneNumber,
                admin.NicCardNumber,
                admin.CreatedAt
            }
        });
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
                publicId = publicId.Replace("\\", "/");

                await _cloudinary.DestroyAsync(new CloudinaryDotNet.Actions.DeletionParams(publicId));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to delete cloudinary image: {ex.Message}");
        }
    }
}
