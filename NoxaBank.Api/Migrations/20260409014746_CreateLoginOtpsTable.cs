using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoxaBank.Api.Migrations
{
    /// <inheritdoc />
    public partial class CreateLoginOtpsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Supprimer l'enregistrement de la migration AddLoginOtp si elle existe encore
            migrationBuilder.Sql("DELETE FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260409014231_AddLoginOtp'");

            // Créer la table LoginOtps
            migrationBuilder.CreateTable(
                name: "LoginOtps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OtpCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    IsUsed = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoginOtps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoginOtps_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoginOtps_UserId",
                table: "LoginOtps",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoginOtps");
        }
    }
}
