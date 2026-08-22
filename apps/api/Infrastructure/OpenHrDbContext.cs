using Microsoft.EntityFrameworkCore;
using OpenHR.Api.Domain;

namespace OpenHR.Api.Infrastructure;

public sealed class OpenHrDbContext(DbContextOptions<OpenHrDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AbsenceType> AbsenceTypes => Set<AbsenceType>();
    public DbSet<AbsenceRequest> AbsenceRequests => Set<AbsenceRequest>();
    public DbSet<NonWorkingDay> NonWorkingDays => Set<NonWorkingDay>();
    public DbSet<AppNotification> Notifications => Set<AppNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasIndex(employee => employee.Email).IsUnique();
            entity.Property(employee => employee.DisplayName).HasMaxLength(120);
            entity.Property(employee => employee.Email).HasMaxLength(320);
            entity.Property(employee => employee.PasswordHash).HasMaxLength(512);
            entity.Property(employee => employee.VacationEntitlementDays).HasPrecision(5, 1);
            entity.HasOne<Employee>().WithMany().HasForeignKey(employee => employee.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Employee>().WithMany().HasForeignKey(employee => employee.VacationApprovalManagerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AbsenceType>(entity =>
        {
            entity.HasIndex(type => type.Name).IsUnique();
            entity.Property(type => type.Name).HasMaxLength(80);
        });

        modelBuilder.Entity<AbsenceRequest>(entity =>
        {
            entity.Property(request => request.Amount).HasPrecision(5, 1);
            entity.Property(request => request.Note).HasMaxLength(500);
            entity.Property(request => request.DecisionNote).HasMaxLength(500);
            entity.Property(request => request.RowVersion).IsRowVersion();
            entity.HasOne(request => request.Employee).WithMany(employee => employee.AbsenceRequests)
                .HasForeignKey(request => request.EmployeeId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(request => request.AbsenceType).WithMany()
                .HasForeignKey(request => request.AbsenceTypeId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<NonWorkingDay>(entity =>
        {
            entity.HasIndex(day => day.Date).IsUnique();
            entity.Property(day => day.Label).HasMaxLength(120);
        });

        modelBuilder.Entity<AppNotification>(entity => entity.Property(notification => notification.Message).HasMaxLength(500));
    }
}
