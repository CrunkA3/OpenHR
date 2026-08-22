using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenHR.Api.Domain;
using OpenHR.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("OpenHrDatabase")
    ?? throw new InvalidOperationException("Connection string 'OpenHrDatabase' is required.");

builder.Services.AddDbContext<OpenHrDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<IPasswordHasher<Employee>, PasswordHasher<Employee>>();
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<OpenHrDbContext>(tags: ["ready"]);
builder.Services.AddAuthentication("OpenHr.Session")
    .AddCookie("OpenHr.Session", options =>
    {
        options.Cookie.Name = "openhr-session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(20);
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Administrator", policy => policy.RequireRole(UserRole.Administrator.ToString()));
    options.AddPolicy("Manager", policy => policy.RequireRole(UserRole.Manager.ToString(), UserRole.Administrator.ToString()));
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("Pwa", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<OpenHrDbContext>();
    await database.Database.MigrateAsync();
    await BootstrapAdministratorAsync(database, scope.ServiceProvider.GetRequiredService<IPasswordHasher<Employee>>(), app.Configuration);
    await SeedAbsenceTypesAsync(database);
}

app.UseHttpsRedirection();
app.UseCors("Pwa");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/v1/status", () => Results.Ok(new { service = "openhr-api", status = "ready" }))
    .WithName("GetServiceStatus");
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = check => check.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });

var auth = app.MapGroup("/api/v1/auth");
auth.MapPost("/login", async (LoginInput input, OpenHrDbContext database, IPasswordHasher<Employee> passwords, HttpContext context) =>
{
    var employee = await database.Employees.SingleOrDefaultAsync(candidate => candidate.Email == input.Email.Trim().ToLowerInvariant());
    if (employee is null || !employee.IsActive ||
        passwords.VerifyHashedPassword(employee, employee.PasswordHash, input.Password) == PasswordVerificationResult.Failed)
    {
        return Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "E-Mail-Adresse oder Passwort ist ungültig.");
    }

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, employee.Id.ToString()),
        new Claim(ClaimTypes.Name, employee.DisplayName),
        new Claim(ClaimTypes.Role, employee.Role.ToString()),
    };
    await context.SignInAsync("OpenHr.Session", new ClaimsPrincipal(new ClaimsIdentity(claims, "OpenHr.Session")));
    return Results.Ok(ToEmployeeDto(employee));
});
auth.MapPost("/logout", [Authorize] async (HttpContext context) =>
{
    await context.SignOutAsync("OpenHr.Session");
    return Results.NoContent();
});
auth.MapGet("/me", [Authorize] async (ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    var employee = await database.Employees.FindAsync(GetEmployeeId(principal));
    return employee is null ? Results.Unauthorized() : Results.Ok(ToEmployeeDto(employee));
});

var admin = app.MapGroup("/api/v1/admin").RequireAuthorization("Administrator");
admin.MapGet("/employees", async (OpenHrDbContext database) =>
{
    var employees = await database.Employees.OrderBy(employee => employee.DisplayName).ToListAsync();
    return Results.Ok(employees.Select(ToEmployeeDto));
});
admin.MapPost("/employees", async (CreateEmployeeInput input, OpenHrDbContext database, IPasswordHasher<Employee> passwords) =>
{
    if (string.IsNullOrWhiteSpace(input.DisplayName) || string.IsNullOrWhiteSpace(input.Email) || input.Password.Length < 12)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["employee"] = ["Name, E-Mail und ein Passwort mit mindestens 12 Zeichen sind erforderlich."] });
    }

    var email = input.Email.Trim().ToLowerInvariant();
    if (await database.Employees.AnyAsync(employee => employee.Email == email))
    {
        return Results.Conflict(new { title = "Die geschäftliche E-Mail-Adresse ist bereits vergeben." });
    }

    var employee = new Employee
    {
        Id = Guid.NewGuid(), DisplayName = input.DisplayName.Trim(), Email = email, PasswordHash = string.Empty,
        Role = input.Role, StartDate = input.StartDate, ManagerId = input.ManagerId,
        VacationApprovalManagerId = input.VacationApprovalManagerId, VacationEntitlementDays = input.VacationEntitlementDays,
    };
    employee.PasswordHash = passwords.HashPassword(employee, input.Password);
    database.Employees.Add(employee);
    await database.SaveChangesAsync();
    return Results.Created($"/api/v1/admin/employees/{employee.Id}", ToEmployeeDto(employee));
});
admin.MapGet("/absence-types", async (OpenHrDbContext database) =>
    Results.Ok(await database.AbsenceTypes.OrderBy(type => type.Name).ToListAsync()));
admin.MapPost("/absence-types", async (CreateAbsenceTypeInput input, OpenHrDbContext database) =>
{
    if (string.IsNullOrWhiteSpace(input.Name) || await database.AbsenceTypes.AnyAsync(type => type.Name == input.Name.Trim()))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["name"] = ["Ein eindeutiger Name ist erforderlich."] });
    }
    var type = new AbsenceType { Id = Guid.NewGuid(), Name = input.Name.Trim(), Unit = input.Unit, ApprovalRequirement = input.ApprovalRequirement, IsSickness = input.IsSickness, IsVacation = input.IsVacation };
    database.AbsenceTypes.Add(type);
    await database.SaveChangesAsync();
    return Results.Created($"/api/v1/admin/absence-types/{type.Id}", type);
});
admin.MapGet("/non-working-days", async (OpenHrDbContext database) => Results.Ok(await database.NonWorkingDays.OrderBy(day => day.Date).ToListAsync()));
admin.MapPost("/non-working-days", async (CreateNonWorkingDayInput input, OpenHrDbContext database) =>
{
    if (await database.NonWorkingDays.AnyAsync(day => day.Date == input.Date)) return Results.Conflict();
    var day = new NonWorkingDay { Id = Guid.NewGuid(), Date = input.Date, Label = input.Label.Trim() };
    database.NonWorkingDays.Add(day);
    await database.SaveChangesAsync();
    return Results.Created($"/api/v1/admin/non-working-days/{day.Id}", day);
});

var absence = app.MapGroup("/api/v1/absences").RequireAuthorization();
absence.MapGet("/types", async (OpenHrDbContext database) =>
    Results.Ok(await database.AbsenceTypes.Where(type => type.IsActive).OrderBy(type => type.Name).ToListAsync()));
absence.MapGet("/mine", async (ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    var employeeId = GetEmployeeId(principal);
    return Results.Ok(await database.AbsenceRequests.Include(request => request.AbsenceType)
        .Where(request => request.EmployeeId == employeeId).OrderByDescending(request => request.StartsOn).ToListAsync());
});
absence.MapGet("/calendar", async (DateOnly startsOn, DateOnly endsOn, ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    if (startsOn > endsOn || endsOn.DayNumber - startsOn.DayNumber > 366)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["period"] = ["Der Kalenderzeitraum ist ungültig."] });
    }

    var currentEmployee = await database.Employees.FindAsync(GetEmployeeId(principal));
    if (currentEmployee is null) return Results.Unauthorized();

    var requests = database.AbsenceRequests
        .Include(request => request.Employee)
        .Include(request => request.AbsenceType)
        .Where(request => request.Status != AbsenceStatus.Rejected && request.StartsOn <= endsOn && request.EndsOn >= startsOn);

    if (currentEmployee.Role == UserRole.Manager)
    {
        requests = requests.Where(request => request.EmployeeId == currentEmployee.Id || request.Employee!.ManagerId == currentEmployee.Id);
    }
    else if (currentEmployee.Role == UserRole.Employee)
    {
        requests = requests.Where(request => request.EmployeeId == currentEmployee.Id ||
            currentEmployee.ManagerId != null && request.Employee!.ManagerId == currentEmployee.ManagerId);
    }

    var calendarEntries = await requests.OrderBy(request => request.StartsOn).Select(request => new
    {
        request.Id,
        request.EmployeeId,
        EmployeeName = request.Employee!.DisplayName,
        request.StartsOn,
        request.EndsOn,
        IsOwn = request.EmployeeId == currentEmployee.Id,
        AbsenceType = request.EmployeeId == currentEmployee.Id || currentEmployee.Role != UserRole.Employee
            ? request.AbsenceType!.Name
            : null,
    }).ToListAsync();

    return Results.Ok(calendarEntries);
});
absence.MapPost("/mine", async (CreateAbsenceInput input, ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    var employeeId = GetEmployeeId(principal);
    var type = await database.AbsenceTypes.SingleOrDefaultAsync(candidate => candidate.Id == input.AbsenceTypeId && candidate.IsActive);
    if (type is null || input.StartsOn > input.EndsOn) return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = ["Abwesenheitstyp und Zeitraum sind ungültig."] });
    if (type.IsSickness && type.ApprovalRequirement != ApprovalRequirement.None) return Results.Problem(statusCode: 500, title: "Krankheit darf keine Freigabe erfordern.");
    if (await database.AbsenceRequests.AnyAsync(request => request.EmployeeId == employeeId && request.Status != AbsenceStatus.Rejected && request.StartsOn <= input.EndsOn && request.EndsOn >= input.StartsOn))
        return Results.Conflict(new { title = "Der Zeitraum überschneidet sich mit einem vorhandenen Antrag." });

    var amount = type.Unit == AbsenceUnit.Hours ? input.Amount : await CountWorkdaysAsync(database, input.StartsOn, input.EndsOn);
    if (amount <= 0) return Results.ValidationProblem(new Dictionary<string, string[]> { ["period"] = ["Der Zeitraum enthält keine buchbaren Arbeitstage oder Stunden."] });
    var employee = await database.Employees.FindAsync(employeeId);
    if (type.IsVacation && await ApprovedVacationAsync(database, employeeId) + amount > employee!.VacationEntitlementDays)
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["period"] = ["Das Urlaubskontingent reicht nicht aus."] });

    var status = type.IsSickness || type.ApprovalRequirement == ApprovalRequirement.None ? AbsenceStatus.Reported : AbsenceStatus.Pending;
    var request = new AbsenceRequest { Id = Guid.NewGuid(), EmployeeId = employeeId, AbsenceTypeId = type.Id, StartsOn = input.StartsOn, EndsOn = input.EndsOn, Amount = amount, Status = status, Note = input.Note?.Trim(), CreatedAt = DateTimeOffset.UtcNow };
    database.AbsenceRequests.Add(request);
    if (status == AbsenceStatus.Pending)
    {
        var approverId = type.IsVacation ? employee!.VacationApprovalManagerId : employee!.ManagerId;
        if (approverId is not null) database.Notifications.Add(new AppNotification { Id = Guid.NewGuid(), RecipientId = approverId.Value, Message = $"Ein Antrag von {employee.DisplayName} wartet auf Entscheidung.", CreatedAt = DateTimeOffset.UtcNow });
    }
    await database.SaveChangesAsync();
    return Results.Created($"/api/v1/absences/mine/{request.Id}", request);
});
absence.MapGet("/pending", [Authorize(Policy = "Manager")] async (ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    var managerId = GetEmployeeId(principal);
    return Results.Ok(await database.AbsenceRequests.Include(request => request.Employee).Include(request => request.AbsenceType)
        .Where(request => request.Status == AbsenceStatus.Pending && ((request.AbsenceType!.IsVacation && request.Employee!.VacationApprovalManagerId == managerId) || (!request.AbsenceType!.IsVacation && request.Employee!.ManagerId == managerId)))
        .OrderBy(request => request.StartsOn).ToListAsync());
});
absence.MapPost("/{id:guid}/decision", [Authorize(Policy = "Manager")] async (Guid id, DecisionInput input, ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    var request = await database.AbsenceRequests.Include(candidate => candidate.Employee).Include(candidate => candidate.AbsenceType).SingleOrDefaultAsync(candidate => candidate.Id == id);
    var managerId = GetEmployeeId(principal);
    if (request is null) return Results.NotFound();
    if (request.Status != AbsenceStatus.Pending) return Results.Conflict(new { title = "Über diesen Antrag wurde bereits entschieden." });
    var permitted = request.AbsenceType!.IsVacation ? request.Employee!.VacationApprovalManagerId == managerId : request.Employee!.ManagerId == managerId;
    if (!permitted) return Results.Forbid();
    request.Status = input.Approve ? AbsenceStatus.Approved : AbsenceStatus.Rejected;
    request.DecidedById = managerId; request.DecidedAt = DateTimeOffset.UtcNow; request.DecisionNote = input.Note?.Trim();
    database.Notifications.Add(new AppNotification { Id = Guid.NewGuid(), RecipientId = request.EmployeeId, Message = $"Dein Antrag wurde {(input.Approve ? "genehmigt" : "abgelehnt")}.", CreatedAt = DateTimeOffset.UtcNow });
    await database.SaveChangesAsync();
    return Results.Ok(request);
});

app.MapGet("/api/v1/notifications", [Authorize] async (ClaimsPrincipal principal, OpenHrDbContext database) =>
{
    var employeeId = GetEmployeeId(principal);
    return Results.Ok(await database.Notifications.Where(notification => notification.RecipientId == employeeId).OrderByDescending(notification => notification.CreatedAt).Take(50).ToListAsync());
});

app.Run();

static Guid GetEmployeeId(ClaimsPrincipal principal) => Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
static object ToEmployeeDto(Employee employee) => new { employee.Id, employee.DisplayName, employee.Email, employee.Role, employee.StartDate, employee.ManagerId, employee.VacationApprovalManagerId, employee.VacationEntitlementDays };
static async Task<decimal> CountWorkdaysAsync(OpenHrDbContext database, DateOnly startsOn, DateOnly endsOn)
{
    var excluded = await database.NonWorkingDays.Where(day => day.Date >= startsOn && day.Date <= endsOn).Select(day => day.Date).ToHashSetAsync();
    var total = 0m;
    for (var date = startsOn; date <= endsOn; date = date.AddDays(1)) if (date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday && !excluded.Contains(date)) total++;
    return total;
}
static async Task<decimal> ApprovedVacationAsync(OpenHrDbContext database, Guid employeeId) =>
    await database.AbsenceRequests.Where(request => request.EmployeeId == employeeId && request.Status == AbsenceStatus.Approved && request.AbsenceType!.IsVacation).SumAsync(request => (decimal?)request.Amount) ?? 0m;
static async Task BootstrapAdministratorAsync(OpenHrDbContext database, IPasswordHasher<Employee> passwords, IConfiguration configuration)
{
    if (await database.Employees.AnyAsync()) return;
    var email = configuration["Bootstrap:Email"];
    var password = configuration["Bootstrap:Password"];
    var displayName = configuration["Bootstrap:DisplayName"];
    if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(password) && string.IsNullOrWhiteSpace(displayName)) return;
    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(displayName) || password is null || password.Length < 12)
        throw new InvalidOperationException("Bootstrap:Email, Bootstrap:DisplayName und ein mindestens 12-stelliges Bootstrap:Password sind erforderlich.");
    var administrator = new Employee { Id = Guid.NewGuid(), Email = email.Trim().ToLowerInvariant(), DisplayName = displayName.Trim(), PasswordHash = string.Empty, Role = UserRole.Administrator, StartDate = DateOnly.FromDateTime(DateTime.UtcNow), VacationEntitlementDays = 0 };
    administrator.PasswordHash = passwords.HashPassword(administrator, password);
    database.Employees.Add(administrator);
    await database.SaveChangesAsync();
}
static async Task SeedAbsenceTypesAsync(OpenHrDbContext database)
{
    if (await database.AbsenceTypes.AnyAsync()) return;
    database.AbsenceTypes.AddRange(
        new AbsenceType { Id = Guid.NewGuid(), Name = "Urlaub", Unit = AbsenceUnit.Workdays, ApprovalRequirement = ApprovalRequirement.Manager, IsVacation = true },
        new AbsenceType { Id = Guid.NewGuid(), Name = "Krankheit", Unit = AbsenceUnit.Workdays, ApprovalRequirement = ApprovalRequirement.None, IsSickness = true });
    await database.SaveChangesAsync();
}

public partial class Program;

record LoginInput(string Email, string Password);
record CreateEmployeeInput(string DisplayName, string Email, string Password, UserRole Role, DateOnly StartDate, Guid? ManagerId, Guid? VacationApprovalManagerId, decimal VacationEntitlementDays);
record CreateAbsenceTypeInput(string Name, AbsenceUnit Unit, ApprovalRequirement ApprovalRequirement, bool IsSickness, bool IsVacation);
record CreateNonWorkingDayInput(DateOnly Date, string Label);
record CreateAbsenceInput(Guid AbsenceTypeId, DateOnly StartsOn, DateOnly EndsOn, decimal Amount, string? Note);
record DecisionInput(bool Approve, string? Note);
