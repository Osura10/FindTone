using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace MusicMarket.Api.Dtos;

public record RegisterDto(
    [Required, StringLength(80)] string Name, // Or Shop Name
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string Role, // buyer, seller, shop, admin
    
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
