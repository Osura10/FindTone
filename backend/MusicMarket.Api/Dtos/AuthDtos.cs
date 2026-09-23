using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace MusicMarket.Api.Dtos;

public record RegisterDto(
    [Required, StringLength(80)] string Name, // Or Shop Name
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string Role, // buyer, shop, admin
    
    // Optional fields depending on the role
    string? PhoneNumber,
    string? NicCardNumber,
    string? OwnerName,
    string? Address,
    string? ShopRegisterId,
    IFormFile? ProfileImage
);

public record LoginDto(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record UpdatePhoneDto(
    [Required] string PhoneNumber
);

public record UpdatePasswordDto(
    [Required, MinLength(8)] string NewPassword
);

public record UpdateLocationDto(
    [Required] string Address
);

public record UpdateProfileImageDto(
    [Required] IFormFile ProfileImage
);
