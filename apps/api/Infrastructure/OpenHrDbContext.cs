using Microsoft.EntityFrameworkCore;

namespace OpenHR.Api.Infrastructure;

public sealed class OpenHrDbContext(DbContextOptions<OpenHrDbContext> options) : DbContext(options);
