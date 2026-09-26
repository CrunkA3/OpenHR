namespace OpenHR.Web.Data;

public class ApplicationUserOrganisationUnit
{
    public string ApplicationUserId { get; set; } = default!;

    public Guid OrganisationUnitKey { get; set; }

    public ApplicationUser ApplicationUser { get; set; } = default!;

    public OrganisationUnit OrganisationUnit { get; set; } = default!;
}
