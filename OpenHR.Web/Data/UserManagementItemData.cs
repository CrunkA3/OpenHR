using Microsoft.AspNetCore.Identity;

namespace OpenHR.Web.Data;

public sealed class UserManagementItemData
{
    public required ApplicationUser User { get; set; }

    public required List<IdentityRole> Roles { get; set; }
}
