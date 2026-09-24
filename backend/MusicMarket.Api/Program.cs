using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MusicMarket.Api.Data;
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
builder.Services.AddControllers();
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
        ValidateLifetime = true
    });

builder.Services.AddAuthorization();

// AI Service typed HttpClient
var aiBaseUrl = Environment.GetEnvironmentVariable("AI_SERVICE_URL") ?? "http://localhost:8000";
var aiInternalKey = Environment.GetEnvironmentVariable("AI_INTERNAL_KEY") ?? "";

builder.Services.AddHttpClient<AiServiceClient>(client =>
{
    client.BaseAddress = new Uri(aiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(60);
    if (!string.IsNullOrEmpty(aiInternalKey))
    {
        client.DefaultRequestHeaders.Add("X-Internal-Key", aiInternalKey);
    }
});

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

