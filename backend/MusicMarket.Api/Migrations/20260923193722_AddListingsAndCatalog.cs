using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MusicMarket.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddListingsAndCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CatalogModels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Brand = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Tier = table.Column<string>(type: "text", nullable: false),
                    NewPriceLkr = table.Column<decimal>(type: "numeric", nullable: false),
                    ReleaseYear = table.Column<int>(type: "integer", nullable: true),
                    IsCollectible = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogModels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Listings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SellerId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Brand = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    Condition = table.Column<string>(type: "text", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: true),
                    ListingType = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric", nullable: false),
                    Location = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    SoldPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    SoldAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FairPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    FairPriceMin = table.Column<decimal>(type: "numeric", nullable: true),
                    FairPriceMax = table.Column<decimal>(type: "numeric", nullable: true),
                    PriceVerdict = table.Column<string>(type: "text", nullable: true),
                    PriceDeviationPercent = table.Column<double>(type: "double precision", nullable: true),
                    PriceConfidence = table.Column<string>(type: "text", nullable: true),
                    PriceExplanation = table.Column<string>(type: "text", nullable: true),
                    TrustScore = table.Column<int>(type: "integer", nullable: true),
                    AiReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Listings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Listings_Users_SellerId",
                        column: x => x.SellerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ListingImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ListingId = table.Column<int>(type: "integer", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    PublicId = table.Column<string>(type: "text", nullable: false),
                    PHash = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListingImages_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PriceHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ListingId = table.Column<int>(type: "integer", nullable: false),
                    OldPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    NewPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceHistories_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "CatalogModels",
                columns: new[] { "Id", "Brand", "Category", "IsCollectible", "Model", "NewPriceLkr", "ReleaseYear", "Tier" },
                values: new object[,]
                {
                    { 1, "Yamaha", "Acoustic Guitar", false, "F310", 48000m, 2001, "budget" },
                    { 2, "Yamaha", "Acoustic Guitar", false, "FG800", 95000m, 2016, "mid" },
                    { 3, "Fender", "Acoustic Guitar", false, "CD-60S", 68000m, 2017, "budget" },
                    { 4, "Epiphone", "Acoustic Guitar", false, "DR-100", 52000m, 2010, "budget" },
                    { 5, "Gibson", "Acoustic Guitar", false, "J-45 Standard", 850000m, 2020, "premium" },
                    { 6, "Ibanez", "Electric Guitar", false, "GRX70QA", 65000m, 2015, "budget" },
                    { 7, "Ibanez", "Electric Guitar", false, "RG550 Genesis", 320000m, 2018, "mid" },
                    { 8, "Fender", "Electric Guitar", false, "Player Stratocaster", 265000m, 2018, "mid" },
                    { 9, "Epiphone", "Electric Guitar", false, "Les Paul Standard 60s", 215000m, 2020, "mid" },
                    { 10, "Gibson", "Electric Guitar", false, "Les Paul Standard 50s", 890000m, 2019, "premium" },
                    { 11, "Gibson", "Electric Guitar", true, "1959 Les Paul Standard Reissue", 2200000m, 1959, "premium" },
                    { 12, "Fender", "Electric Guitar", true, "1965 Stratocaster Relic Reissue", 1450000m, 1965, "premium" },
                    { 13, "Yamaha", "Bass Guitar", false, "TRBX174", 78000m, 2014, "budget" },
                    { 14, "Ibanez", "Bass Guitar", false, "SR300E", 135000m, 2016, "mid" },
                    { 15, "Fender", "Bass Guitar", false, "Player Jazz Bass", 285000m, 2018, "mid" },
                    { 16, "Casio", "Keyboard", false, "CT-S300", 55000m, 2019, "budget" },
                    { 17, "Yamaha", "Keyboard", false, "PSR-E373", 82000m, 2020, "budget" },
                    { 18, "Roland", "Keyboard", false, "XPS-10", 220000m, 2013, "mid" },
                    { 19, "Roland", "Keyboard", false, "XPS-30", 340000m, 2016, "mid" },
                    { 20, "Korg", "Keyboard", false, "Kross 2-61", 275000m, 2017, "mid" },
                    { 21, "Yamaha", "Keyboard", false, "Montage 8", 1250000m, 2016, "premium" },
                    { 22, "Pearl", "Drum Kit", false, "Roadshow 5-Piece", 210000m, 2015, "budget" },
                    { 23, "Tama", "Drum Kit", false, "Imperialstar 5-Piece", 295000m, 2019, "mid" },
                    { 24, "Roland", "Drum Kit", false, "TD-07KV V-Drums", 380000m, 2020, "mid" },
                    { 25, "Pearl", "Drum Kit", false, "Export EXX", 340000m, 2018, "mid" },
                    { 26, "Audio-Technica", "Microphone", false, "AT2020", 34000m, 2004, "budget" },
                    { 27, "Shure", "Microphone", false, "SM58", 38000m, 1966, "mid" },
                    { 28, "Shure", "Microphone", false, "SM7B", 145000m, 2001, "premium" },
                    { 29, "Boss", "Amplifier", false, "Katana-50 MkII", 88000m, 2019, "budget" },
                    { 30, "Marshall", "Amplifier", false, "DSL40CR", 320000m, 2018, "premium" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogModels_Brand_Model",
                table: "CatalogModels",
                columns: new[] { "Brand", "Model" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListingImages_ListingId",
                table: "ListingImages",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_Category",
                table: "Listings",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_SellerId",
                table: "Listings",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_Status",
                table: "Listings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PriceHistories_ListingId",
                table: "PriceHistories",
                column: "ListingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CatalogModels");

            migrationBuilder.DropTable(
                name: "ListingImages");

            migrationBuilder.DropTable(
                name: "PriceHistories");

            migrationBuilder.DropTable(
                name: "Listings");
        }
    }
}
