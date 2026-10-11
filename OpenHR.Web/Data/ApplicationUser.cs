using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace OpenHR.Web.Data;

public class ApplicationUser : IdentityUser
{
    public bool MustChangePassword { get; set; }

    [MaxLength(10)]
    public string? ShortName { get; set; }

    public ICollection<ApplicationUserOrganisationUnit> OrganisationUnitLinks { get; set; } = [];
    public ICollection<ApplicationUserAttendanceQuota> AttendanceQuotaLinks { get; set; } = [];
    public ICollection<Attendance> AttendanceLinks { get; set; } = [];
}
