using Microsoft.AspNetCore.Identity;

namespace OpenHR.Web.Data;

public class ApplicationUser : IdentityUser
{
    public bool MustChangePassword { get; set; }

    public ICollection<ApplicationUserOrganisationUnit> OrganisationUnitLinks { get; set; } = [];
}
