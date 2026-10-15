using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class EditAttendanceUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendances_ApplicationUserId_AttendanceTypeKey_Date",
                table: "Attendances");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_ApplicationUserId_Date",
                table: "Attendances",
                columns: ["ApplicationUserId", "Date"],
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendances_ApplicationUserId_Date",
                table: "Attendances");

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_ApplicationUserId_AttendanceTypeKey_Date",
                table: "Attendances",
                columns: ["ApplicationUserId", "AttendanceTypeKey", "Date"],
                unique: true);
        }
    }
}
