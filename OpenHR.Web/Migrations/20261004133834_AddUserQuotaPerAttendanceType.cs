using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddUserQuotaPerAttendanceType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApplicationUserAttendanceQuotas",
                columns: table => new
                {
                    ApplicationUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AttendanceTypeKey = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quota = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationUserAttendanceQuotas", x => new { x.ApplicationUserId, x.AttendanceTypeKey });
                    table.ForeignKey(
                        name: "FK_ApplicationUserAttendanceQuotas_AspNetUsers_ApplicationUserId",
                        column: x => x.ApplicationUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicationUserAttendanceQuotas_AttendanceTypes_AttendanceTypeKey",
                        column: x => x.AttendanceTypeKey,
                        principalTable: "AttendanceTypes",
                        principalColumn: "Key",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationUserAttendanceQuotas_AttendanceTypeKey",
                table: "ApplicationUserAttendanceQuotas",
                column: "AttendanceTypeKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationUserAttendanceQuotas");
        }
    }
}
