using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceTypeQuota : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasQuota",
                table: "AttendanceTypes",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasQuota",
                table: "AttendanceTypes");
        }
    }
}
