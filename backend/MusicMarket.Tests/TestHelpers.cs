using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MusicMarket.Api.Data;
using MusicMarket.Api.Models;
using MusicMarket.Api.Services;

namespace MusicMarket.Tests;

/// <summary>
/// AppDbContext on SQLite. SQLite has no decimal type, so decimals are stored as doubles here.
/// </summary>
public class SqliteAppDbContext : AppDbContext
{
    public SqliteAppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<decimal>().HaveConversion<double>();
    }
}

/// <summary>
/// Fake AI service: answers each /api/agents/* path with a canned JSON reply and records the calls.
/// </summary>
public class FakeAiHandler : HttpMessageHandler
{
    public List<(string Path, string Body)> Calls { get; } = [];
    public Dictionary<string, Func<string, object?>> Replies { get; } = new();

    public int CountCalls(string path) => Calls.Count(c => c.Path == path);

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri!.AbsolutePath;
        var body = request.Content == null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
        Calls.Add((path, body));

        if (!Replies.TryGetValue(path, out var reply))
        {
            return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
        }
        var json = JsonSerializer.Serialize(reply(body));
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    }
}

/// <summary>
/// One test world: SQLite DB, fake AI, services and helpers to build controllers as a given user.
/// </summary>
public sealed class TestWorld : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public FakeAiHandler Ai { get; } = new();
    public AiServiceClient AiClient { get; }
    public ServiceProvider Services { get; }
    public AppDbContext Db { get; }

    public User Seller { get; private set; } = null!;
    public User Watcher { get; private set; } = null!;
    public User Admin { get; private set; } = null!;

    public TestWorld()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;

        AiClient = new AiServiceClient(new HttpClient(Ai) { BaseAddress = new Uri("http://ai.test") }, NullLogger<AiServiceClient>.Instance);

        var services = new ServiceCollection();
        services.AddScoped<AppDbContext>(_ => NewContext());
        Services = services.BuildServiceProvider();

        Db = NewContext();
        Db.Database.EnsureCreated();
        SeedUsers();
    }

    public AppDbContext NewContext() => new SqliteAppDbContext(_options);

    private void SeedUsers()
    {
        Seller = new User { Name = "Seller", Email = "seller@test.lk", Role = "buyer", Approval = true, PhoneNumber = "0711111111", PasswordHash = "x" };
        Watcher = new User { Name = "Watcher", Email = "watcher@test.lk", Role = "buyer", Approval = true, PhoneNumber = "0722222222", PasswordHash = "x" };
        Admin = new User { Name = "Admin", Email = "admin@test.lk", Role = "admin", Approval = true, PasswordHash = "x" };
        Db.Users.AddRange(Seller, Watcher, Admin);
        Db.SaveChanges();
    }

    public Listing AddListing(string status = "LIVE", decimal price = 100000m, int images = 2, int? sellerId = null)
    {
        var listing = new Listing
        {
            SellerId = sellerId ?? Seller.Id,
            Title = "Yamaha F310 Acoustic",
            Category = "Acoustic Guitar",
            Brand = "Yamaha",
            Model = "F310",
            Condition = "good",
            Year = 2020,
            Price = price,
            Location = "Colombo",
            Latitude = 6.9,
            Longitude = 79.8,
            Description = "Nice guitar",
            Status = status,
            TrustScore = 85,
            AiReason = "All good",
            FairPrice = 40000m,
            FairPriceMin = 35000m,
            FairPriceMax = 45000m,
            PriceVerdict = "FAIR",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        for (var i = 0; i < images; i++)
        {
            listing.Images.Add(new ListingImage { Url = $"https://img.test/{i}.jpg", PublicId = $"local_{i}", SortOrder = i });
        }
        Db.Listings.Add(listing);
        Db.SaveChanges();
        return listing;
    }

    public SmartAlertService SmartAlerts() => new(AiClient, Services, NullLogger<SmartAlertService>.Instance);

    public ListingCheckService Checks() => new(Db, AiClient, NullLogger<ListingCheckService>.Instance);

    /// <summary>Attach a fake logged-in user (or anonymous when user is null) to a controller.</summary>
    public T As<T>(T controller, User? user) where T : ControllerBase
    {
        var identity = user == null
            ? new ClaimsIdentity()
            : new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role)
            }, "Test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    /// <summary>Serialize the way ASP.NET does (camelCase, runtime type) to check the JSON shape.</summary>
    public static string ToJson(object? value) =>
        value == null ? "null" : JsonSerializer.Serialize(value, value.GetType(), new JsonSerializerOptions(JsonSerializerDefaults.Web));

    /// <summary>Read the "message" of an error result and check its status code.</summary>
    public static string ErrorMessage(IActionResult result, int expectedStatus)
    {
        var obj = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(expectedStatus, obj.StatusCode);
        using var doc = JsonDocument.Parse(ToJson(obj.Value));
        return doc.RootElement.GetProperty("message").GetString()!;
    }

    // Canned AI replies.
    public void ReplyFairPrice(float fairPrice = 95000, string verdict = "FAIR") =>
        Ai.Replies["/api/agents/fair-price"] = _ => new
        {
            fair_price = fairPrice,
            fair_range = new { min = fairPrice * 0.88f, max = fairPrice * 1.12f },
            asking_price = 0,
            deviation_percent = 0,
            verdict,
            confidence = "medium",
            flag_for_trust = false,
            extras_detected = Array.Empty<string>(),
            explanation = "test",
            used_fallback = false
        };

    public void ReplyTrust(int score = 90, string decision = "LIVE") =>
        Ai.Replies["/api/agents/trust-check"] = body =>
        {
            var id = JsonDocument.Parse(body).RootElement.GetProperty("listing_id").GetInt32();
            return new
            {
                listing_id = id,
                trust_score = score,
                decision,
                warning = score is >= 40 and < 70,
                signals = Array.Empty<object>(),
                reason = "test reason",
                image_hashes = Array.Empty<object>(),
                duplicate_listing_ids = Array.Empty<int>(),
                used_fallback = false
            };
        };

    public void ReplyNoSmartAlerts() =>
        Ai.Replies["/api/agents/smart-alert"] = _ => new { listing_id = 0, @event = "", notifications = Array.Empty<object>(), matched_search_ids = Array.Empty<int>(), used_fallback = false };

    public void Dispose()
    {
        Db.Dispose();
        Services.Dispose();
        _connection.Dispose();
    }
}
