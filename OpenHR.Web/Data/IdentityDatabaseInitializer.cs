using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace OpenHR.Web.Data;

public static class IdentityDatabaseInitializer
{
    public const string AdministratorRole = "Administrator";
    public const string CoordinatorRole = "Coordinator";

    public static async Task InitializeIdentityAsync(this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var serviceProvider = scope.ServiceProvider;
        var database = serviceProvider.GetRequiredService<ApplicationDbContext>();
        await database.Database.MigrateAsync();

        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        if (!await roleManager.RoleExistsAsync(AdministratorRole))
        {
            var result = await roleManager.CreateAsync(new IdentityRole(AdministratorRole));
            if (!result.Succeeded)
            {
                throw new InvalidOperationException($"The administrator role could not be created: {string.Join(", ", result.Errors.Select(error => error.Description))}");
            }
        }

        if (!await roleManager.RoleExistsAsync(CoordinatorRole))
        {
            var result = await roleManager.CreateAsync(new IdentityRole(CoordinatorRole));
            if (!result.Succeeded)
            {
                throw new InvalidOperationException($"The coordinator role could not be created: {string.Join(", ", result.Errors.Select(error => error.Description))}");
            }
        }

        await CreateAdminIfNoUserExists(serviceProvider);
    }

    private static async Task CreateAdminIfNoUserExists(IServiceProvider serviceProvider)
    {
        // Create the first administrator user if no users exist
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        if (await userManager.Users.AnyAsync())
        {
            return;
        }

        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var email = configuration["BootstrapAdmin:Email"];
        var password = configuration["BootstrapAdmin:InitialPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            serviceProvider.GetRequiredService<ILoggerFactory>()
                .CreateLogger(nameof(IdentityDatabaseInitializer))
                .LogWarning(
                    "No users exist. Configure BootstrapAdmin:Email and BootstrapAdmin:InitialPassword to create the first administrator.");
            return;
        }

        var administrator = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            MustChangePassword = true
        };
        var createResult = await userManager.CreateAsync(administrator, password);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException($"The bootstrap administrator could not be created: {string.Join(", ", createResult.Errors.Select(error => error.Description))}");
        }

        var roleResult = await userManager.AddToRoleAsync(administrator, AdministratorRole);
        if (!roleResult.Succeeded)
        {
            throw new InvalidOperationException($"The administrator role could not be assigned: {string.Join(", ", roleResult.Errors.Select(error => error.Description))}");
        }
    }
}
