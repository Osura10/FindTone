using Microsoft.AspNetCore.Mvc;

namespace MusicMarket.Api.Helpers;

/// <summary>
/// The one error body the API uses: {"message": "..."}.
/// </summary>
public record ErrorResponse(string Message);

public static class ApiError
{
    /// <summary>
    /// Return an error as JSON {"message": "..."} with the given status code.
    /// Use this instead of BadRequest("text"), NotFound() or Forbid().
    /// </summary>
    public static ObjectResult Error(this ControllerBase controller, int statusCode, string message)
        => controller.StatusCode(statusCode, new ErrorResponse(message));
}
