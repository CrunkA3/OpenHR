using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class ModifyQuotaKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ApplicationUserAttendanceQuotas",
                table: "ApplicationUserAttendanceQuotas");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ApplicationUserAttendanceQuotas",
                table: "ApplicationUserAttendanceQuotas",
                columns: ["ApplicationUserId", "AttendanceTypeKey", "ValidFromYear"]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ApplicationUserAttendanceQuotas",
                table: "ApplicationUserAttendanceQuotas");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ApplicationUserAttendanceQuotas",
                table: "ApplicationUserAttendanceQuotas",
                columns: ["ApplicationUserId", "AttendanceTypeKey"]);
        }
    }
}
