using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenHR.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotaValidFromYear : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ValidFromYear",
                table: "ApplicationUserAttendanceQuotas",
                type: "int",
                nullable: true,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE ApplicationUserAttendanceQuotas
                SET ValidFromYear = YEAR(GETDATE())
                WHERE ValidFromYear IS NULL;
            ");

            migrationBuilder.AlterColumn<int>(
                name: "ValidFromYear",
                table: "ApplicationUserAttendanceQuotas",
                nullable: false,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValidFromYear",
                table: "ApplicationUserAttendanceQuotas");
        }
    }
}
