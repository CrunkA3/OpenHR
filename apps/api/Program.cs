using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenHR.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("OpenHrDatabase")
    ?? throw new InvalidOperationException("Connection string 'OpenHrDatabase' is required.");

builder.Services.AddDbContext<OpenHrDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<OpenHrDbContext>(tags: ["ready"]);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Pwa", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors("Pwa");

app.MapGet("/api/v1/status", () => Results.Ok(new { service = "openhr-api", status = "ready" }))
    .WithName("GetServiceStatus");
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live"),
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
});

app.Run();

public partial class Program;
