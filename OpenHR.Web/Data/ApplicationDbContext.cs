using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace OpenHR.Web.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<AttendanceType> AttendanceTypes { get; set; } = default!;

    public DbSet<OrganisationUnit> OrganisationUnits { get; set; } = default!;

    public DbSet<ApplicationUserOrganisationUnit> ApplicationUserOrganisationUnits { get; set; } = default!;

    public DbSet<ApplicationUserAttendanceQuota> ApplicationUserAttendanceQuotas { get; set; } = default!;

    public DbSet<Attendance> Attendances { get; set; } = default!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUserOrganisationUnit>()
            .HasKey(x => new { x.ApplicationUserId, x.OrganisationUnitKey });

        builder.Entity<ApplicationUserOrganisationUnit>()
            .HasOne(x => x.ApplicationUser)
            .WithMany(x => x.OrganisationUnitLinks)
            .HasForeignKey(x => x.ApplicationUserId);

        builder.Entity<Attendance>()
            .HasIndex(x => new { x.ApplicationUserId, x.AttendanceTypeKey, x.Date })
            .IsUnique();

        builder.Entity<Attendance>()
            .HasOne(x => x.ApplicationUser)
            .WithMany(x => x.AttendanceLinks)
            .HasForeignKey(x => x.ApplicationUserId);

        builder.Entity<Attendance>()
            .HasOne(x => x.AttendanceType)
            .WithMany()
            .HasForeignKey(x => x.AttendanceTypeKey);

        builder.Entity<ApplicationUserOrganisationUnit>()
            .HasOne(x => x.OrganisationUnit)
            .WithMany(x => x.UserLinks)
            .HasForeignKey(x => x.OrganisationUnitKey);

        builder.Entity<ApplicationUserAttendanceQuota>()
            .HasKey(x => new { x.ApplicationUserId, x.AttendanceTypeKey, x.ValidFromYear });

        builder.Entity<ApplicationUserAttendanceQuota>()
            .HasOne(x => x.ApplicationUser)
            .WithMany(x => x.AttendanceQuotaLinks)
            .HasForeignKey(x => x.ApplicationUserId);

        builder.Entity<ApplicationUserAttendanceQuota>()
            .HasOne(x => x.AttendanceType)
            .WithMany(x => x.UserQuotaLinks)
            .HasForeignKey(x => x.AttendanceTypeKey);
    }
}
