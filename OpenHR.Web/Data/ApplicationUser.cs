using Microsoft.AspNetCore.Identity;

namespace OpenHR.Web.Data;

public class ApplicationUser : IdentityUser
{
    public bool MustChangePassword { get; set; }

    public ICollection<ApplicationUserOrganisationUnit> OrganisationUnitLinks { get; set; } = [];
    public ICollection<ApplicationUserAttendanceQuota> AttendanceQuotaLinks { get; set; } = [];
    public ICollection<Attendance> AttendanceLinks { get; set; } = [];
}
