using Microsoft.EntityFrameworkCore;
using MusicMarket.Api.Models;

namespace MusicMarket.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingImage> ListingImages => Set<ListingImage>();
    public DbSet<PriceHistory> PriceHistories => Set<PriceHistory>();
    public DbSet<CatalogModel> CatalogModels => Set<CatalogModel>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // User indexes & config
        builder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Listing indexes & relationships
        builder.Entity<Listing>(entity =>
        {
            entity.HasIndex(l => l.Status);
            entity.HasIndex(l => l.Category);
            entity.HasIndex(l => l.SellerId);

            entity.HasOne(l => l.Seller)
                .WithMany()
                .HasForeignKey(l => l.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(l => l.Images)
                .WithOne(img => img.Listing)
                .HasForeignKey(img => img.ListingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(l => l.PriceHistories)
                .WithOne(ph => ph.Listing)
                .HasForeignKey(ph => ph.ListingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CatalogModel configuration & unique index
        builder.Entity<CatalogModel>(entity =>
        {
            entity.HasIndex(c => new { c.Brand, c.Model })
                .IsUnique();

            // Note: Prices in LKR are approximate current market estimates and must be verified against vendor/import pricing.
            entity.HasData(
                // Acoustic Guitars
                new CatalogModel { Id = 1, Brand = "Yamaha", Model = "F310", Category = "Acoustic Guitar", Tier = "budget", NewPriceLkr = 48000m, ReleaseYear = 2001, IsCollectible = false },
                new CatalogModel { Id = 2, Brand = "Yamaha", Model = "FG800", Category = "Acoustic Guitar", Tier = "mid", NewPriceLkr = 95000m, ReleaseYear = 2016, IsCollectible = false },
                new CatalogModel { Id = 3, Brand = "Fender", Model = "CD-60S", Category = "Acoustic Guitar", Tier = "budget", NewPriceLkr = 68000m, ReleaseYear = 2017, IsCollectible = false },
                new CatalogModel { Id = 4, Brand = "Epiphone", Model = "DR-100", Category = "Acoustic Guitar", Tier = "budget", NewPriceLkr = 52000m, ReleaseYear = 2010, IsCollectible = false },
                new CatalogModel { Id = 5, Brand = "Gibson", Model = "J-45 Standard", Category = "Acoustic Guitar", Tier = "premium", NewPriceLkr = 850000m, ReleaseYear = 2020, IsCollectible = false },

                // Electric Guitars
                new CatalogModel { Id = 6, Brand = "Ibanez", Model = "GRX70QA", Category = "Electric Guitar", Tier = "budget", NewPriceLkr = 65000m, ReleaseYear = 2015, IsCollectible = false },
                new CatalogModel { Id = 7, Brand = "Ibanez", Model = "RG550 Genesis", Category = "Electric Guitar", Tier = "mid", NewPriceLkr = 320000m, ReleaseYear = 2018, IsCollectible = false },
                new CatalogModel { Id = 8, Brand = "Fender", Model = "Player Stratocaster", Category = "Electric Guitar", Tier = "mid", NewPriceLkr = 265000m, ReleaseYear = 2018, IsCollectible = false },
                new CatalogModel { Id = 9, Brand = "Epiphone", Model = "Les Paul Standard 60s", Category = "Electric Guitar", Tier = "mid", NewPriceLkr = 215000m, ReleaseYear = 2020, IsCollectible = false },
                new CatalogModel { Id = 10, Brand = "Gibson", Model = "Les Paul Standard 50s", Category = "Electric Guitar", Tier = "premium", NewPriceLkr = 890000m, ReleaseYear = 2019, IsCollectible = false },
                new CatalogModel { Id = 11, Brand = "Gibson", Model = "1959 Les Paul Standard Reissue", Category = "Electric Guitar", Tier = "premium", NewPriceLkr = 2200000m, ReleaseYear = 1959, IsCollectible = true },
                new CatalogModel { Id = 12, Brand = "Fender", Model = "1965 Stratocaster Relic Reissue", Category = "Electric Guitar", Tier = "premium", NewPriceLkr = 1450000m, ReleaseYear = 1965, IsCollectible = true },

                // Bass Guitars
                new CatalogModel { Id = 13, Brand = "Yamaha", Model = "TRBX174", Category = "Bass Guitar", Tier = "budget", NewPriceLkr = 78000m, ReleaseYear = 2014, IsCollectible = false },
                new CatalogModel { Id = 14, Brand = "Ibanez", Model = "SR300E", Category = "Bass Guitar", Tier = "mid", NewPriceLkr = 135000m, ReleaseYear = 2016, IsCollectible = false },
                new CatalogModel { Id = 15, Brand = "Fender", Model = "Player Jazz Bass", Category = "Bass Guitar", Tier = "mid", NewPriceLkr = 285000m, ReleaseYear = 2018, IsCollectible = false },

                // Keyboards
                new CatalogModel { Id = 16, Brand = "Casio", Model = "CT-S300", Category = "Keyboard", Tier = "budget", NewPriceLkr = 55000m, ReleaseYear = 2019, IsCollectible = false },
                new CatalogModel { Id = 17, Brand = "Yamaha", Model = "PSR-E373", Category = "Keyboard", Tier = "budget", NewPriceLkr = 82000m, ReleaseYear = 2020, IsCollectible = false },
                new CatalogModel { Id = 18, Brand = "Roland", Model = "XPS-10", Category = "Keyboard", Tier = "mid", NewPriceLkr = 220000m, ReleaseYear = 2013, IsCollectible = false },
                new CatalogModel { Id = 19, Brand = "Roland", Model = "XPS-30", Category = "Keyboard", Tier = "mid", NewPriceLkr = 340000m, ReleaseYear = 2016, IsCollectible = false },
                new CatalogModel { Id = 20, Brand = "Korg", Model = "Kross 2-61", Category = "Keyboard", Tier = "mid", NewPriceLkr = 275000m, ReleaseYear = 2017, IsCollectible = false },
                new CatalogModel { Id = 21, Brand = "Yamaha", Model = "Montage 8", Category = "Keyboard", Tier = "premium", NewPriceLkr = 1250000m, ReleaseYear = 2016, IsCollectible = false },

                // Drum Kits
                new CatalogModel { Id = 22, Brand = "Pearl", Model = "Roadshow 5-Piece", Category = "Drum Kit", Tier = "budget", NewPriceLkr = 210000m, ReleaseYear = 2015, IsCollectible = false },
                new CatalogModel { Id = 23, Brand = "Tama", Model = "Imperialstar 5-Piece", Category = "Drum Kit", Tier = "mid", NewPriceLkr = 295000m, ReleaseYear = 2019, IsCollectible = false },
                new CatalogModel { Id = 24, Brand = "Roland", Model = "TD-07KV V-Drums", Category = "Drum Kit", Tier = "mid", NewPriceLkr = 380000m, ReleaseYear = 2020, IsCollectible = false },
                new CatalogModel { Id = 25, Brand = "Pearl", Model = "Export EXX", Category = "Drum Kit", Tier = "mid", NewPriceLkr = 340000m, ReleaseYear = 2018, IsCollectible = false },

                // Microphones
                new CatalogModel { Id = 26, Brand = "Audio-Technica", Model = "AT2020", Category = "Microphone", Tier = "budget", NewPriceLkr = 34000m, ReleaseYear = 2004, IsCollectible = false },
                new CatalogModel { Id = 27, Brand = "Shure", Model = "SM58", Category = "Microphone", Tier = "mid", NewPriceLkr = 38000m, ReleaseYear = 1966, IsCollectible = false },
                new CatalogModel { Id = 28, Brand = "Shure", Model = "SM7B", Category = "Microphone", Tier = "premium", NewPriceLkr = 145000m, ReleaseYear = 2001, IsCollectible = false },

                // Amplifiers
                new CatalogModel { Id = 29, Brand = "Boss", Model = "Katana-50 MkII", Category = "Amplifier", Tier = "budget", NewPriceLkr = 88000m, ReleaseYear = 2019, IsCollectible = false },
                new CatalogModel { Id = 30, Brand = "Marshall", Model = "DSL40CR", Category = "Amplifier", Tier = "premium", NewPriceLkr = 320000m, ReleaseYear = 2018, IsCollectible = false }
            );
        });
    }
}
