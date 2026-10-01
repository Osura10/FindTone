using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using MusicMarket.Api.Controllers;
using MusicMarket.Api.Dtos;

namespace MusicMarket.Tests;

/// <summary>
/// Trust score, AI reason and fair-price fields are only for the owner and admins.
/// </summary>
public class ListingVisibilityTests : IDisposable
{
    private static readonly string[] PrivateFields = ["trustScore", "aiReason", "priceVerdict", "fairPrice", "fairPriceMin", "fairPriceMax", "priceExplanation"];

    private readonly TestWorld _w = new();

    private ListingsController Controller(MusicMarket.Api.Models.User? user) =>
        _w.As(new ListingsController(_w.Db, _w.Services, _w.AiClient, _w.Checks(), _w.SmartAlerts(),
            NullLogger<ListingsController>.Instance), user);

    private static void AssertNoPrivateFields(object? value)
    {
        var json = TestWorld.ToJson(value);
        foreach (var field in PrivateFields)
        {
            Assert.DoesNotContain($"\"{field}\"", json);
        }
    }

    [Theory]
    [InlineData(false)] // anonymous
    [InlineData(true)]  // another logged-in user
    public async Task Public_details_hide_ai_fields(bool loggedIn)
    {
        var listing = _w.AddListing();
        var result = await Controller(loggedIn ? _w.Watcher : null).GetListingById(listing.Id);

        var value = Assert.IsType<OkObjectResult>(result).Value;
        Assert.IsNotType<ListingDetailDto>(value);
        AssertNoPrivateFields(value);
        var dto = Assert.IsType<PublicListingDetailDto>(value);
        Assert.Equal("Seller", dto.SellerName);
        Assert.Equal(loggedIn ? "0711111111" : null, dto.SellerPhone);
    }

    [Fact]
    public async Task Owner_and_admin_details_include_ai_fields()
    {
        var listing = _w.AddListing();
        foreach (var user in new[] { _w.Seller, _w.Admin })
        {
            var result = await Controller(user).GetListingById(listing.Id);
            var dto = Assert.IsType<ListingDetailDto>(Assert.IsType<OkObjectResult>(result).Value);
            Assert.Equal(85, dto.TrustScore);
            Assert.Equal("FAIR", dto.PriceVerdict);
            Assert.Equal(35000m, dto.FairPriceMin);
            Assert.Contains("\"trustScore\":85", TestWorld.ToJson(dto));
        }
    }

    [Theory]
    [InlineData("FLAGGED")]
    [InlineData("PENDING")]
    [InlineData("REJECTED")]
    public async Task Hidden_statuses_are_404_for_the_public_but_visible_to_owner(string status)
    {
        var listing = _w.AddListing(status: status);
        TestWorld.ErrorMessage(await Controller(_w.Watcher).GetListingById(listing.Id), 404);
        Assert.IsType<OkObjectResult>(await Controller(_w.Seller).GetListingById(listing.Id));
    }

    [Fact]
    public async Task Public_list_hides_ai_fields_and_non_public_statuses()
    {
        var live = _w.AddListing();
        var flagged = _w.AddListing(status: "FLAGGED");

        // Even asking for status=all must not reveal FLAGGED listings to the public.
        var result = await Controller(null).GetListings(null, null, null, null, null, null, status: "all");
        var page = Assert.IsType<PagedResult<PublicListingSummaryDto>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Contains(page.Items, i => i.Id == live.Id);
        Assert.DoesNotContain(page.Items, i => i.Id == flagged.Id);
        AssertNoPrivateFields(page);
    }

    [Fact]
    public async Task Search_q_matches_title_brand_model_case_insensitively()
    {
        _w.AddListing();
        var result = await Controller(null).GetListings("yamaha f3", null, null, null, null, null);
        var page = Assert.IsType<PagedResult<PublicListingSummaryDto>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Single(page.Items);

        var none = await Controller(null).GetListings("fender", null, null, null, null, null);
        Assert.Empty(Assert.IsType<PagedResult<PublicListingSummaryDto>>(Assert.IsType<OkObjectResult>(none).Value).Items);
    }

    [Fact]
    public async Task My_listings_and_admin_list_include_ai_fields()
    {
        _w.AddListing(status: "FLAGGED");

        var mine = await Controller(_w.Seller).GetMyListings();
        var items = Assert.IsType<List<ListingSummaryDto>>(Assert.IsType<OkObjectResult>(mine).Value);
        Assert.Equal(85, Assert.Single(items).TrustScore);

        var admin = await Controller(_w.Admin).GetListings(null, null, null, null, null, null, status: "FLAGGED");
        var page = Assert.IsType<PagedResult<ListingSummaryDto>>(Assert.IsType<OkObjectResult>(admin).Value);
        Assert.Equal(85, Assert.Single(page.Items).TrustScore);
    }

    public void Dispose() => _w.Dispose();
}
