using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganisationUnits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganisationUnits",
                columns: table => new
                {
                    Key = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrganisationUnitName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrganisationUnitShortName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganisationUnits", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationUserOrganisationUnits",
                columns: table => new
                {
                    ApplicationUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OrganisationUnitKey = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationUserOrganisationUnits", x => new { x.ApplicationUserId, x.OrganisationUnitKey });
                    table.ForeignKey(
                        name: "FK_ApplicationUserOrganisationUnits_AspNetUsers_ApplicationUserId",
                        column: x => x.ApplicationUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicationUserOrganisationUnits_OrganisationUnits_OrganisationUnitKey",
                        column: x => x.OrganisationUnitKey,
                        principalTable: "OrganisationUnits",
                        principalColumn: "Key",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationUserOrganisationUnits_OrganisationUnitKey",
                table: "ApplicationUserOrganisationUnits",
                column: "OrganisationUnitKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationUserOrganisationUnits");

            migrationBuilder.DropTable(
                name: "OrganisationUnits");
        }
    }
}
