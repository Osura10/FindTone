using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Controllers;
using MusicMarket.Api.Dtos;

namespace MusicMarket.Tests;

public class OrderTests : IDisposable
{
    private readonly TestWorld _w = new();

    private OrdersController Controller(MusicMarket.Api.Models.User user) => _w.As(new OrdersController(_w.Db), user);

    private static CreateOrderDto Order(int listingId, string method = "COD", CardDto? card = null) => new()
    {
        ListingId = listingId,
        PaymentMethod = method,
        FullName = "Test Buyer",
        Phone = "0712345678",
        AddressLine = "1 Main Street",
        City = "Colombo",
        Card = card
    };

    private static CardDto Card(string number = "1234 1234 1234 1234", string expiry = "12/99", string cvv = "123") =>
        new() { Number = number, HolderName = "Test Buyer", Expiry = expiry, Cvv = cvv };

    [Fact]
    public async Task Cash_on_delivery_marks_sold_and_notifies_both_parties()
    {
        var listing = _w.AddListing(price: 75000m);

        var result = await Controller(_w.Watcher).CreateOrder(Order(listing.Id));

        var ok = Assert.IsType<OkObjectResult>(result);
        using var body = JsonDocument.Parse(TestWorld.ToJson(ok.Value));
        var orderId = body.RootElement.GetProperty("orderId").GetInt32();
        Assert.True(orderId > 0);

        using var db = _w.NewContext();
        var saved = await db.Listings.SingleAsync(l => l.Id == listing.Id);
        Assert.Equal("SOLD", saved.Status);
        Assert.Equal(75000m, saved.SoldPrice);
        var order = await db.Orders.SingleAsync();
        Assert.Equal("CONFIRMED_COD", order.Status);
        Assert.Null(order.CardLast4);

        var types = await db.Notifications.Select(n => new { n.UserId, n.Type }).ToListAsync();
        Assert.Contains(types, t => t.UserId == _w.Seller.Id && t.Type == "ITEM_SOLD");
        Assert.Contains(types, t => t.UserId == _w.Watcher.Id && t.Type == "ORDER_PLACED");
    }

    [Fact]
    public async Task Card_payment_is_paid_and_stores_only_last_four_digits()
    {
        var listing = _w.AddListing();
        Assert.IsType<OkObjectResult>(await Controller(_w.Watcher).CreateOrder(Order(listing.Id, "CARD", Card())));

        using var db = _w.NewContext();
        var order = await db.Orders.SingleAsync();
        Assert.Equal("PAID", order.Status);
        Assert.Equal("1234", order.CardLast4);
    }

    [Fact]
    public async Task Second_order_for_the_same_listing_gets_409()
    {
        var listing = _w.AddListing();
        Assert.IsType<OkObjectResult>(await Controller(_w.Watcher).CreateOrder(Order(listing.Id)));

        var again = await Controller(_w.Watcher).CreateOrder(Order(listing.Id));
        Assert.Equal("This item has already been sold.", TestWorld.ErrorMessage(again, 409));
    }

    [Fact]
    public async Task Cannot_buy_own_listing_and_admin_cannot_buy()
    {
        var listing = _w.AddListing();
        Assert.Equal("You cannot buy your own listing.", TestWorld.ErrorMessage(await Controller(_w.Seller).CreateOrder(Order(listing.Id)), 403));
        Assert.Equal("Admin accounts cannot place orders.", TestWorld.ErrorMessage(await Controller(_w.Admin).CreateOrder(Order(listing.Id)), 403));
    }

    [Fact]
    public async Task Not_live_listing_cannot_be_bought()
    {
        var listing = _w.AddListing(status: "FLAGGED");
        Assert.Equal("This listing is not available for purchase.", TestWorld.ErrorMessage(await Controller(_w.Watcher).CreateOrder(Order(listing.Id)), 409));
    }

    [Theory]
    [InlineData("4111 1111 1111 1111", "12/99", "123", "Invalid demo card number. Use 1234 1234 1234 1234.")]
    [InlineData("1234 1234 1234 1234", "01/20", "123", "Card expired.")]
    [InlineData("1234 1234 1234 1234", "13/99", "123", "Invalid expiry. Use MM/YY.")]
    [InlineData("1234 1234 1234 1234", "12/99", "12", "Invalid CVV. It must be 3 digits.")]
    [InlineData("1234 1234 1234 1234", "12/99", "abc", "Invalid CVV. It must be 3 digits.")]
    public async Task Card_validation_messages(string number, string expiry, string cvv, string expected)
    {
        var listing = _w.AddListing();
        var result = await Controller(_w.Watcher).CreateOrder(Order(listing.Id, "CARD", Card(number, expiry, cvv)));
        Assert.Equal(expected, TestWorld.ErrorMessage(result, 400));

        using var db = _w.NewContext();
        Assert.Equal("LIVE", (await db.Listings.SingleAsync(l => l.Id == listing.Id)).Status);
    }

    [Fact]
    public async Task Missing_fields_and_bad_method_are_rejected()
    {
        var listing = _w.AddListing();
        var missing = Order(listing.Id);
        missing.City = "";
        Assert.StartsWith("Full name, phone, address, city", TestWorld.ErrorMessage(await Controller(_w.Watcher).CreateOrder(missing), 400));
        Assert.Equal("Card details are required for CARD payment method.", TestWorld.ErrorMessage(await Controller(_w.Watcher).CreateOrder(Order(listing.Id, "CARD")), 400));
        Assert.Equal("Invalid payment method. Use CARD or COD.", TestWorld.ErrorMessage(await Controller(_w.Watcher).CreateOrder(Order(listing.Id, "PAYPAL")), 400));
    }

    [Fact]
    public async Task Buyer_who_sells_can_see_their_sales()
    {
        var listing = _w.AddListing();
        await Controller(_w.Watcher).CreateOrder(Order(listing.Id));

        // The seller in this test has the "buyer" role: sales must still be visible.
        var sales = await Controller(_w.Seller).GetMySales();
        var list = Assert.IsType<List<OrderDto>>(Assert.IsType<OkObjectResult>(sales).Value);
        Assert.Single(list);
    }

    public void Dispose() => _w.Dispose();
}
