using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceTypeColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "AttendanceTypes",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "AttendanceTypes");
        }
    }
}
