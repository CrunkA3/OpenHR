using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace OpenHR.Web.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<AttendanceType> AttendanceTypes { get; set; } = default!;

    public DbSet<OrganisationUnit> OrganisationUnits { get; set; } = default!;

    public DbSet<ApplicationUserOrganisationUnit> ApplicationUserOrganisationUnits { get; set; } = default!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUserOrganisationUnit>()
            .HasKey(x => new { x.ApplicationUserId, x.OrganisationUnitKey });

        builder.Entity<ApplicationUserOrganisationUnit>()
            .HasOne(x => x.ApplicationUser)
            .WithMany(x => x.OrganisationUnitLinks)
            .HasForeignKey(x => x.ApplicationUserId);

        builder.Entity<ApplicationUserOrganisationUnit>()
            .HasOne(x => x.OrganisationUnit)
            .WithMany(x => x.UserLinks)
            .HasForeignKey(x => x.OrganisationUnitKey);
    }
}
