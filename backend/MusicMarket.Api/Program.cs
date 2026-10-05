using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using MusicMarket.Api.Data;
using MusicMarket.Api.Helpers;
using MusicMarket.Api.Services;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load .env file
Env.Load();

// Cloudinary
var cloudinaryUrl = Environment.GetEnvironmentVariable("CLOUDINARY_URL") 
                    ?? throw new InvalidOperationException("CLOUDINARY_URL is not configured in .env");
CloudinaryDotNet.Cloudinary cloudinary = new CloudinaryDotNet.Cloudinary(cloudinaryUrl);
cloudinary.Api.Secure = true;
builder.Services.AddSingleton(cloudinary);

// Add services to the container.
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Model validation errors use the same {"message": "..."} body as every other error.
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState.Where(e => e.Value?.Errors.Count > 0).ToList();

            // A bad JSON value (e.g. "price": "abc") is reported under "$.price": name that field.
            var badJson = errors.FirstOrDefault(e => e.Key.StartsWith("$."));
            string message;
            if (badJson.Key != null)
            {
                message = $"Invalid value for '{badJson.Key[2..]}'.";
            }
            else
            {
                message = errors
                    .Select(e => $"{e.Key}: {e.Value!.Errors[0].ErrorMessage}".TrimStart(':', ' '))
                    .FirstOrDefault() ?? "The request is not valid.";
            }
            return new BadRequestObjectResult(new ErrorResponse(message));
        };
    });
builder.Services.AddEndpointsApiExplorer();

// Database
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URI") 
                       ?? builder.Configuration.GetConnectionString("Default");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connectionString));

// JWT Authentication
var jwt = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwt["Key"]!);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt => opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwt["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwt["Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateLifetime = true,
        RoleClaimType = ClaimTypes.Role
    });

builder.Services.AddAuthorization();

// AI Service typed HttpClient
var aiBaseUrl = Environment.GetEnvironmentVariable("AI_SERVICE_URL") ?? "http://localhost:8000";
var aiInternalKey = Environment.GetEnvironmentVariable("AI_INTERNAL_KEY") ?? "";

builder.Services.AddHttpClient<AiServiceClient>(client =>
{
    client.BaseAddress = new Uri(aiBaseUrl);
    client.Timeout = TimeSpan.FromMinutes(5);
    if (!string.IsNullOrEmpty(aiInternalKey))
    {
        client.DefaultRequestHeaders.Add("X-Internal-Key", aiInternalKey);
    }
});

builder.Services.AddScoped<SmartAlertService>();
builder.Services.AddScoped<ListingCheckService>();

// CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

// Swagger with JWT Support
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste ONLY the token - no 'Bearer ' prefix."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Automatically apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Any unhandled exception -> 500 with {"message": "..."} (details go to the log, not the client).
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    logger.LogError(error, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new ErrorResponse("Something went wrong on the server. Please try again."));
}));

// Errors without a body (401 from JWT, 403 from roles, 404 unknown route, 405, 415) -> {"message": "..."}.
app.UseStatusCodePages(async statusContext =>
{
    var response = statusContext.HttpContext.Response;
    var message = response.StatusCode switch
    {
        401 => "Please log in to continue.",
        403 => "You do not have permission to do this.",
        404 => "The requested resource was not found.",
        405 => "This HTTP method is not allowed here.",
        415 => "Unsupported content type.",
        _ => ReasonPhrases.GetReasonPhrase(response.StatusCode)
    };
    await response.WriteAsJsonAsync(new ErrorResponse(message));
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok("Healthy"));

app.MapControllers();

app.Run();

